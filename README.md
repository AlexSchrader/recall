# Recall

Adaptive Study & Quiz Companion — upload your course material, get tailored quizzes, and automatically revisit the topics you keep missing.

## Getting Started

### Prerequisites

- Node 20+
- npm 9+
- An Anthropic API key

### Setup

```bash
# 1. Clone and install
git clone https://github.com/[owner]/recall
npm install

# 2. Configure environment
cp .env.example server/.env
# Edit server/.env and set ANTHROPIC_API_KEY and SESSION_SECRET

# 3. Start development servers
npm run dev
```

`npm run dev` starts both the Vite dev server (port 5173) and the Express API (port 4000) together. The client proxies `/api` requests to the server automatically.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client + server in development mode |
| `npm run build` | Compile the React PWA to `client/dist` |
| `npm test` | Run the test suite |
| `npm run lint` | Lint all JS/JSX files |

## Stack

- **Frontend:** React 18, Vite, React Router 6, vite-plugin-pwa
- **Backend:** Node 20, Express 4, SQLite (better-sqlite3)
- **AI:** Anthropic Claude API (`@anthropic-ai/sdk`)

## Deployment

See Section 20 of the product spec. Deploy the single Node service to Railway or Render with a persistent volume for `server/data/recall.db`.
