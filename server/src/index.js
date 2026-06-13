import 'dotenv/config';
import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json());

// ── API routes ────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

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
});
