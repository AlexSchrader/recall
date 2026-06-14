import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { existsSync, readdirSync } from 'fs';
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

app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "manifest-src 'self'",
      "worker-src 'self'",
    ].join('; ')
  );
  next();
});

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

// ── Static / SPA fallback ─────────────────────────────────────────────────────
// Serve the built React client whenever client/dist/index.html exists.
// Checking the filesystem (not NODE_ENV) so it works even if the env var is
// absent, and stays a no-op in dev where Vite owns the client origin.
const CLIENT_DIST = join(__dirname, '../../client/dist');
const clientIndexExists = existsSync(join(CLIENT_DIST, 'index.html'));

if (clientIndexExists) {
  app.use(express.static(CLIENT_DIST));
  // SPA catch-all: anything that isn't /api gets index.html so React Router works
  app.get(/^(?!\/api)/, (_req, res) => {
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });
}

function countFilesRecursive(dir) {
  let n = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    n += entry.isDirectory() ? countFilesRecursive(join(dir, entry.name)) : 1;
  }
  return n;
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  console.log(`DB: ${DB_PATH}`);
  if (clientIndexExists) {
    console.log(`Client dist: ${CLIENT_DIST} (${countFilesRecursive(CLIENT_DIST)} files) — serving`);
  } else {
    console.log(`Client dist: NOT FOUND at ${CLIENT_DIST} — SPA fallback disabled`);
  }
});
