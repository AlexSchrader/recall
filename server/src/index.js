import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
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
if (process.env.NODE_ENV === 'production') {
  const clientDist = resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
  console.log('[startup] serving client from', clientDist);
}

function countFilesRecursive(dir) {
  let n = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      n += entry.isDirectory() ? countFilesRecursive(join(dir, entry.name)) : 1;
    }
  } catch { /* dir doesn't exist */ }
  return n;
}

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} [${isProd ? 'production' : 'development'}]`);
  console.log(`DB: ${DB_PATH}`);
  if (isProd) {
    const clientDist = resolve(__dirname, '../../client/dist');
    const n = countFilesRecursive(clientDist);
    console.log(`Client dist: ${clientDist} — ${n > 0 ? `${n} files` : 'EMPTY or NOT FOUND'}`);
  }
});
