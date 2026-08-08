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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
