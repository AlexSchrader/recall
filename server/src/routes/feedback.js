import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { getUserById } from '../db/usersDb.js';
import { createFeedback } from '../db/feedbackDb.js';
import { sendFeedback } from '../services/email.js';

const router = Router();

const VALID_TYPES = ['bug', 'feature', 'general'];

// POST /api/feedback
router.post('/feedback', requireAuth, async (req, res) => {
  const { type, message, screenshot } = req.body ?? {};

  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid feedback type.' });
  if (!message?.trim()) return res.status(400).json({ error: 'Message is required.' });
  if (message.length > 4000) return res.status(400).json({ error: 'Message too long (max 4000 chars).' });

  const user = getUserById(req.session.userId);
  const now = new Date().toISOString();

  // Strip data URL header if present (client sends full data URL)
  let screenshotBase64 = null;
  if (screenshot) {
    const match = screenshot.match(/^data:image\/[^;]+;base64,(.+)$/);
    screenshotBase64 = match ? match[1] : null;
  }

  // Persist to DB first — don't lose feedback if email fails
  createFeedback({
    id: uuidv4(),
    user_id: req.session.userId,
    type,
    message: message.trim(),
    has_screenshot: screenshotBase64 ? 1 : 0,
    screenshot: screenshotBase64 ?? null,
    created_at: now,
  });

  // Fire email async — don't block the response
  res.json({ ok: true });

  sendFeedback({
    displayName: user.display_name,
    type,
    message: message.trim(),
    screenshotBase64,
  }).catch(err => console.error('[feedback] email failed:', err.message));
});

export default router;
