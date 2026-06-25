// Regression tests for quiz route scoping — including the body-id trust gap
// (POST /quizzes/generate must reject unitIds/courseId the caller doesn't own,
// fixed in 36077c2). URL-param ownership is covered too.
import { describe, it, expect } from 'vitest';
import {
  createTestUser, createCourseFor, createUnitFor, createDocumentFor,
  seedCourseUnitDoc, createQuizFor, anonAgent,
} from '../helpers/seed.js';

describe('quizzes — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.post('/api/quizzes/generate').send({})).status).toBe(401);
    expect((await anon.get('/api/quizzes/whatever')).status).toBe(401);
    expect((await anon.delete('/api/quizzes/whatever')).status).toBe(401);
    expect((await anon.post('/api/quizzes/whatever/submit').send({})).status).toBe(401);
  });
});

describe('quizzes — happy path (owner)', () => {
  it('owner can generate, read, submit and delete their own quiz', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { course, unit } = await seedCourseUnitDoc(agent);

    const { quizId } = await createQuizFor(agent, { courseId: course.id, unitIds: [unit.id] });
    expect(quizId).toBeTruthy();

    const get = await agent.get(`/api/quizzes/${quizId}`);
    expect(get.status).toBe(200);
    expect(get.body.questions.length).toBeGreaterThan(0);

    // Submit blank answers — grading is mocked, route should complete the quiz
    const submit = await agent.post(`/api/quizzes/${quizId}/submit`).send({ answers: [] });
    expect(submit.status).toBe(200);
    expect(submit.body).toHaveProperty('score');
    expect(submit.body).toHaveProperty('total');

    // Re-submitting a completed quiz is a conflict
    expect((await agent.post(`/api/quizzes/${quizId}/submit`).send({ answers: [] })).status).toBe(409);

    // Own history lists it
    const list = await agent.get(`/api/users/${(await agent.get('/api/me')).body.id}/quizzes`);
    expect(list.status).toBe(200);
    expect(list.body.map(q => q.id)).toContain(quizId);

    expect((await agent.delete(`/api/quizzes/${quizId}`)).status).toBe(204);
  });
});

describe('quizzes — cross-user denial (URL params)', () => {
  it("user B cannot read, submit, delete or list user A's quizzes", async () => {
    const { agent: a, user: userA } = await createTestUser({ displayName: 'Quiz Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Quiz Bob', tier: 'pro' });
    const { course, unit } = await seedCourseUnitDoc(a);
    const { quizId } = await createQuizFor(a, { courseId: course.id, unitIds: [unit.id] });

    expect((await b.get(`/api/quizzes/${quizId}`)).status).toBe(404);
    expect((await b.delete(`/api/quizzes/${quizId}`)).status).toBe(404);
    // Submit distinguishes existence (404) from ownership (403) — B sees 403.
    expect((await b.post(`/api/quizzes/${quizId}/submit`).send({ answers: [] })).status).toBe(403);
    // B cannot read A's history list
    expect((await b.get(`/api/users/${userA.id}/quizzes`)).status).toBe(403);
  });
});

describe('quizzes — body-id trust (the audit fix)', () => {
  it("rejects generate when unitIds belong to another user", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Gen Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Gen Bob', tier: 'pro' });

    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);
    await createDocumentFor(a, unitA.id);

    // B tries to generate a quiz sourced from A's unit — must 404, not leak A's docs.
    const res = await b.post('/api/quizzes/generate').send({
      courseId: courseA.id,
      unitIds: [unitA.id],
      title: 'Stolen quiz',
      types: ['mcq'],
      questionCount: 5,
      difficulty: 'mixed',
    });
    expect(res.status).toBe(404);
  });

  it("rejects generate when one of several unitIds isn't owned", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Mix Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Mix Bob', tier: 'pro' });

    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);
    await createDocumentFor(a, unitA.id);

    const courseB = await createCourseFor(b);
    const unitB = await createUnitFor(b, courseB.id);
    await createDocumentFor(b, unitB.id);

    // B owns unitB but not unitA — mixing them must be rejected wholesale.
    const res = await b.post('/api/quizzes/generate').send({
      courseId: courseB.id,
      unitIds: [unitB.id, unitA.id],
      title: 'Mixed quiz',
      types: ['mcq'],
      questionCount: 5,
      difficulty: 'mixed',
    });
    expect(res.status).toBe(404);
  });

  it("rejects generate when units don't belong to the supplied courseId", async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const course1 = await createCourseFor(agent);
    const course2 = await createCourseFor(agent);
    const unitIn1 = await createUnitFor(agent, course1.id);
    await createDocumentFor(agent, unitIn1.id);

    // Owner owns everything, but the unit is in course1 while courseId says course2.
    const res = await agent.post('/api/quizzes/generate').send({
      courseId: course2.id,
      unitIds: [unitIn1.id],
      title: 'Wrong course',
      types: ['mcq'],
      questionCount: 5,
      difficulty: 'mixed',
    });
    expect(res.status).toBe(400);
  });
});
