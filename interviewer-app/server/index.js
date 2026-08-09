import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { getSystemPrompt, SYSTEM_PROMPT_BASE_RULES, SYSTEM_PROMPT_FEEDBACK } from './prompts.js';
import { initializeRAG, retrieveContext } from './rag.js';
import { initAI, generateContentWithFallback } from './ai_fallback.js';
import { dbService } from './db.js';

dotenv.config();

const app = express();
app.use(cors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Initialize AI clients (Gemini keys + Freemodel)
initAI();

const curriculum = JSON.parse(fs.readFileSync('./data/curriculum.json', 'utf8'));
const candidatesData = JSON.parse(fs.readFileSync('./data/candidates.json', 'utf8'));
const sessions = new Map();

// SQLite handles persistent sessions and feedback logs

// Initialize RAG embeddings in background
initializeRAG();

app.get('/api/curriculum', (req, res) => {
    res.json(curriculum);
});

app.get('/api/candidates', (req, res) => {
    res.json(candidatesData.candidates);
});

app.post('/api/candidates', (req, res) => {
    try {
        const { name, jobRole, yearsExperience, education, missions, commitDays } = req.body;
        if (!name || !jobRole) {
            return res.status(400).json({ error: 'Name and jobRole are required' });
        }
        
        const passedMissions = (missions || []).filter(m => m.passed);
        const missionsCompleted = passedMissions.length;
        const missionsFirstTry = passedMissions.filter(m => Number(m.attempts) === 1).length;
        const finalCommitDays = commitDays !== undefined && commitDays !== '' ? Number(commitDays) : missionsCompleted;

        const newCandidate = {
            member: {
                id: `custom_${Date.now()}`,
                name: name.trim(),
                jobRole: jobRole.trim(),
                yearsExperience: Number(yearsExperience) || 0,
                education: education?.trim() || "Custom Profile",
                status: "active"
            },
            missions: missions || [],
            signals: {
                commitDays: finalCommitDays,
                missionsCompleted,
                missionsFirstTry
            }
        };

        candidatesData.candidates.unshift(newCandidate);
        
        try {
            fs.writeFileSync('./data/candidates.json', JSON.stringify(candidatesData, null, 2), 'utf8');
        } catch (err) {
            console.warn("Warning: Could not save candidates.json file, kept in memory:", err.message);
        }

        res.json({ success: true, candidate: newCandidate });
    } catch (err) {
        console.error("Error creating candidate:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/stats', (req, res) => {
    res.json({
        candidates: candidatesData.candidates.length,
        days: curriculum.days.length
    });
});

app.get('/api/interviews', (req, res) => {
    const { interviewer } = req.query;
    res.json(dbService.getInterviews(interviewer));
});

app.get('/api/readiness', (req, res) => {
    res.json(dbService.getReadinessList());
});

app.post('/api/interview', async (req, res) => {
    try {
        const { sessionId, candidate, message, persona, interviewerType } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

        // Input validation: cap message length, strip null bytes
        const safeMessage = message ? message.replace(/\0/g, '').slice(0, 2000) : null;

        let session = sessions.get(sessionId) || dbService.getSession(sessionId);

        // Turn 1 Init
        if (candidate && !message) {
            session = {
                candidate,
                persona: persona || 'socrates',
                interviewerType: interviewerType || 'standard',
                history: [], // { role: 'user' | 'model', parts: [{ text: '...' }] }
                questionCount: 0,
                userAnswerCount: 0,
                coveredDays: new Set()
            };
            sessions.set(sessionId, session);
            dbService.createSession({ sessionId, candidate, persona, interviewerType });
        } else if (!session) {
            return res.status(400).json({ error: 'Session not found' });
        }

        if (safeMessage) {
            session.history.push({ role: 'user', parts: [{ text: safeMessage }] });
            session.userAnswerCount = (session.userAnswerCount || 0) + 1;
            dbService.addMessage({ sessionId, role: 'user', content: safeMessage, speaker: 'Candidate' });
        } else {
            session.history.push({ role: 'user', parts: [{ text: "Hello, I am ready to begin the interview." }] });
        }

        // Prepare System Instruction with RAG Context
        let queryContext = safeMessage || "General software engineering and technical background based on candidate profile.";
        const retrievedChunks = await retrieveContext(queryContext, 3);
        const ragContextStr = retrievedChunks.map(c => c.text).join("\n\n");

        const progressStr = `Progress: ${session.questionCount}/15 questions asked, ${session.coveredDays.size}/4 days covered. Current covered days: ${Array.from(session.coveredDays).join(', ')}`;

        let systemInstruction = 
            getSystemPrompt(session.persona, session.candidate, ragContextStr, progressStr, session.interviewerType || 'standard') + "\n\n" +
            SYSTEM_PROMPT_BASE_RULES + "\n\n" +
            `Candidate Profile:\n${JSON.stringify(session.candidate)}\n\n` +
            progressStr;

        // 1. Conversational Call
        const reply = await generateContentWithFallback(
            'gemini-3.6-flash',
            session.history,
            {
                systemInstruction: systemInstruction,
                temperature: 0.7,
            }
        );

        session.history.push({ role: 'model', parts: [{ text: reply }] });

        // Extract speaker from the reply
        let speaker = "Socrates";
        let cleanedReply = reply;
        const speakerMatch = reply.match(/^\[(Socrates|Grace Hopper|Sun Tzu)\]/i);
        if (speakerMatch) {
            speaker = speakerMatch[1];
            cleanedReply = reply.replace(/^\[(Socrates|Grace Hopper|Sun Tzu)\]\s*/i, "");
        } else {
            if (session.persona === 'hopper') speaker = 'Grace Hopper';
            else if (session.persona === 'sun-tzu') speaker = 'Sun Tzu';
        }

        dbService.addMessage({ sessionId, role: 'assistant', content: cleanedReply, speaker });

        // Heuristic analytics on user's answer (if safeMessage is provided)
        let analytics = null;
        if (safeMessage) {
            const lowerMsg = safeMessage.toLowerCase();
            
            // Detect copy-pasted assistant greeting or question
            let isCopyPaste = false;
            
            // Check signature greeting phrases
            if (lowerMsg.includes("i am socrates") || lowerMsg.includes("joined today by") || 
                lowerMsg.includes("welcome, " + session.candidate.member.name.toLowerCase())) {
                isCopyPaste = true;
            }
            
            // Check overlap with last assistant message
            const lastAssistantMsg = [...session.history].reverse().find(h => h.role === 'model')?.parts?.[0]?.text;
            if (lastAssistantMsg) {
                const cleanLast = lastAssistantMsg.toLowerCase().replace(/[^a-z0-9]/g, "");
                const cleanUser = lowerMsg.replace(/[^a-z0-9]/g, "");
                // If user text has 80%+ overlap, or user copy-pasted a substantial block of the last message
                if (cleanLast.includes(cleanUser) && cleanUser.length > 30) {
                    isCopyPaste = true;
                }
            }

            let confidence = 75;
            let sentiment = "Analytical";
            let density = "Low";

            if (isCopyPaste) {
                confidence = 30;
                sentiment = "Evasive";
                density = "Low";
            } else if (lowerMsg.length < 15) {
                confidence = 45;
                sentiment = "Hesitant";
                density = "Low";
            } else {
                const hedging = ["i think", "maybe", "not sure", "probably", "i guess", "kind of", "perhaps", "sort of", "would assume", "unclear", "unsure"];
                const confident = ["definitely", "absolutely", "specifically", "critical", "designed", "implemented", "ensured", "optimized", "proved", "verified", "exactly"];
                
                hedging.forEach(phrase => {
                    if (lowerMsg.includes(phrase)) confidence -= 10;
                });
                confident.forEach(word => {
                    if (lowerMsg.includes(word)) confidence += 6;
                });
                confidence = Math.max(30, Math.min(100, confidence));

                const techKeywords = [
                    "embedding", "vector", "chunking", "metadata", "similarity", "cosine", "rag", "agent", 
                    "orchestration", "fastapi", "sqlite", "chroma", "pinecone", "docker", "kubernetes", 
                    "mcp", "prompt", "peft", "lora", "fine-tuning", "cache", "latency", "concurrency", 
                    "streaming", "sse", "b-tree", "eval", "retrieval"
                ];
                let matchCount = 0;
                techKeywords.forEach(keyword => {
                    if (lowerMsg.includes(keyword)) matchCount++;
                });
                if (matchCount >= 5) density = "High";
                else if (matchCount >= 2) density = "Medium";

                if (confidence < 60) {
                    sentiment = "Hesitant";
                } else if (confidence > 85) {
                    sentiment = "Confident";
                } else if (lowerMsg.includes("depend") || lowerMsg.includes("tradeoff") || lowerMsg.includes("however")) {
                    sentiment = "Analytical";
                } else if (lowerMsg.includes("just") || lowerMsg.includes("only") || lowerMsg.includes("simply")) {
                    sentiment = "Defensive";
                }
            }

            analytics = {
                confidenceScore: confidence,
                sentiment,
                technicalDensity: density
            };
        }

        // 2. Parse/Track logic - only if user gave a real answer (not the greeting)
        if (safeMessage) {
            const parseCompletionText = await generateContentWithFallback(
                'gemini-3.6-flash',
                `Candidate Missions: ${JSON.stringify(session.candidate.missions.map(m=>({day:m.day, title:m.title})))}\n\nAssistant Reply: "${reply}"`,
                {
                    systemInstruction: 'Analyze the assistant\'s latest reply in the context of the technical interview. Determine if the assistant asked a new technical question. If yes, identify which curriculum day (integer) it primarily targets based on the candidate\'s missions. Output valid JSON only, exactly matching: { "isNewQuestion": boolean, "targetedDay": number | null }',
                    responseMimeType: "application/json",
                }
            );

            try {
                const parsed = JSON.parse(parseCompletionText);
                if (parsed.isNewQuestion && parsed.targetedDay) {
                    session.questionCount++;
                    session.coveredDays.add(parsed.targetedDay);
                }
            } catch (e) {
                console.warn("Failed to parse question tracking JSON:", e.message);
            }

            dbService.updateProgress(sessionId, session.questionCount, session.userAnswerCount, session.coveredDays);
        }

        // 3. Check Done Condition — ONLY after parse/track updates the counter
        // Guard: must have at least 15 questions asked AND at least 12 real user answers
        const isFinalAnswer = session.questionCount >= 15 && (session.userAnswerCount || 0) >= 12;

        if (isFinalAnswer) {
            // Update system instruction to close out — this message was already sent, so just note for logging
            console.log(`Interview complete: ${session.questionCount} questions, ${session.userAnswerCount} user answers.`);
            
            // Make separate LLM call for structured feedback JSON
            const feedbackCompletionText = await generateContentWithFallback(
                'gemini-3.6-flash',
                `Candidate: ${JSON.stringify(session.candidate)}\n\nTranscript:\n${JSON.stringify(session.history)}`,
                {
                    systemInstruction: SYSTEM_PROMPT_FEEDBACK,
                    responseMimeType: "application/json",
                }
            );

            let feedback;
            try {
                feedback = JSON.parse(feedbackCompletionText);
                if (!feedback.readiness) {
                    feedback.readiness = feedback.score >= 80 ? 'Strong' : feedback.score >= 60 ? 'Adequate' : 'Needs Work';
                }
            } catch (parseErr) {
                console.error("Failed to parse feedback JSON:", parseErr.message, "Raw:", feedbackCompletionText?.substring(0, 200));
                feedback = {
                    score: 50,
                    readiness: "Needs Work",
                    summary: "Evaluation report could not be parsed. The interview was completed successfully.",
                    strengths: ["Interview session completed."],
                    gaps: ["Detailed analysis unavailable due to a parsing error."],
                    next: ["Please review the transcript manually."],
                    revisionDeck: []
                };
            }

            dbService.saveFeedbackRecord({
                sessionId,
                candidateName: session.candidate.member?.name,
                role: session.candidate.jobRole,
                interviewerType: session.interviewerType || 'standard',
                status: 'completed',
                score: feedback.score,
                readiness: feedback.readiness,
                summary: feedback.summary,
                strengths: feedback.strengths,
                gaps: feedback.gaps,
                next: feedback.next,
                revisionDeck: feedback.revisionDeck
            });

            return res.json({
                reply: cleanedReply,
                speaker,
                analytics,
                done: true,
                feedback,
                questionCount: session.questionCount,
                ragSources: retrievedChunks.map(c => c.id)
            });
        }

        res.json({ 
            reply: cleanedReply, 
            speaker,
            analytics,
            done: false,
            questionCount: session.questionCount,
            ragSources: retrievedChunks.map(c => c.id) 
        });

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/interview/end', async (req, res) => {
    try {
        const { sessionId, interviewerName, candidateName, role, status } = req.body;
        const session = sessions.get(sessionId);

        let history = session?.history || [];
        let candidate = session?.candidate || { member: { name: candidateName || 'Candidate' }, jobRole: role || 'Engineer' };
        let questionCount = session?.questionCount || 0;

        let feedbackPrompt = `Candidate: ${JSON.stringify(candidate)}\n\nTranscript:\n${JSON.stringify(history)}`;
        if (status === 'ended_early') {
            feedbackPrompt += `\n\nNOTE: The interviewer ended the session early after ${questionCount} questions. Evaluate the partial performance strictly based on the questions answered so far.`;
        }

        const feedbackCompletionText = await generateContentWithFallback(
            'gemini-3.6-flash',
            feedbackPrompt,
            {
                systemInstruction: SYSTEM_PROMPT_FEEDBACK,
                responseMimeType: "application/json",
            }
        );

        let feedback = JSON.parse(feedbackCompletionText);
        if (!feedback.readiness) {
            feedback.readiness = feedback.score >= 80 ? 'Strong' : feedback.score >= 60 ? 'Adequate' : 'Needs Work';
        }

        dbService.saveFeedbackRecord({
            sessionId,
            candidateName: candidate.member?.name || candidateName,
            role: candidate.jobRole || role,
            interviewerType: session?.interviewerType || 'standard',
            status: status || (questionCount >= 15 ? 'completed' : 'ended_early'),
            score: feedback.score,
            readiness: feedback.readiness,
            summary: feedback.summary,
            strengths: feedback.strengths,
            gaps: feedback.gaps,
            next: feedback.next,
            revisionDeck: feedback.revisionDeck
        });

        res.json({ success: true, record });
    } catch (err) {
        console.error("Error ending interview:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
