# PRISM — Adaptive AI Interview Panel for Cohort Graduates

<div align="center">

![PRISM Banner](https://img.shields.io/badge/PRISM-AI%20Interview%20Panel-f472b6?style=for-the-badge&logoColor=white)
![Built With](https://img.shields.io/badge/Built%20With-React%20%2B%20Node.js-f97316?style=for-the-badge)
![AI Powered](https://img.shields.io/badge/AI-Gemini%20%2B%20Groq%20%2B%20RAG-a78bfa?style=for-the-badge)
![Live Demo](https://img.shields.io/badge/Live%20Demo-vibocathon.vercel.app-34d399?style=for-the-badge)

**A production-grade AI-powered technical interview system that conducts adaptive, curriculum-aware interviews for AI cohort graduates using a 3-agent panel, real-time RAG retrieval, and live cognitive analytics.**

[🚀 Live Demo](https://vibocathon.vercel.app/) · [📋 AI Usage Log](./AI_USAGE_LOG.md) · [🐛 Issues](https://github.com/Shashwat-Rastogi/vibocathon/issues)

</div>

---

## 🎯 Problem Statement

> **Problem Statement 2 — The Interview Agent**

AI cohort graduates need rigorous, personalized technical evaluation before they enter the workforce. Generic interview platforms ask the same questions to everyone. PRISM solves this by reading each candidate's actual cohort progress — which modules they completed, how many attempts they needed, what they skipped — and generates a fully adaptive, RAG-grounded 15-question interview in real time.

---

## ✨ Key Features

### 🤖 3-Agent AI Panel Interview
Every interview is conducted by a rotating panel of 3 distinct AI personas:
- **[Socrates]** — Socratic method. Never gives answers. Forces the candidate to reason from first principles.
- **[Grace Hopper]** — Systems-level engineering lens. Focuses on architecture, tradeoffs, and production implications.
- **[Sun Tzu]** — Strategic risk assessment. Probes for failure modes, edge cases, and adversarial scenarios.

### 🧠 True RAG Brain
- Vectorized TF-IDF embeddings over the 31-day cohort curriculum
- Top-3 most relevant curriculum chunks are retrieved per interview turn
- Every question is grounded in what the candidate *actually studied*
- Keyword fallback ensures 100% uptime — never fails silently

### 📊 Candidate Dossier & Module Preview
- Click any candidate → **Candidate Dossier popup** shows their full module history
- See completion %, which modules passed/skipped, attempts per module
- Module log is also visible in the live interview sidebar throughout the session

### 🔬 Real-Time Cognitive Analytics
Live analysis of every candidate response:
- **Confidence Score** (0–100%) via conic ring visualization
- **Cognitive Mood** — Confident / Analytical / Hesitant / Struggling
- **Technical Jargon Density** — Low / Medium / High
- **Copy-paste & short-answer detection** flagged automatically

### 📋 Curriculum Progress Tracking
- Live sidebar shows real-time module completion % during the interview
- Color-coded module log (✅ Passed / ⏭ Skipped / 🔄 In Progress)
- Day number + attempts per module visible at a glance

### 🎓 AI-Powered Evaluation Reports
After 15 questions, the system auto-generates:
- Score out of 100
- Readiness Signal: **Strong / Adequate / Needs Work**
- Strengths, Weaknesses, and recommended follow-up questions
- Revision deck of topics to study
- Export as `.txt` or copy to clipboard

### 👩‍🏫 Instructor Readiness Dashboard
- Aggregate view of all candidate scores across all interviews
- Filter by interviewer name
- Readiness breakdown table for cohort-level hiring decisions

### ⚙️ Production-Grade Architecture
- **Multi-key API rotation**: 6 Gemini keys + 6 Groq keys cycling on rate limits
- **SQLite persistent storage**: All sessions, feedback, and scores saved
- **Partial evaluation on early exit**: Never lose a session's data
- **3 interviewer modes**: Standard / Deep Dive / Friendly
- **Custom candidate creation**: Add any candidate with a 31-day mission checklist

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite, Vanilla CSS |
| **Backend** | Node.js + Express |
| **Database** | SQLite (better-sqlite3) |
| **Primary AI** | Google Gemini API (gemini-2.0-flash) |
| **Fallback AI** | Groq API (llama-3.3-70b-versatile) |
| **RAG Engine** | TF-IDF vectorization + Cosine Similarity (custom, zero-cost) |
| **Fonts** | Orbitron (brand), Sora (headings), Manrope (body), JetBrains Mono (data) |
| **Deployment** | Vercel (frontend) + Render (backend) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Frontend                   │
│  Landing → Candidate Roster → Interview Panel     │
│  Cognitive Analytics │ Curriculum Sidebar         │
│  Evaluation Reports │ Readiness Dashboard         │
└─────────────────────┬───────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────┐
│                Express Backend                    │
│                                                   │
│  ┌─────────────┐  ┌──────────────────────────┐   │
│  │  RAG Engine │  │    AI Fallback Manager    │   │
│  │  TF-IDF     │  │  Gemini (6 keys) →        │   │
│  │  Cosine Sim │  │  Groq (6 keys) →          │   │
│  │  Top-3 Ret. │  │  Mock fallback            │   │
│  └─────────────┘  └──────────────────────────┘   │
│                                                   │
│  ┌─────────────────────────────────────────────┐  │
│  │           SQLite Database                    │  │
│  │  Sessions │ Feedback │ Scores │ History      │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Running Locally

### Prerequisites
- Node.js 18+
- npm

### 1. Clone the repository
```bash
git clone https://github.com/Shashwat-Rastogi/vibocathon.git
cd vibocathon/interviewer-app
```

### 2. Set up the server
```bash
cd server
npm install
```

Create a `.env` file in `/server`:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```

Start the server:
```bash
node index.js
```

### 3. Set up the client
```bash
cd ../client
npm install
npm run dev
```

Open `http://localhost:5173`

---

## 📁 Project Structure

```
vibocathon/
├── interviewer-app/
│   ├── client/                  # React + Vite frontend
│   │   ├── src/
│   │   │   ├── App.jsx          # Main app (all components)
│   │   │   └── index.css        # Design system + animations
│   │   └── public/
│   │       └── logo.jpg         # PRISM brand logo
│   └── server/                  # Express backend
│       ├── index.js             # API routes + session management
│       ├── prompts.js           # AI persona system prompts
│       ├── rag.js               # TF-IDF RAG retrieval engine
│       ├── ai_fallback.js       # Multi-key AI rotation manager
│       └── data/
│           ├── curriculum.json  # 31-day cohort curriculum
│           └── candidates.json  # 20 candidate profiles
├── AI_USAGE_LOG.md              # Hackathon AI usage documentation
└── README.md
```

---

## 🎨 Design System

PRISM uses a **Synthwave Sunset** color palette:

| Token | Color | Usage |
|-------|-------|-------|
| Miami Pink | `#f472b6` | Primary accents, CTAs, progress bars |
| Sunset Orange | `#f97316` | Secondary accents, section headers |
| Deep Space | `#07090e` | Base background |
| Glass White | `rgba(255,255,255,0.05)` | Card backgrounds |
| Slate | `#94a3b8` | Secondary text |

UI features: glassmorphism cards, 3D particle background, cinematic splash screen, micro-animations, scroll-reveal effects.

---

## 🤖 AI Usage

All AI assistance is documented in detail in [`AI_USAGE_LOG.md`](./AI_USAGE_LOG.md).

**Primary tool:** Google Antigravity (Gemini)  
**Every feature was built during the hackathon window (Aug 8–9, 2026)**  
**80+ commits** showing continuous development across both days.

---

## 👨‍💻 Team

| Name | Role |
|------|------|
| **Shashwat Rastogi** | Full-Stack Developer & Product Designer |

---

## 📄 License

MIT License — built for the Vibocathon 2026 Hackathon.

---

<div align="center">
  <strong>Built with 🔥 in 48 hours using AI-assisted development</strong><br/>
  <a href="https://vibocathon.vercel.app/">🚀 Try PRISM Live</a>
</div>
