import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUnitById } from '../db/unitsDb.js';
import { getCourseById } from '../db/coursesDb.js';
import { generateStudyGuide, getStudyGuide } from '../services/studyGuideGenerator.js';

const router = Router();

function ownsUnit(unitId, userId) {
  const unit = getUnitById(unitId);
  if (!unit) return null;
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== userId) return null;
  return unit;
}

router.get('/units/:unitId/study-guide', requireAuth, (req, res) => {
  if (!ownsUnit(req.params.unitId, req.session.userId)) {
    return res.status(404).json({ error: 'Unit not found.' });
  }
  const guide = getStudyGuide(req.session.userId, req.params.unitId);
  if (!guide) return res.status(404).json({ error: 'No study guide yet.' });
  res.json(guide);
});

router.post('/units/:unitId/study-guide/generate', requireAuth, async (req, res) => {
  if (!ownsUnit(req.params.unitId, req.session.userId)) {
    return res.status(404).json({ error: 'Unit not found.' });
  }
  try {
    const result = await generateStudyGuide({ userId: req.session.userId, unitId: req.params.unitId });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

export default router;
