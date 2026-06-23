import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPreferences, upsertPreferences } from '../db/preferencesDb.js';

const router = Router();

// GET /api/preferences
router.get('/preferences', requireAuth, (req, res) => {
  const row = getPreferences(req.session.userId);
  res.json(row?.prefs ?? {});
});

// PUT /api/preferences — merges with existing prefs (partial updates safe)
router.put('/preferences', requireAuth, (req, res) => {
  const existing = getPreferences(req.session.userId)?.prefs ?? {};
  const merged = { ...existing, ...(req.body ?? {}) };
  upsertPreferences(req.session.userId, merged);
  res.json(merged);
});

export default router;
