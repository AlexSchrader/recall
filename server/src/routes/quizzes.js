import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUserById, updateStreak } from '../db/usersDb.js';
import { getPreferences } from '../db/preferencesDb.js';
import { getQuizById, listQuizzesByUser, countTodayByUser, completeQuiz, deleteQuiz } from '../db/quizzesDb.js';
import { listQuestionsByQuiz, getQuestionById } from '../db/questionsDb.js';
import { bulkCreateAttempts } from '../db/attemptsDb.js';
import { upsertMastery, getMastery } from '../db/topicMasteryDb.js';
import { getGenerationConfig, ClaudeError } from '../services/claude.js';
import { generateQuiz, GenerationError } from '../services/quizGenerator.js';
import { buildSourceContext } from '../ingestion/sourceContext.js';
import { getUnitById } from '../db/unitsDb.js';
import { fetchWikiSummary } from '../services/wikipedia.js';
import { gradeAuto, gradeShort, gradeMulti, gradeCloze } from '../services/grader.js';
import { sm2Next } from '../services/sm2.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/quizzes/generate
router.post('/quizzes/generate', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const { courseId, unitIds, title, questionCount, reviewMix, types, difficulty } = req.body ?? {};

  if (!Array.isArray(unitIds) || unitIds.length === 0 || !title ||
      !questionCount || !Array.isArray(types) || types.length === 0 || !difficulty) {
    return res.status(400).json({ error: 'Missing required fields: unitIds, title, questionCount, types, difficulty.' });
  }

  const user = getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const { dailyCap, sourceTokenBudget } = getGenerationConfig(user.tier);

  // Enforce daily cap BEFORE any model call — failures must not consume quota.
  const usedToday = countTodayByUser(userId);
  if (usedToday >= dailyCap) {
    return res.status(429).json({
      error: `Daily generation limit of ${dailyCap} reached. Try again tomorrow.`,
      retryable: false,
    });
  }

  const sourceContext = buildSourceContext(unitIds, sourceTokenBudget);

  // Fetch Wikipedia summaries for each unit name and append as supplementary context.
  const unitNames = unitIds.map(id => getUnitById(id)?.name).filter(Boolean);
  const wikiSummaries = await Promise.all(unitNames.map(fetchWikiSummary));
  const wikiText = wikiSummaries.filter(Boolean).join('\n\n');
  if (wikiText) sourceContext.text = `${sourceContext.text}\n\n--- Wikipedia context ---\n${wikiText}`;

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

// POST /api/quizzes/:id/submit  — grade all answers, update mastery, complete quiz
router.post('/quizzes/:id/submit', requireAuth, async (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found.' });
  if (quiz.user_id !== req.session.userId) return res.status(403).json({ error: 'Forbidden.' });
  if (quiz.status === 'completed') return res.status(409).json({ error: 'Quiz already submitted.' });

  const { answers = [] } = req.body ?? {};
  const questions = listQuestionsByQuiz(quiz.id);
  const now = new Date().toISOString();
  const results = [];
  const userId = req.session.userId;

  for (const q of questions) {
    const given = (answers.find(a => a.questionId === q.id)?.answer ?? '').trim();
    const score = q.type === 'short'
      ? await gradeShort(q, given, userId)
      : q.type === 'multi'
        ? gradeMulti(q, given)
        : q.type === 'cloze'
          ? gradeCloze(q, given)
          : gradeAuto(q, given);
    results.push({ question: q, given, score });
  }

  // Persist attempts (binary: partial counts as incorrect in history)
  const courseId = JSON.parse(quiz.config_json ?? '{}').courseId ?? null;
  bulkCreateAttempts(results.map(({ question: q, given, score }) => ({
    id: uuidv4(),
    question_id: q.id,
    user_id: req.session.userId,
    given_answer: given || null,
    is_correct: score === 1 ? 1 : 0,
    answered_at: now,
  })));

  // Update topic mastery (SM-2) per topic using float score
  if (courseId) {
    const byTopic = {};
    for (const { question: q, score } of results) {
      if (!byTopic[q.topic]) byTopic[q.topic] = { scoreSum: 0, total: 0 };
      byTopic[q.topic].total += 1;
      byTopic[q.topic].scoreSum += score;
    }

    for (const [topic, { scoreSum, total }] of Object.entries(byTopic)) {
      const existing = getMastery(req.session.userId, courseId, topic) ?? {
        id: uuidv4(), user_id: req.session.userId, course_id: courseId, topic,
        ease: 2.5, interval_days: 1, repetitions: 0, mastery: 0.0,
        due_at: now, last_seen_at: null,
      };
      const avg = scoreSum / total;
      const quality = avg >= 0.9 ? 5 : avg >= 0.7 ? 4 : avg >= 0.4 ? 3 : avg > 0 ? 2 : 1;
      const next = sm2Next(existing, quality);
      upsertMastery({ ...existing, ...next, last_seen_at: now });
    }
  }

  // Compute score and complete quiz
  const scoreSum = results.reduce((s, r) => s + r.score, 0);
  const fullCount = results.filter(r => r.score === 1).length;
  const partialCount = results.filter(r => r.score === 0.5).length;
  const score = questions.length > 0 ? scoreSum / questions.length : 0;
  completeQuiz(quiz.id, { score, completed_at: now });
  const streak = updateStreak(req.session.userId);

  res.json({
    streak,
    score,
    correct: fullCount,
    partial: partialCount,
    total: questions.length,
    results: results.map(({ question: q, given, score: qScore }) => ({
      questionId: q.id,
      type: q.type,
      topic: q.topic,
      score: qScore,
      isCorrect: qScore === 1,
      isPartial: qScore === 0.5,
      givenAnswer: given,
      modelAnswer: q.correct_answer,
      explanation: q.explanation,
    })),
  });
});

// GET /api/quizzes/:id  (quiz + its questions)
router.get('/quizzes/:id', requireAuth, (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz || quiz.user_id !== req.session.userId) return res.status(404).json({ error: 'Quiz not found.' });
  const questions = listQuestionsByQuiz(quiz.id);
  res.json({ ...quiz, questions });
});

// GET /api/users/:id/quizzes  (history list)
router.get('/users/:id/quizzes', requireAuth, (req, res) => {
  if (req.params.id !== req.session.userId) return res.status(403).json({ error: 'Forbidden.' });
  const { limit = 100, offset = 0 } = req.query;
  res.json(listQuizzesByUser(req.session.userId, { limit: Number(limit), offset: Number(offset) }));
});

// DELETE /api/quizzes/:id
router.delete('/quizzes/:id', requireAuth, (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz || quiz.user_id !== req.session.userId) return res.status(404).json({ error: 'Not found.' });
  deleteQuiz(req.params.id, req.session.userId);
  res.status(204).end();
});

export default router;
