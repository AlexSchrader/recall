import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { readdirSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import db, { DB_PATH } from './db/index.js';
import authRouter from './routes/auth.js';
import coursesRouter from './routes/courses.js';
import documentsRouter from './routes/documents.js';
import quizzesRouter from './routes/quizzes.js';
import preferencesRouter from './routes/preferences.js';
import chatRouter from './routes/chat.js';
import voiceRouter from './routes/voice.js';
import flashcardsRouter from './routes/flashcards.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1); // Railway terminates TLS at the edge; trust X-Forwarded-Proto

// Session store backed by the existing better-sqlite3 connection.
const Store = session.Store;
class BetterSQLiteStore extends Store {
  constructor() {
    super();
    setInterval(() => db.prepare('DELETE FROM sessions WHERE expired_at < ?').run(Date.now()), 60_000);
  }
  get(sid, cb) {
    try {
      const row = db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired_at > ?').get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (err) { console.error('[session.get]', err); cb(err); }
  }
  set(sid, sess, cb) {
    try {
      const ttl = sess.cookie?.maxAge ?? 7 * 24 * 60 * 60 * 1000;
      db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)').run(sid, JSON.stringify(sess), Date.now() + ttl);
      cb(null);
    } catch (err) { console.error('[session.set]', err); cb(err); }
  }
  destroy(sid, cb) {
    try {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (err) { console.error('[session.destroy]', err); cb(err); }
  }
}

app.use((_req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "img-src 'self' data: blob:",
      "script-src 'self' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://openlibrary.org https://api.elevenlabs.io",
      "font-src 'self' data:",
      "manifest-src 'self'",
      "worker-src 'self'",
    ].join('; ')
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: new BetterSQLiteStore(),
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
app.use('/api', chatRouter);
app.use('/api', voiceRouter);
app.use('/api', flashcardsRouter);

// ── Static / SPA fallback ─────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const clientDist = resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist, {
    setHeaders(res, filePath) {
      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  }));
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
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
