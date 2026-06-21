import { Router } from 'express';
import { Readable } from 'stream';
import { requireAuth } from '../middleware/auth.js';
import { VOICE_ID, MODEL_ID } from '../config/rappel.js';

const router = Router();

function requireVoice(req, res, next) {
  if (!req.session.voiceUnlocked) {
    return res.status(403).json({ error: 'Voice not unlocked.' });
  }
  next();
}

// GET /api/voice/status — lets the client know if the session is already unlocked
router.get('/voice/status', requireAuth, (req, res) => {
  res.json({ unlocked: req.session.voiceUnlocked === true });
});

// POST /api/voice/unlock — validate PIN, mark session as voice-unlocked
router.post('/voice/unlock', requireAuth, (req, res) => {
  const { pin } = req.body ?? {};
  const expected = process.env.VOICE_PIN;
  if (!expected || pin !== expected) {
    return res.status(403).json({ error: 'Incorrect PIN.' });
  }
  req.session.voiceUnlocked = true;
  res.json({ ok: true });
});

// POST /api/voice/tts — proxy text to ElevenLabs TTS, stream audio back
router.post('/voice/tts', requireAuth, requireVoice, async (req, res) => {
  const { text } = req.body ?? {};
  if (!text?.trim()) return res.status(400).json({ error: 'text is required.' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'TTS not configured.' });

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: MODEL_ID,
          voice_settings: { stability: 0.5, similarity_boost: 0.8 },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!upstream.ok) {
      const msg = await upstream.text().catch(() => 'unknown error');
      console.error('[voice/tts] ElevenLabs error:', msg);
      return res.status(502).json({ error: 'TTS unavailable.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    console.error('[voice/tts]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'TTS unavailable.' });
  }
});

export default router;
