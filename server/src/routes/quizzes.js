import { Router } from 'express';
import { getUserById } from '../db/usersDb.js';
import { getPreferences } from '../db/preferencesDb.js';
import { getQuizById, listQuizzesByUser, countTodayByUser } from '../db/quizzesDb.js';
import { listQuestionsByQuiz } from '../db/questionsDb.js';
import { getGenerationConfig } from '../services/claude.js';
import { ClaudeError } from '../services/claude.js';
import { generateQuiz, GenerationError } from '../services/quizGenerator.js';
import { buildSourceContext } from '../ingestion/sourceContext.js';

const router = Router();

// POST /api/quizzes/generate
router.post('/quizzes/generate', async (req, res) => {
  const { userId, courseId, unitIds, title, questionCount, reviewMix, types, difficulty } = req.body ?? {};

  if (!userId || !Array.isArray(unitIds) || unitIds.length === 0 || !title ||
      !questionCount || !Array.isArray(types) || types.length === 0 || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields: userId, unitIds, title, questionCount, types, difficulty.' });
  }

  const user = getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { model, dailyCap, sourceTokenBudget } = getGenerationConfig(user.tier);

  // Enforce daily cap BEFORE any model call — failures must not consume quota.
  const usedToday = countTodayByUser(userId);
  if (usedToday >= dailyCap) {
    return res.status(429).json({
      error: `Daily generation limit of ${dailyCap} reached. Try again tomorrow.`,
      retryable: false,
    });
  }

  const sourceContext = buildSourceContext(unitIds, sourceTokenBudget);
  const prefRow = getPreferences(userId);
  const preferences = prefRow?.prefs ?? {};

  try {
    const result = await generateQuiz({
      config: { userId, courseId, unitIds, title, questionCount, reviewMix: reviewMix ?? 0, types, difficulty, tier: user.tier },
      sourceContext,
      preferences,
    });
    res.status(201).json({ quizId: result.quizId, questionCount: result.questionCount });
  } catch (err) {
    if (err instanceof ClaudeError || err instanceof GenerationError) {
      return res.status(503).json({
        error: 'Quiz generation failed. Please try again in a moment.',
        retryable: true,
      });
    }
    throw err;
  }
});

// GET /api/quizzes/:id  (quiz + its questions)
router.get('/quizzes/:id', (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
  const questions = listQuestionsByQuiz(quiz.id);
  res.json({ ...quiz, questions });
});

// GET /api/users/:id/quizzes  (history list)
router.get('/users/:id/quizzes', (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  res.json(listQuizzesByUser(req.params.id, { limit: Number(limit), offset: Number(offset) }));
});

export default router;
