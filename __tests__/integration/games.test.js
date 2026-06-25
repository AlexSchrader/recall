// Mini-game question sourcing is scoped to the caller's own completed quizzes.
import { describe, it, expect } from 'vitest';
import { createTestUser, seedCourseUnitDoc, createQuizFor, anonAgent } from '../helpers/seed.js';

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
