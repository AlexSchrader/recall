import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { listGameQuestions, getQuestionCourseAndTopic } from '../db/questionsDb.js';
import { getMastery, upsertMastery } from '../db/topicMasteryDb.js';
import { sm2Next } from '../services/sm2.js';

const router = Router();

// GET /api/games/questions?unitId=X&courseId=X&limit=10
// unitId → questions only from that unit's quizzes
// courseId → questions from any unit in that course
// neither  → all of the user's MCQ questions
router.get('/games/questions', requireAuth, (req, res) => {
  const uid = req.session.userId;
  const { unitId, courseId, limit = 10 } = req.query;

  const rows = listGameQuestions(uid, { unitId: unitId ?? null, courseId: courseId ?? null, limit });

  res.json(rows.map(r => ({
    ...r,
    options: JSON.parse(r.options_json ?? '[]'),
  })));
});

// POST /api/games/results — update topic mastery (SM-2) from game answers
// body: { results: [{ questionId, correct }] }
router.post('/games/results', requireAuth, (req, res) => {
  const uid = req.session.userId;
  const { results } = req.body ?? {};
  if (!Array.isArray(results) || !results.length) return res.json({ ok: true });

  const now = new Date().toISOString();
  const byKey = {}; // `courseId::topic` → { scoreSum, total, courseId, topic }

  for (const { questionId, correct } of results) {
    const row = getQuestionCourseAndTopic(questionId, uid);
    if (!row) continue;
    const key = `${row.course_id}::${row.topic}`;
    if (!byKey[key]) byKey[key] = { scoreSum: 0, total: 0, courseId: row.course_id, topic: row.topic };
    byKey[key].total += 1;
    byKey[key].scoreSum += correct ? 1 : 0;
  }

  for (const { scoreSum, total, courseId, topic } of Object.values(byKey)) {
    const existing = getMastery(uid, courseId, topic) ?? {
      id: uuidv4(), user_id: uid, course_id: courseId, topic,
      ease: 2.5, interval_days: 1, repetitions: 0, mastery: 0.0,
      due_at: now, last_seen_at: null,
    };
    const avg = scoreSum / total;
    const quality = avg >= 0.9 ? 5 : avg >= 0.7 ? 4 : avg >= 0.4 ? 3 : avg > 0 ? 2 : 1;
    const next = sm2Next(existing, quality);
    upsertMastery({ ...existing, ...next, last_seen_at: now });
  }

  res.json({ ok: true });
});

export default router;
