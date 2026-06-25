import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createTestUser, seedCourseUnitDoc, createQuizFor } from '../helpers/seed.js';

describe('harness smoke test', () => {
  it('serves /api/health without auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('registers a user and returns a working session', async () => {
    const { user, agent } = await createTestUser({ displayName: 'Smoke Alice' });
    expect(user.id).toBeTruthy();
    expect(user.passphrase_hash).toBeUndefined(); // never leak the hash
    const me = await agent.get('/api/me');
    expect(me.status).toBe(200);
    expect(me.body.id).toBe(user.id);
  });

  it('generates a quiz through the mocked claude boundary (no network)', async () => {
    const { agent } = await createTestUser();
    const { course, unit } = await seedCourseUnitDoc(agent);
    const quiz = await createQuizFor(agent, { courseId: course.id, unitIds: [unit.id] });
    expect(quiz.quizId).toBeTruthy();
    expect(quiz.questionCount).toBeGreaterThan(0);
  });
});
