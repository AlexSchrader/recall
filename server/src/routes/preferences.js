import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getPreferences, upsertPreferences } from '../db/preferencesDb.js';

const router = Router();

// GET /api/preferences
router.get('/preferences', requireAuth, (req, res) => {
  const row = getPreferences(req.session.userId);
  res.json(row?.prefs ?? {});
});

// PUT /api/preferences
router.put('/preferences', requireAuth, (req, res) => {
  const prefs = req.body ?? {};
  upsertPreferences(req.session.userId, prefs);
  res.json(prefs);
});

export default router;
