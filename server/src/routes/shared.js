// Public, unauthenticated access to quizzes their owner chose to share.
// Anyone with the token can take the quiz; nothing is saved to any account.
// Grading is DETERMINISTIC ONLY (no Claude) so a public link can never burn
// generation/grading credits — short answers fall back to exact match.
import { Router } from 'express';
import { getQuizByShareToken } from '../db/quizzesDb.js';
import { listQuestionsByQuiz } from '../db/questionsDb.js';
import { gradeAuto, gradeMulti, gradeCloze } from '../services/grader.js';

const router = Router();

// GET /api/shared/quizzes/:token — quiz to take, with answers stripped out.
router.get('/shared/quizzes/:token', (req, res) => {
  const quiz = getQuizByShareToken(req.params.token);
  if (!quiz) return res.status(404).json({ error: 'This shared quiz was not found or sharing was turned off.' });

  const questions = listQuestionsByQuiz(quiz.id).map(q => ({
    id: q.id,
    type: q.type,
    topic: q.topic,
    prompt: q.prompt,
    options: JSON.parse(q.options_json ?? 'null') ?? undefined,
    difficulty: q.difficulty,
    // correct_answer / rubric / explanation intentionally omitted so the quiz is takeable.
  }));

  res.json({ title: quiz.title, questionCount: questions.length, questions });
});

// POST /api/shared/quizzes/:token/submit — grade deterministically, return results.
// Body: { answers: [{ questionId, answer }] }. Nothing is persisted.
router.post('/shared/quizzes/:token/submit', (req, res) => {
  const quiz = getQuizByShareToken(req.params.token);
  if (!quiz) return res.status(404).json({ error: 'This shared quiz was not found or sharing was turned off.' });

  const { answers = [] } = req.body ?? {};
  const questions = listQuestionsByQuiz(quiz.id);

  const results = questions.map(q => {
    const given = (answers.find(a => a.questionId === q.id)?.answer ?? '').trim();
    const score = q.type === 'multi' ? gradeMulti(q, given)
      : q.type === 'cloze' ? gradeCloze(q, given)
      : gradeAuto(q, given); // mcq / true_false / short → exact match, no Claude
    return {
      questionId: q.id,
      type: q.type,
      topic: q.topic,
      score,
      isCorrect: score === 1,
      isPartial: score === 0.5,
      givenAnswer: given,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
    };
  });

  const scoreSum = results.reduce((s, r) => s + r.score, 0);
  res.json({
    score: questions.length ? scoreSum / questions.length : 0,
    correct: results.filter(r => r.score === 1).length,
    partial: results.filter(r => r.score === 0.5).length,
    total: questions.length,
    results,
  });
});

export default router;
