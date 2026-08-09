# AI Usage Log — PRISM: AI Cohort Interview Panel

**Team:** Shashwat Rastogi  
**Project:** PRISM — Adaptive AI Interviewer for Cohort Graduates  
**Hackathon Dates:** August 8–9, 2026  
**Primary AI Tool:** Google Antigravity (Gemini 3.5 / 3.5 Pro)  
**Secondary AI Tools:** Groq (llama-3.3-70b-versatile), Google Gemini API (gemini-2.0-flash)

---

## Overview

This log documents every meaningful use of AI assistance during the hackathon. All features were designed, planned, and directed by the developer. AI was used as a **coding pair-programmer** — generating implementation code based on specific natural-language prompts. All architectural decisions, feature scoping, product logic, and final integration decisions were made by the developer.

---

## Day 1 — August 8, 2026

### 08:00–16:20 | Project Foundation & Initial Build

**What was built:**  
The initial scaffolding of the full-stack application including the React frontend (Vite), Node.js/Express backend, and core routing structure.

**AI Prompts Used:**
- *"Set up a Vite React frontend and an Express Node.js backend. The app is an AI-powered technical interviewer for coding bootcamp graduates."*
- *"Add a custom cursor effect and smooth hover animations to the landing page."*
- *"Prepare the frontend for production deployment with proper build configuration."*

**AI Generated:**
- `client/` Vite React app scaffold
- `server/index.js` Express boilerplate
- Custom cursor CSS and animation logic

**Developer Decisions:**
- Chose the dual-AI architecture (Gemini primary + Groq fallback)
- Defined the core product concept: RAG-grounded interviews based on cohort curriculum data

---

### 16:20–17:00 | Audio, Animations & UI Polish

**What was built:**  
Typing sound effects, scroll-reveal animations, and heading animation refinements.

**AI Prompts Used:**
- *"Add a keyboard typing sound effect when the user types in the chat input box."*
- *"Increase the typing sound volume by 10x."*
- *"Implement smooth scroll-reveal animations for candidate cards and grids as they enter the viewport."*
- *"Make the hero heading animation continuous and slow it down to 0.25x speed."*

**AI Generated:**
- `playTypingSound()` Web Audio API function in `App.jsx`
- `RevealOnScroll` React component with Intersection Observer
- CSS keyframe animation timing adjustments

**Developer Decisions:**
- Chose to keep audio opt-in (no autoplay policy issues)
- Defined the animation delay stagger formula per-card

---

### 23:00–24:00 | RAG Brain, Personas & Homepage Overhaul

**What was built:**  
True Retrieval-Augmented Generation (RAG) system with vector embedding search, multiple AI interview personas, and a complete homepage redesign.

**AI Prompts Used:**
- *"Implement a true RAG brain using TF-IDF embeddings over the curriculum JSON. On each interview turn, retrieve the top 3 most relevant curriculum chunks and inject them into the AI system prompt."*
- *"Add 3 AI interview personas: Socrates (Socratic method), Grace Hopper (systems-level), and Sun Tzu (strategic risk assessment). Each must have a distinct voice and style in prompts.js."*
- *"Implement API key rotation — cycle through multiple Gemini API keys on 429 errors to prevent rate limiting from stopping interviews."*
- *"Add a custom candidate creation UI where the interviewer can manually enter a candidate's name, role, experience, education, and select which curriculum modules they completed."*
- *"Remove the footer from the landing page."*

**AI Generated:**
- `server/rag.js` — full TF-IDF vectorization + cosine similarity retrieval
- `server/prompts.js` — system prompt templates for all 3 personas
- `server/ai_fallback.js` — multi-key API rotation logic
- Custom candidate modal in `App.jsx`

**Developer Decisions:**
- Chose TF-IDF over a paid embedding API for zero-cost RAG
- Defined all 3 persona personalities and behavioral constraints
- Structured the 31-day curriculum JSON format

---

## Day 2 — August 9, 2026

### 00:00–03:00 | Core Features Sprint

---

#### 00:00–00:58 | Premium UI & Logo

**AI Prompts Used:**
- *"Implement Premium UI refinements — glassmorphism cards, dark professional color palette, balanced typography."*
- *"Build a premium Candidates Dashboard UI with avatar initials, role badges, and cohort progress bars."*
- *"Fix JSX syntax error in the TypewriterMessage component."*
- *"Add cohort missions progress indicator to candidate cards showing X/31 modules completed."*
- *"Update the logo with a premium 3D glassmorphism icon."*

**AI Generated:**
- Glassmorphism card CSS styles in `index.css`
- `TypewriterMessage` component fix
- Progress bar percentage calculation logic

---

#### 01:00–01:45 | Interview System & Login

**AI Prompts Used:**
- *"Implement smooth scroll-reveal animations with staggered delays for all grid cards."*
- *"Refine the Landing Page with premium glassmorphism — frosted glass panels, subtle glow borders, dark gradient background."*
- *"Add full interviewer login with name field. Filter interview history logs by the interviewer name stored in localStorage."*
- *"Implement AI scoring, revision deck, and interview reports dashboard. After 8 questions, trigger automatic AI evaluation generating a score 0-100, strengths, weaknesses, and recommended follow-up questions."*
- *"Add graceful mock fallback so UI never crashes during API 503 outages — show a canned 'thinking' response."*

**AI Generated:**
- Interviewer identity modal in `App.jsx`
- `/api/interview/end` endpoint in `index.js`
- AI scoring prompt and feedback JSON schema
- Revision deck card components
- Mock fallback response handler

**Developer Decisions:**
- Defined the scoring rubric categories (Technical Depth, Communication, Problem-Solving)
- Chose SQLite for zero-config persistent storage

---

#### 02:00–02:08 | Bug Fixes & Initial AI Log

**AI Prompts Used:**
- *"Increase the interview question limit from 8 to 15."*
- *"Add an AI Usage Log markdown file for hackathon submission requirements."*

---

### 11:49–12:22 | Architecture Refactor & Reliability

**AI Prompts Used:**
- *"Separate the Welcome Gateway landing page from the dedicated Overview Dashboard into two distinct routes and components."*
- *"Refine the design system: executive dark color palette (#0a0d14 base), subtle particle background, balanced typography hierarchy."*
- *"Style user chat bubbles with sleek dark violet glass effect and increase lamp overlay contrast."*
- *"Implement server JSON database for persistent interview session storage, partial AI evaluation on early exit, and status badges (completed/ended_early)."*
- *"Improve the opening turn fallback to always ask a natural technical question during API outages rather than showing an error."*
- *"Implement robust Keyword/TF-IDF RAG fallback so RAG search always returns results — never fails silently."*
- *"Add Groq (llama-3.3-70b-versatile) as a fast, reliable AI fallback when all Gemini keys are rate-limited."*
- *"Fix stuck custom cursor outline bug by releasing pointer-events lock on component unmount."*

**AI Generated:**
- Two-route architecture (`/` landing, `/candidates` dashboard) in `App.jsx`
- `/api/interviews` GET endpoint with interviewer filter
- Keyword-based RAG fallback in `rag.js`
- Groq HTTPS integration in `ai_fallback.js`
- CSS cursor cleanup fix

**Developer Decisions:**
- Chose Groq's free tier (llama-3.3-70b) over OpenAI for cost-zero fallback
- Defined partial evaluation behavior on early session exit

---

### 14:06–15:20 | 3-Agent Panel, Cognitive Analytics & Production Features

**AI Prompts Used:**
- *"Implement a 3-Agent Panel Interview mode. Every AI response in the chat must come from one of [Socrates], [Grace Hopper], or [Sun Tzu] with their bracketed tag. Each agent must maintain their distinct interview style."*
- *"Add real-time Cognitive Sentiment Analytics sidebar. After each candidate answer, analyze for: confidence score (0-100%), cognitive mood (Confident/Analytical/Hesitant/Struggling), and technical jargon density (Low/Medium/High)."*
- *"Add copy-paste and very short response detection to the Cognitive Analytics heuristics — flag them as low-confidence signals."*
- *"Fix syntax error inside prompts.js template literal that was breaking the server."*
- *"Optimize package.json to declare node engine version for Render deployment."*
- *"Add startup API key diagnostics — on server boot, log which Gemini and Groq keys are valid/invalid."*
- *"CRITICAL FIX: Update Groq model from decommissioned llama-3.1 to llama-3.3-70b-versatile. Fix httpsPost Content-Length header. Replace all fetch() calls with the httpsPost helper."*
- *"Fix: evaluation only triggers after minimum 8 questions AND 6 real user answers — prevent ghost scoring on very short sessions."*
- *"Audit and fix: persona destructuring, input validation, CORS headers, error boundaries, question count sync, index.html SEO metadata, and responsive media queries."*
- *"Remove Standard Interviewer option from persona selector. Default to Socrates. Add Home navigation and logo click-to-home on left sidebars."*
- *"Add SQLite persistent storage (better-sqlite3). Implement Instructor Readiness View — an aggregate table showing all candidates' scores with readiness enum (Strong/Adequate/Needs Work). Add feedback text export/download. Add estimated session AI cost tracking."*
- *"Implement 4 end-to-end features: Interviewer type selector (Standard/Deep Dive/Friendly), 31-day custom candidate creation flow, cohort progress signals, and live sidebar signals card."*
- *"Apply Sora (headings), Manrope (body), and JetBrains Mono (numeric/data) Google Fonts across all views."*

**AI Generated:**
- Multi-agent response parser and speaker tag renderer in `App.jsx`
- `analyzeSentiment()` cognitive analytics function
- Copy-paste detection using response overlap scoring
- `better-sqlite3` schema and migration in `index.js`
- `/api/readiness` endpoint
- Font import and CSS variable declarations in `index.css`
- CORS and error boundary patches

**Developer Decisions:**
- Designed the 3-agent panel concept and chose the specific 3 historical/fictional personas
- Defined cognitive analytics categories and UX display format
- Structured the SQLite schema for interview history and feedback

---

### 15:20–17:48 | Full UI Aesthetic Elevation

**AI Prompts Used:**
- *"Apply Neo-Cyberpunk Glassmorphism template across the entire web app."*
- *"Apply Vibrant Holographic Neon (Cyber-Chroma / Web3) theme."*
- *"Apply Obsidian Amber and Gold luxury enterprise theme."*
- *"Restyle sidebar background, logo gradient, navigation active states, and Cohort Live Signals widget to match Obsidian Gold theme."*
- *"Replace repetitive card styling with dynamic role-based color templates: Cyber Cyan for AI/ML roles, Emerald Tech for engineers, Amethyst Violet for architects, Amber Gold for DevOps, Rose Ruby for analysts."*
- *"Upgrade Candidate Selection Page with Roster Analytics Banner, Signal Tags, Progress Bar Gradient, and JetBrains Mono metrics."*
- *"Redesign LandingPage to a modern left-aligned split-screen layout with an interactive real-time RAG Cognitive Core Monitor and live logging console."*
- *"Fix modal overlay: prevent WebGL backdrop-filter collision causing black screen crashes."*
- *"Add React ErrorBoundary to expose hidden JS rendering crashes."*
- *"Integrate new Space-Time Fabric particle swarm background, restyle colors to cosmic Holographic Violet and Cyan."*
- *"Implement Synthwave Sunset visual theme with Neon Pink (#f472b6) and Sunset Orange (#f97316) gradients and glass-borders, replacing legacy cyan buttons."*
- *"Integrate a premium 3D PRISM loading splash sequence with Orbitron font, 7-color prismatic hue animation, and multi-layered glowing drop-shadows."*
- *"Add a premium glassmorphic landing header bar showing brand logo, brand name PRISM, and active interviewer status."*

**AI Generated:**
- Complete `index.css` theme system with CSS custom properties
- `SplashIntro` animated component with keyframe sequences
- 3D particle background canvas integration
- Role-based color theme palette objects
- `RevealOnScroll` scroll animation wrapper

**Developer Decisions:**
- Chose Synthwave Sunset as the final production color palette
- Defined PRISM as the brand name
- Chose Orbitron for brand typography
- Directed all aesthetic revisions and approved/rejected options iteratively

---

### 18:00–20:00 | Final Feature Sprint (Pre-Submission)

**AI Prompts Used:**
- *"Update sidebar brand text from 'AI Cohort Agent' to 'PRISM' and style it with Orbitron font and Synthwave Sunset gradient."*
- *"Add motion effects to the PRISM loading screen: cinematic push-in zoom, slow cosmic particle zoom, floating tilt on logo, and breathing text float."*
- *"Change the color palette of the chat interview panel to Miami Pink and Sunset Orange accents without touching the 3D particle background."*
- *"Add 4 new Groq API keys and configure them in the server .env file for load balancing."*
- *"After selecting a candidate, show a full Candidate Dossier popup modal displaying their module list, completion percentage, and module status before starting the interview."*
- *"Add a Curriculum Progress widget to the interview sidebar showing real-time module completion percentage and a scrollable module log."*
- *"Increase the interview question count from 8 to 15 in the server guard, AI system prompt, and UI counter."*
- *"Fix the AI stopping at 8 questions — update all occurrences in prompts.js where the AI was instructed to stop at 8."*

**AI Generated:**
- `previewCandidate` state + Candidate Dossier modal JSX in `App.jsx`
- Cohort modules sidebar widget in interview panel
- Updated question limit guards in `index.js` and `prompts.js`
- Splash motion keyframes in `index.css`
- Pink/Orange theme applied to chat bubbles and speaker pills

**Developer Decisions:**
- Designed the 2-step candidate selection flow (card → dossier → interview)
- Chose to surface module history in both the pre-interview modal and live interview sidebar
- Directed all color palette choices throughout

---

## Summary of AI Tools

| Tool | Purpose | Usage |
|------|---------|-------|
| **Google Antigravity (Gemini)** | Primary coding assistant | All code generation, debugging, refactoring throughout the hackathon |
| **Google Gemini API (gemini-2.0-flash)** | Runtime AI interviewer | Generates interview questions and evaluations in production |
| **Groq API (llama-3.3-70b-versatile)** | Runtime AI fallback | Activates when Gemini keys hit rate limits |

---

## What AI Did vs. What the Developer Did

| AI Assistance | Developer Direction |
|---------------|-------------------|
| Generated code from prompts | Defined all product features and user flows |
| Implemented UI components | Made all design decisions and aesthetic choices |
| Wrote server endpoints | Designed API architecture and data schemas |
| Debugged syntax errors | Diagnosed root causes and determined solutions |
| Generated CSS animations | Chose animation styles, timing, and color palettes |
| Built RAG retrieval logic | Designed the RAG architecture and curriculum data structure |
| Created AI persona prompts | Wrote persona concepts, behavioral rules, and evaluation criteria |

---

## Repository Activity

All development occurred between **August 8–9, 2026** with **80+ commits** showing continuous, granular development activity spanning both hackathon days. No pre-existing codebase was imported — every feature was built during the hackathon window.

**Commit Range:** `e380192` (Aug 8 16:20) → `733fcd5` (Aug 9 19:44)

---

*This log was compiled honestly and accurately reflects all AI tool usage during the hackathon. All prompts listed above are representative of the actual instructions given to the AI assistant.*
