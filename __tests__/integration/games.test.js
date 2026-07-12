// Mini-game question sourcing is scoped to the caller's own completed quizzes.
import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser, seedCourseUnitDoc, createQuizFor, anonAgent } from '../helpers/seed.js';
import { bulkCreateQuestions } from '../../server/src/db/questionsDb.js';
import { updateMastery } from '../../server/src/db/topicMasteryDb.js';

const mcqRow = (quizId, position, topic) => ({
  id: uuidv4(), quiz_id: quizId, position, type: 'mcq', topic,
  prompt: `${topic}?`, options_json: JSON.stringify(['A) x', 'B) y']),
  correct_answer: 'A', rubric: '', explanation: `${topic} explanation`, source_ref: '',
  difficulty: 'easy', is_review: 0,
});

// A completed quiz is the prerequisite for game questions.
async function seedCompletedQuiz(agent) {
  const { course, unit } = await seedCourseUnitDoc(agent);
  const { quizId } = await createQuizFor(agent, { courseId: course.id, unitIds: [unit.id], types: ['mcq'] });
  await agent.post(`/api/quizzes/${quizId}/submit`).send({ answers: [] });
  return { course, unit, quizId };
}

describe('games — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.get('/api/games/questions')).status).toBe(401);
    expect((await anon.post('/api/games/results').send({ results: [] })).status).toBe(401);
  });
});

describe('games — happy path (owner)', () => {
  it('owner gets MCQ questions drawn from their own completed quizzes', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    await seedCompletedQuiz(agent);
    const res = await agent.get('/api/games/questions?limit=10');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('options');
  });
});

describe('games — Daily Mix weak-first ordering', () => {
  it('weak=1 surfaces low-mastery topics before mastered ones', async () => {
    const { user, agent } = await createTestUser({ tier: 'pro' });
    const { course, quizId } = await seedCompletedQuiz(agent);

    // Two extra MCQ topics in the same completed quiz.
    bulkCreateQuestions([mcqRow(quizId, 10, 'WeakTopic'), mcqRow(quizId, 11, 'StrongTopic')]);
    // StrongTopic is mastered; WeakTopic has no mastery row (→ treated as 0).
    updateMastery({
      id: uuidv4(), user_id: user.id, course_id: course.id, topic: 'StrongTopic',
      ease: 2.6, interval_days: 30, repetitions: 5, mastery: 0.95,
      due_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
    }, 'quiz');

    const res = await agent.get('/api/games/questions?weak=1&limit=10');
    expect(res.status).toBe(200);
    const topics = res.body.map(q => q.topic);
    // The mastered topic must sort after the weak one.
    expect(topics).toContain('WeakTopic');
    expect(topics).toContain('StrongTopic');
    expect(topics.indexOf('WeakTopic')).toBeLessThan(topics.indexOf('StrongTopic'));
  });

  it('weak mode still scopes to the caller (no cross-user leak)', async () => {
    const { agent: a } = await createTestUser({ displayName: 'Weak Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Weak Bob', tier: 'pro' });
    await seedCompletedQuiz(a);
    const res = await b.get('/api/games/questions?weak=1&limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('games — personal bests', () => {
  it('records a best, only updates on improvement, and rejects bad input', async () => {
    const { agent } = await createTestUser();

    // First score sets the best.
    let res = await agent.post('/api/games/best').send({ game: 'time_attack', score: 12 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ best: 12, isNewBest: true });

    // Lower score does not beat it.
    res = await agent.post('/api/games/best').send({ game: 'time_attack', score: 8 });
    expect(res.body).toEqual({ best: 12, isNewBest: false });

    // Higher score sets a new best.
    res = await agent.post('/api/games/best').send({ game: 'time_attack', score: 20 });
    expect(res.body).toEqual({ best: 20, isNewBest: true });

    // Persisted into preferences under `bests`.
    const prefs = await agent.get('/api/preferences');
    expect(prefs.body.bests).toMatchObject({ time_attack: 20 });

    // Validation.
    expect((await agent.post('/api/games/best').send({ game: 'nope', score: 5 })).status).toBe(400);
    expect((await agent.post('/api/games/best').send({ game: 'streak', score: -1 })).status).toBe(400);
  });

  it('rejects unauthenticated best submissions', async () => {
    expect((await anonAgent().post('/api/games/best').send({ game: 'streak', score: 5 })).status).toBe(401);
  });

  it("never mixes one user's best into another's", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Best Alice' });
    const { agent: b } = await createTestUser({ displayName: 'Best Bob' });
    await a.post('/api/games/best').send({ game: 'survival', score: 30 });

    const bPrefs = await b.get('/api/preferences');
    expect(bPrefs.body.bests?.survival).toBeUndefined();
  });
});

describe('games — cross-user isolation', () => {
  it("user B's game questions never include user A's quiz content", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Game Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Game Bob', tier: 'pro' });
    await seedCompletedQuiz(a);

    const res = await b.get('/api/games/questions?limit=10');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]); // B has no completed quizzes of their own
  });
});
