import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { getSystemPrompt, SYSTEM_PROMPT_BASE_RULES, SYSTEM_PROMPT_FEEDBACK } from './prompts.js';
import { initializeRAG, retrieveContext } from './rag.js';
import { initAI, generateContentWithFallback } from './ai_fallback.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize AI clients (Gemini keys + Freemodel)
initAI();

const curriculum = JSON.parse(fs.readFileSync('./data/curriculum.json', 'utf8'));
const candidatesData = JSON.parse(fs.readFileSync('./data/candidates.json', 'utf8'));
const sessions = new Map();

const DB_FILE = './data/interviews.json';
const getInterviewsFromDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return [];
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8') || '[]');
    } catch {
        return [];
    }
};

const saveInterviewToDB = (record) => {
    try {
        const list = getInterviewsFromDB();
        const existingIdx = list.findIndex(item => item.id === record.id);
        if (existingIdx >= 0) {
            list[existingIdx] = { ...list[existingIdx], ...record };
        } else {
            list.push(record);
        }
        fs.writeFileSync(DB_FILE, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
        console.error("DB Save Error:", err);
    }
};

// Initialize RAG embeddings in background
initializeRAG();

app.get('/api/candidates', (req, res) => {
    res.json(candidatesData.candidates);
});

app.get('/api/stats', (req, res) => {
    res.json({
        candidates: candidatesData.candidates.length,
        days: curriculum.days.length
    });
});

app.get('/api/interviews', (req, res) => {
    const { interviewer } = req.query;
    let list = getInterviewsFromDB();
    if (interviewer) {
        list = list.filter(item => item.interviewerName === interviewer);
    }
    res.json(list);
});

app.post('/api/interview', async (req, res) => {
    try {
        const { sessionId, candidate, message } = req.body;
        if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

        let session = sessions.get(sessionId);

        // Turn 1 Init
        if (candidate && !message) {
            session = {
                candidate,
                persona: req.body.persona || 'default',
                history: [], // { role: 'user' | 'model', parts: [{ text: '...' }] }
                questionCount: 0,
                coveredDays: new Set()
            };
            sessions.set(sessionId, session);
        } else if (!session) {
            return res.status(400).json({ error: 'Session not found' });
        }

        if (message) {
            session.history.push({ role: 'user', parts: [{ text: message }] });
        } else {
            session.history.push({ role: 'user', parts: [{ text: "Hello, I am ready to begin the interview." }] });
        }

        // Prepare System Instruction with RAG Context
        let queryContext = message || "General software engineering and technical background based on candidate profile.";
        const retrievedChunks = await retrieveContext(queryContext, 3);
        const ragContextStr = retrievedChunks.map(c => c.text).join("\n\n");

        const progressStr = `Progress: ${session.questionCount}/8 questions asked, ${session.coveredDays.size}/4 days covered. Current covered days: ${Array.from(session.coveredDays).join(', ')}`;

        const systemInstruction = 
            getSystemPrompt(session.persona, session.candidate, ragContextStr, progressStr) + "\n\n" +
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

        // 2. Parse/Track logic (Secondary fast call)
        const parseCompletionText = await generateContentWithFallback(
            'gemini-3.6-flash',
            `Candidate Missions: ${JSON.stringify(session.candidate.missions.map(m=>({day:m.day, title:m.title})))}\n\nAssistant Reply: "${reply}"`,
            {
                systemInstruction: 'Analyze the assistant\'s latest reply in the context of the technical interview. Determine if the assistant asked a new technical question. If yes, identify which curriculum day (integer) it primarily targets based on the candidate\'s missions. Output valid JSON only, exactly matching: { "isNewQuestion": boolean, "targetedDay": number | null }',
                responseMimeType: "application/json",
            }
        );

        const parsed = JSON.parse(parseCompletionText);
        if (parsed.isNewQuestion && parsed.targetedDay) {
            session.questionCount++;
            session.coveredDays.add(parsed.targetedDay);
        }

        // 3. Check Done Condition
        if (session.questionCount >= 8 && session.coveredDays.size >= 4) {
            // Make separate LLM call for structured feedback JSON
            const feedbackCompletionText = await generateContentWithFallback(
                'gemini-3.6-flash',
                `Candidate: ${JSON.stringify(session.candidate)}\n\nTranscript:\n${JSON.stringify(session.history)}`,
                {
                    systemInstruction: SYSTEM_PROMPT_FEEDBACK,
                    responseMimeType: "application/json",
                }
            );
            
            const feedback = JSON.parse(feedbackCompletionText);

            saveInterviewToDB({
                id: sessionId,
                candidateName: session.candidate.member?.name,
                role: session.candidate.jobRole,
                timestamp: new Date().toISOString(),
                status: 'completed',
                questionsAnswered: session.questionCount,
                feedback
            });

            return res.json({
                reply: reply,
                done: true,
                feedback,
                ragSources: retrievedChunks.map(c => c.id)
            });
        }

        res.json({ reply, done: false, ragSources: retrievedChunks.map(c => c.id) });

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

        const record = {
            id: sessionId,
            candidateName: candidate.member?.name || candidateName,
            role: candidate.jobRole || role,
            interviewerName: interviewerName || 'Unknown',
            timestamp: new Date().toISOString(),
            status: status || (questionCount >= 8 ? 'completed' : 'ended_early'),
            questionsAnswered: questionCount,
            feedback
        };

        saveInterviewToDB(record);

        res.json({ success: true, record });
    } catch (err) {
        console.error("Error ending interview:", err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
