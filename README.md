# Recall

Adaptive Study & Quiz Companion — upload your course material, get tailored quizzes, and automatically revisit the topics you keep missing using spaced repetition.

**Live:** https://server-production-f6d0.up.railway.app

## How it works

1. Create a course and add units
2. Upload notes (PDF, DOCX, TXT, Markdown, or images)
3. Generate a quiz — Claude reads your notes and writes the questions
4. Submit answers and get scored
5. Recall tracks which topics you struggle with and surfaces them again automatically (SM-2 spaced repetition)

## Stack

- **Frontend:** React 18, Vite, React Router 6
- **Backend:** Node 22, Express 4, SQLite (better-sqlite3)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)
- **Auth:** Session-based with a custom better-sqlite3 session store
- **Deployment:** Railway (single service, persistent volume at `/data`)

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
# Edit server/.env — set ANTHROPIC_API_KEY and SESSION_SECRET

# 3. Start development servers
npm run dev
```

`npm run dev` starts the Vite dev server (port 5173) and the Express API (port 4000) concurrently. The client proxies `/api` requests to Express automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in development mode |
| `npm run build` | Build the React app to `client/dist` |
| `npm test` | Run the test suite |
| `npm run lint` | Lint all JS/JSX files |
| `npm run seed -w server` | Seed the database with a default user |

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for quiz generation and Rappel chat |
| `SESSION_SECRET` | Yes | Secret used to sign session cookies |
| `ELEVENLABS_API_KEY` | R5 only | ElevenLabs key for Rappel's TTS and STT voice features |
| `VOICE_PIN` | R5 only | 7-character PIN (format `R######`) that gates voice access |
| `PORT` | No | HTTP port (default: 4000) |
| `DATABASE_PATH` | No | Absolute path to SQLite file. Set this on Railway to point at the persistent volume (e.g. `/data/recall.db`). Defaults to `server/data/recall.db`. |

## Deployment (Railway)

1. Connect the GitHub repo to a Railway service
2. Add a **Volume** from the project canvas, mount path `/data`
3. Set environment variables: `ANTHROPIC_API_KEY`, `SESSION_SECRET`, `NODE_ENV=production`
4. Railway uses `railway.json` for build/start commands — no extra config needed
5. Push to `main` to deploy

The build step runs `npm run build` (compiles the React client). The start command runs `NODE_ENV=production node server/src/index.js`, which serves the API and the built client from the same port.
