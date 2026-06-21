# Recall

Adaptive study companion — upload your course material, then learn through AI-generated quizzes, spaced-repetition flashcards, and structured study guides. Recall tracks which topics you struggle with and surfaces them again automatically.

**Live:** https://recallstudyapp.up.railway.app

---

## Features

### Courses & Units
- Create courses with a color label and optional textbook (via Open Library search)
- Organize material into units; upload any combination of PDFs, DOCX, TXT, Markdown, and images per unit
- Documents are parsed and indexed automatically for AI generation

### Quizzes
- Generate quizzes from your own uploaded documents (optionally enriched with Wikipedia context)
- Question types: multiple choice, true/false, short answer
- Difficulty: easy / medium / hard / mixed
- Short-answer grading is powered by Claude with **partial credit** (correct / partial / incorrect) — rewards understanding, not memorized wording
- Spaced repetition (SM-2): weak topics surface automatically in future quizzes
- Score breakdown per question with model answers and explanations

### Flashcard Decks
- Generate a deck of 5–30 cards from your unit documents
- Review with a full spaced-repetition session: flip animation, Again / Hard / Good / Easy ratings
- Each rating shows the estimated next review interval before you tap
- Session length picker: Quick 5, 10, 20, or all due cards
- Keyboard shortcuts: Space = flip, 1–4 = rate
- Confetti + motivational message on session complete
- "Ask Rappel" on any card — opens a pre-filled chat about that card

### Study Guide
- Generate a structured markdown guide (Overview → Key Concepts → Definitions → Core Ideas → Quick Review)
- Rendered with full markdown formatting; regenerate any time
- Low quiz score (<60%) surfaces a recovery banner linking directly to the unit's study guide and flashcards

### Rappel — AI Tutor
- Persistent threaded chat with Rappel, an encouraging study tutor
- Context-aware: Rappel knows your courses, units, and weak topics
- Streaming responses with full markdown rendering (bold, italic, lists, code blocks)
- Voice mode (PIN-gated): hold-to-speak mic input via Web Speech API, TTS responses via ElevenLabs
- "Ask Rappel about this" entry points from flashcard review, study guide, and quiz results

### Daily Study Streak
- 🔥 streak counter in the nav — increments once per day you complete any quiz or flashcard session
- Resets if a day is missed; visible immediately after each session

### Daily Generation Cap
- Quizzes, flashcard decks, and study guides all share a per-tier daily cap
- Protects API costs; clear error message when limit is reached

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, React Router 6, react-markdown |
| Backend | Node 22, Express 4, SQLite (better-sqlite3) |
| AI generation | Anthropic Claude API (`claude-haiku-4-5`, `claude-sonnet-4-6` per tier) |
| AI grading | Claude Haiku (lenient three-way short-answer grading) |
| Voice TTS | ElevenLabs streaming API |
| Voice STT | Web Speech API (browser-native) |
| Email | Resend (password reset) |
| Auth | Session-based, custom better-sqlite3 session store |
| Deployment | Railway (single service, persistent volume at `/data`) |

---

## Local development

### Prerequisites

- Node 20+
- npm 9+
- An Anthropic API key

### Setup

```bash
# 1. Clone and install
git clone https://github.com/AlexSchrader/recall
npm install

# 2. Configure environment
cp .env.example server/.env
# Edit server/.env — set at minimum ANTHROPIC_API_KEY and SESSION_SECRET

# 3. Start development servers
npm run dev
```

`npm run dev` starts the Vite dev server (port 5173) and the Express API (port 4000) concurrently. The client proxies `/api` requests to Express automatically.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start client + server in development mode |
| `npm run build` | Build the React app to `client/dist` |
| `npm test` | Run the test suite |
| `npm run lint` | Lint all JS/JSX files |

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for generation, grading, and Rappel chat |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies |
| `RESEND_API_KEY` | For email | Resend key for password-reset emails |
| `FROM_EMAIL` | No | Sender address for reset emails (defaults to `onboarding@resend.dev`) |
| `ELEVENLABS_API_KEY` | For voice | ElevenLabs key for Rappel TTS |
| `VOICE_PIN` | For voice | 7-character PIN (format `R######`) that gates voice access |
| `PORT` | No | HTTP port (default: 4000) |
| `DATABASE_PATH` | No | Absolute path to SQLite file. Set on Railway to point at the persistent volume (e.g. `/data/recall.db`). Defaults to `server/data/recall.db`. |

---

## Deployment (Railway)

1. Connect the GitHub repo to a Railway service
2. Add a **Volume** from the project canvas, mount path `/data`
3. Set environment variables: `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `NODE_ENV=production`
4. Railway uses `railway.json` for build/start commands — no extra config needed
5. Push to `main` to deploy

The build step runs `npm run build` (compiles the React client). The start step runs `NODE_ENV=production node server/src/index.js`, which serves both the API and the built client from a single port.
