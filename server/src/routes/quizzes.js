import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUserById, updateStreak } from '../db/usersDb.js';
import { getPreferences } from '../db/preferencesDb.js';
import { getQuizById, listQuizzesByUser, countTodayByUser, completeQuiz, deleteQuiz, setQuizShareToken } from '../db/quizzesDb.js';
import { listQuestionsByQuiz } from '../db/questionsDb.js';
import { bulkCreateAttempts } from '../db/attemptsDb.js';
import { upsertMastery, getMastery } from '../db/topicMasteryDb.js';
import { getGenerationConfig, ClaudeError } from '../services/claude.js';
import { generateQuiz, GenerationError } from '../services/quizGenerator.js';
import { buildSourceContext } from '../ingestion/sourceContext.js';
import { getUnitById } from '../db/unitsDb.js';
import { getCourseById } from '../db/coursesDb.js';
import { fetchWikiSummary } from '../services/wikipedia.js';
import { gradeAuto, gradeShort, gradeMulti, gradeCloze } from '../services/grader.js';
import { sm2Next, qualityFromAnswer } from '../services/sm2.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Returns the unit if it exists and the caller owns its course, else null.
function ownedUnit(unitId, userId) {
  const unit = getUnitById(unitId);
  if (!unit) return null;
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== userId) return null;
  return unit;
}

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

  // Ownership: the caller must own every unit it pulls source material from.
  // buildSourceContext reads each unit's documents with no user filter, so an
  // unchecked unitId would expose another user's private content (see audit).
  const ownedUnits = unitIds.map(id => ownedUnit(id, userId));
  if (ownedUnits.some(u => !u)) {
    return res.status(404).json({ error: 'One or more units were not found.' });
  }
  // courseId, when supplied, must also belong to the caller (it scopes mastery writes).
  if (courseId) {
    const course = getCourseById(courseId);
    if (!course || course.user_id !== userId) {
      return res.status(404).json({ error: 'Course not found.' });
    }
    // Every unit must actually live in that course.
    if (ownedUnits.some(u => u.course_id !== courseId)) {
      return res.status(400).json({ error: 'A unit does not belong to the given course.' });
    }
  }

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
    const a = answers.find(x => x.questionId === q.id);
    const given = (a?.answer ?? '').trim();
    const confidence = a?.confidence ?? null; // 'guess' | 'unsure' | 'confident' | null
    const score = q.type === 'short'
      ? await gradeShort(q, given, userId)
      : q.type === 'multi'
        ? gradeMulti(q, given)
        : q.type === 'cloze'
          ? gradeCloze(q, given)
          : gradeAuto(q, given);
    results.push({ question: q, given, score, confidence });
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

  // Update topic mastery (SM-2) per topic, weighting each answer's quality by
  // the student's stated confidence (right-but-guessed reinforces less).
  if (courseId) {
    const byTopic = {};
    for (const { question: q, score, confidence } of results) {
      if (!byTopic[q.topic]) byTopic[q.topic] = { qSum: 0, total: 0 };
      byTopic[q.topic].qSum += qualityFromAnswer(score, confidence);
      byTopic[q.topic].total += 1;
    }

    for (const [topic, { qSum, total }] of Object.entries(byTopic)) {
      const existing = getMastery(req.session.userId, courseId, topic) ?? {
        id: uuidv4(), user_id: req.session.userId, course_id: courseId, topic,
        ease: 2.5, interval_days: 1, repetitions: 0, mastery: 0.0,
        due_at: now, last_seen_at: null,
      };
      const quality = Math.round(qSum / total);
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

// POST /api/quizzes/:id/share — enable public sharing, return the token (idempotent)
router.post('/quizzes/:id/share', requireAuth, (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz || quiz.user_id !== req.session.userId) return res.status(404).json({ error: 'Quiz not found.' });
  const token = quiz.share_token ?? uuidv4().replace(/-/g, '').slice(0, 12);
  if (!quiz.share_token) setQuizShareToken(quiz.id, req.session.userId, token);
  res.json({ shareToken: token });
});

// DELETE /api/quizzes/:id/share — stop sharing
router.delete('/quizzes/:id/share', requireAuth, (req, res) => {
  const quiz = getQuizById(req.params.id);
  if (!quiz || quiz.user_id !== req.session.userId) return res.status(404).json({ error: 'Quiz not found.' });
  setQuizShareToken(quiz.id, req.session.userId, null);
  res.status(204).end();
});

export default router;
