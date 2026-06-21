import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import db from '../db/index.js';

const router = Router();

// GET /api/games/questions?unitId=X&courseId=X&limit=10
// unitId → questions only from that unit's quizzes
// courseId → questions from any unit in that course
// neither  → all of the user's MCQ questions
router.get('/games/questions', requireAuth, (req, res) => {
  const uid = req.session.userId;
  const { unitId, courseId, limit = 10 } = req.query;

  const rows = db.prepare(`
    SELECT DISTINCT q.id, q.prompt, q.options_json, q.correct_answer, q.topic, q.explanation, q.difficulty
    FROM questions q
    JOIN quizzes qz ON qz.id = q.quiz_id
    JOIN json_each(qz.source_unit_ids) AS unit_ref ON 1=1
    JOIN units u ON u.id = unit_ref.value
    WHERE qz.user_id = ?
      AND qz.status = 'completed'
      AND q.type = 'mcq'
      AND (? IS NULL OR unit_ref.value = ?)
      AND (? IS NULL OR u.course_id = ?)
    ORDER BY RANDOM()
    LIMIT ?
  `).all(uid, unitId ?? null, unitId ?? null, courseId ?? null, courseId ?? null, Number(limit));

  res.json(rows.map(r => ({
    ...r,
    options: JSON.parse(r.options_json ?? '[]'),
  })));
});

export default router;
