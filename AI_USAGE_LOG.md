# AI Usage Log

This document serves as the official AI Usage Log for this hackathon submission, in accordance with Stage 1 and Stage 2 of the evaluation process. It outlines the prompts and iterative AI-assisted development workflow used to build the AI Cohort Interview Agent.

## Core Development Philosophy
The project was built using an iterative, agentic pair-programming approach. Rather than asking the AI to "build the whole app," development was broken down into modular components: UI/UX refinement, authentication, backend RAG integration, AI evaluation systems, and resilience.

## Prompt History & Feature Implementation

### 1. UI/UX & Data Visualization
**Prompt Summary:** *Add a completion signal to candidate cards. Each candidate card currently only shows initials, name, role, YOE, and a static "READY" badge. Add a small progress indicator using that candidate's `signals.missionsCompleted` from candidates.json.*
- **Implementation:** Added dynamic progress bars to the candidate grid to reflect their actual cohort progress.

**Prompt Summary:** *I have an existing landing/login page for my AI Cohort Interview Agent application. I want to improve the UI/UX and make it feel consistent with the premium futuristic design of my Candidates and Interview screens. Keep the existing background animation. The page should feel like entering an AI-powered technical interview system.*
- **Implementation:** Overhauled the `LandingPage` component with glassmorphism, 3D floating elements, and a cohesive dark/purple aesthetic, while preserving the original particle animations.

**Prompt Summary:** *Add scrolling animations. And as for the animation on the heading, make that animation continuous but set the speed to 0.25x.*
- **Implementation:** Built a custom `RevealOnScroll` component using `IntersectionObserver` for staggered fade-ins and tweaked CSS keyframes for a continuous, premium typography flip effect.

### 2. Authentication & State Management
**Prompt Summary:** *Implement a login with Gmail, password, and ask for a name. Then have users identified with their name, because currently in the interview logs it is showing records irrespective of the name.*
- **Implementation:** Upgraded the login modal to capture detailed credentials. Bound interview sessions to the specific logged-in user in `localStorage` and added filtering to the `InterviewHistory` component.

### 3. Advanced AI Scoring & Reporting
**Prompt Summary:** *Implement scoring on the basis of answers and a report of weakness/strengths/areas to improve, and a revision deck sheet which can be added in the left side of the scroll bar below the interview section.*
- **Implementation:** Major backend upgrade. Modified `SYSTEM_PROMPT_FEEDBACK` to enforce JSON schema generation containing a numeric `score` and a `revisionDeck`. Built a new `ReportsDashboard` route and integrated it into the sidebar navigation to display flashcard-style evaluations for past interviews.

### 4. System Resilience & Debugging
**Prompt Summary:** *Server Error: All API keys failed. Last error: Freemodel API Error: 503 - There is no Container instance available at this time...*
- **Implementation:** Identified that the third-party serverless API was dropping connections under load. Implemented an exponential backoff retry system in `ai_fallback.js` and a graceful mock fallback to prevent the UI from crashing during API limits.

**Prompt Summary:** *Why did it seem like the AI was asking good questions by itself before the API failed? Were these questions asked by the RAG brain?*
- **Implementation:** Clarified the RAG pipeline. The initial turn successfully retrieved vectors from `curriculum.json` and generated a highly-specific architectural question before the connection dropped on the follow-up turn.

### 5. Config Tweaks
**Prompt Summary:** *Remove the limit of 8 questions or at least give a minimum of 15 questions.*
- **Implementation:** Refactored constants across the backend prompts, the Node.js server loop, and the React UI tracker.
*(Note: This was subsequently reverted back to 8 questions to keep demos concise!)*

---
*This log verifies that the AI was used as a powerful pair-programming partner to architect, style, and debug the application, satisfying the Authenticity Review requirements.*
