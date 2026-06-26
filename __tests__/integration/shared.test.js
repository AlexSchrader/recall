// Shareable quizzes: owner enables a public token; anyone can take it without
// auth; grading is deterministic; nothing is saved; sharing is owner-scoped.
import { describe, it, expect } from 'vitest';
import { createTestUser, seedCourseUnitDoc, createQuizFor, anonAgent } from '../helpers/seed.js';

async function sharedQuiz(agent) {
  const { course, unit } = await seedCourseUnitDoc(agent);
  const { quizId } = await createQuizFor(agent, { courseId: course.id, unitIds: [unit.id], types: ['mcq', 'short'] });
  const share = await agent.post(`/api/quizzes/${quizId}/share`).send({});
  return { quizId, token: share.body.shareToken };
}

describe('shared quizzes — sharing controls (owner)', () => {
  it('enables sharing and returns a stable token (idempotent)', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { quizId, token } = await sharedQuiz(agent);
    expect(token).toBeTruthy();
    // Re-sharing returns the same token.
    const again = await agent.post(`/api/quizzes/${quizId}/share`).send({});
    expect(again.body.shareToken).toBe(token);
  });

  it("user B cannot share user A's quiz", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Share Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Share Bob', tier: 'pro' });
    const { course, unit } = await seedCourseUnitDoc(a);
    const { quizId } = await createQuizFor(a, { courseId: course.id, unitIds: [unit.id] });
    expect((await b.post(`/api/quizzes/${quizId}/share`).send({})).status).toBe(404);
  });
});

describe('shared quizzes — public taking (no auth)', () => {
  it('serves the quiz without auth and hides the answers', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { token } = await sharedQuiz(agent);

    const res = await anonAgent().get(`/api/shared/quizzes/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.questions.length).toBeGreaterThan(0);
    for (const q of res.body.questions) {
      expect(q.correct_answer).toBeUndefined();
      expect(q.explanation).toBeUndefined();
      expect(q.rubric).toBeUndefined();
    }
  });

  it('grades a submission without auth and reveals answers, saving nothing', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { quizId, token } = await sharedQuiz(agent);

    const res = await anonAgent().post(`/api/shared/quizzes/${token}/submit`).send({ answers: [] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
    expect(res.body).toHaveProperty('total');
    expect(res.body.results[0]).toHaveProperty('correctAnswer'); // revealed on results
    expect(res.body.results[0]).toHaveProperty('explanation');

    // Owner's quiz is untouched — taking it publicly saves nothing.
    const owned = await agent.get(`/api/quizzes/${quizId}`);
    expect(owned.body.status).toBe('generated');
    expect(owned.body.score).toBeNull();
  });

  it('404s for an unknown token, and after sharing is turned off', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { quizId, token } = await sharedQuiz(agent);

    expect((await anonAgent().get('/api/shared/quizzes/deadbeef')).status).toBe(404);

    await agent.delete(`/api/quizzes/${quizId}/share`);
    expect((await anonAgent().get(`/api/shared/quizzes/${token}`)).status).toBe(404);
    expect((await anonAgent().post(`/api/shared/quizzes/${token}/submit`).send({ answers: [] })).status).toBe(404);
  });
});
