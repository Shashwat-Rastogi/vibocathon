import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), './data/interview_app.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma('journal_mode = WAL');

// Initialize Tables
db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
        sessionId TEXT PRIMARY KEY,
        candidateId TEXT,
        candidateName TEXT,
        role TEXT,
        interviewerName TEXT,
        interviewerType TEXT DEFAULT 'standard',
        persona TEXT DEFAULT 'socrates',
        status TEXT DEFAULT 'active',
        questionCount INTEGER DEFAULT 0,
        userAnswerCount INTEGER DEFAULT 0,
        coveredDays TEXT DEFAULT '[]',
        totalTokens INTEGER DEFAULT 0,
        costEstimate REAL DEFAULT 0.00,
        startedAt TEXT,
        completedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT,
        role TEXT,
        content TEXT,
        speaker TEXT,
        createdAt TEXT,
        FOREIGN KEY(sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS feedback (
        sessionId TEXT PRIMARY KEY,
        candidateName TEXT,
        role TEXT,
        interviewerType TEXT DEFAULT 'standard',
        score INTEGER,
        readiness TEXT DEFAULT 'Adequate',
        summary TEXT,
        strengths TEXT,
        gaps TEXT,
        next TEXT,
        revisionDeck TEXT,
        createdAt TEXT,
        FOREIGN KEY(sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
    );
`);

// Prepared Statements for high performance
const stmtGetSession = db.prepare('SELECT * FROM sessions WHERE sessionId = ?');
const stmtInsertSession = db.prepare(`
    INSERT INTO sessions (sessionId, candidateId, candidateName, role, interviewerName, interviewerType, persona, status, startedAt)
    VALUES (@sessionId, @candidateId, @candidateName, @role, @interviewerName, @interviewerType, @persona, 'active', @startedAt)
    ON CONFLICT(sessionId) DO UPDATE SET
        questionCount = excluded.questionCount,
        userAnswerCount = excluded.userAnswerCount
`);

const stmtUpdateSessionProgress = db.prepare(`
    UPDATE sessions
    SET questionCount = ?, userAnswerCount = ?, coveredDays = ?, totalTokens = totalTokens + ?, costEstimate = costEstimate + ?
    WHERE sessionId = ?
`);

const stmtUpdateSessionStatus = db.prepare(`
    UPDATE sessions
    SET status = ?, completedAt = ?
    WHERE sessionId = ?
`);

const stmtInsertMessage = db.prepare(`
    INSERT INTO messages (id, sessionId, role, content, speaker, createdAt)
    VALUES (@id, @sessionId, @role, @content, @speaker, @createdAt)
`);

const stmtGetSessionMessages = db.prepare('SELECT * FROM messages WHERE sessionId = ? ORDER BY rowid ASC');

const stmtSaveFeedback = db.prepare(`
    INSERT INTO feedback (sessionId, candidateName, role, interviewerType, score, readiness, summary, strengths, gaps, next, revisionDeck, createdAt)
    VALUES (@sessionId, @candidateName, @role, @interviewerType, @score, @readiness, @summary, @strengths, @gaps, @next, @revisionDeck, @createdAt)
    ON CONFLICT(sessionId) DO UPDATE SET
        score = excluded.score,
        readiness = excluded.readiness,
        summary = excluded.summary,
        strengths = excluded.strengths,
        gaps = excluded.gaps,
        next = excluded.next,
        revisionDeck = excluded.revisionDeck
`);

const stmtGetInterviewsList = db.prepare(`
    SELECT s.sessionId as id, s.candidateName, s.role, s.interviewerName, s.interviewerType, s.status,
           s.questionCount as questionsAnswered, s.totalTokens, s.costEstimate, s.startedAt, s.completedAt as timestamp,
           f.score, f.readiness, f.summary, f.strengths, f.gaps, f.next, f.revisionDeck
    FROM sessions s
    LEFT JOIN feedback f ON s.sessionId = f.sessionId
    ORDER BY s.rowid DESC
`);

const stmtGetReadinessTable = db.prepare(`
    SELECT s.sessionId as id, s.candidateName, s.role, s.interviewerType, s.status,
           s.completedAt as timestamp, s.totalTokens, s.costEstimate,
           f.score, f.readiness, f.summary, f.strengths, f.gaps, f.next, f.revisionDeck
    FROM sessions s
    INNER JOIN feedback f ON s.sessionId = f.sessionId
    ORDER BY s.rowid DESC
`);

export const dbService = {
    getSession(sessionId) {
        const session = stmtGetSession.get(sessionId);
        if (!session) return null;
        return {
            ...session,
            coveredDays: new Set(JSON.parse(session.coveredDays || '[]'))
        };
    },

    createSession({ sessionId, candidate, persona, interviewerType, interviewerName }) {
        stmtInsertSession.run({
            sessionId,
            candidateId: candidate?.member?.id || `custom_${Date.now()}`,
            candidateName: candidate?.member?.name || 'Candidate',
            role: candidate?.jobRole || 'Engineer',
            interviewerName: interviewerName || 'Unknown',
            interviewerType: interviewerType || 'standard',
            persona: persona || 'socrates',
            startedAt: new Date().toISOString()
        });
    },

    updateProgress(sessionId, questionCount, userAnswerCount, coveredDays, tokensAdded = 1500, costAdded = 0.0003) {
        stmtUpdateSessionProgress.run(
            questionCount,
            userAnswerCount,
            JSON.stringify(Array.from(coveredDays || [])),
            tokensAdded,
            costAdded,
            sessionId
        );
    },

    addMessage({ sessionId, role, content, speaker }) {
        stmtInsertMessage.run({
            id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sessionId,
            role,
            content,
            speaker: speaker || (role === 'assistant' ? 'Socrates' : 'Candidate'),
            createdAt: new Date().toISOString()
        });
    },

    getSessionMessages(sessionId) {
        return stmtGetSessionMessages.all(sessionId);
    },

    saveFeedbackRecord({ sessionId, candidateName, role, interviewerType, status, score, readiness, summary, strengths, gaps, next, revisionDeck }) {
        const timestamp = new Date().toISOString();
        stmtUpdateSessionStatus.run(status || 'completed', timestamp, sessionId);
        
        stmtSaveFeedback.run({
            sessionId,
            candidateName,
            role,
            interviewerType: interviewerType || 'standard',
            score: Number(score) || 75,
            readiness: readiness || (score >= 80 ? 'Strong' : score >= 60 ? 'Adequate' : 'Needs Work'),
            summary: summary || '',
            strengths: JSON.stringify(strengths || []),
            gaps: JSON.stringify(gaps || []),
            next: JSON.stringify(next || []),
            revisionDeck: JSON.stringify(revisionDeck || []),
            createdAt: timestamp
        });
    },

    getInterviews(interviewerNameFilter) {
        const list = stmtGetInterviewsList.all();
        return list.map(item => ({
            ...item,
            costEstimate: item.costEstimate || (item.questionsAnswered ? (item.questionsAnswered * 0.0003 + 0.001) : 0.003),
            totalTokens: item.totalTokens || (item.questionsAnswered ? item.questionsAnswered * 1500 + 3000 : 15000),
            feedback: item.summary ? {
                score: item.score,
                readiness: item.readiness || (item.score >= 80 ? 'Strong' : item.score >= 60 ? 'Adequate' : 'Needs Work'),
                summary: item.summary,
                strengths: JSON.parse(item.strengths || '[]'),
                gaps: JSON.parse(item.gaps || '[]'),
                next: JSON.parse(item.next || '[]'),
                revisionDeck: JSON.parse(item.revisionDeck || '[]')
            } : null
        })).filter(item => !interviewerNameFilter || item.interviewerName === interviewerNameFilter);
    },

    getReadinessList() {
        const list = stmtGetReadinessTable.all();
        return list.map(item => ({
            ...item,
            costEstimate: item.costEstimate || (item.score ? 0.0035 : 0.002),
            readiness: item.readiness || (item.score >= 80 ? 'Strong' : item.score >= 60 ? 'Adequate' : 'Needs Work'),
            feedback: {
                score: item.score,
                readiness: item.readiness || (item.score >= 80 ? 'Strong' : item.score >= 60 ? 'Adequate' : 'Needs Work'),
                summary: item.summary,
                strengths: JSON.parse(item.strengths || '[]'),
                gaps: JSON.parse(item.gaps || '[]'),
                next: JSON.parse(item.next || '[]'),
                revisionDeck: JSON.parse(item.revisionDeck || '[]')
            }
        }));
    }
};
