import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { DB_PATH } from './db/index.js';
import authRouter from './routes/auth.js';
import coursesRouter from './routes/courses.js';
import documentsRouter from './routes/documents.js';
import quizzesRouter from './routes/quizzes.js';
import preferencesRouter from './routes/preferences.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: isProd, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// ── API routes ────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', authRouter);
app.use('/api', coursesRouter);
app.use('/api', documentsRouter);
app.use('/api', quizzesRouter);
app.use('/api', preferencesRouter);

// ── Production static serving ─────────────────────────────────────────────────
// In dev, Vite serves the client and proxies /api to this server.
// In production, this server serves the built client/dist from the same origin.
if (isProd) {
  const CLIENT_DIST = join(__dirname, '../../client/dist');
  app.use(express.static(CLIENT_DIST));
  // SPA catch-all: serve index.html for every non-API path so React Router works
  app.get(/^(?!\/api)/, (_req, res) => {
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  console.log(`DB: ${DB_PATH}`);
});
