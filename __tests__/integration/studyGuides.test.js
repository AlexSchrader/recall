// Study guide scoping — ownsUnit gate on both routes.
import { describe, it, expect } from 'vitest';
import {
  createTestUser, createCourseFor, createUnitFor, createDocumentFor,
  seedCourseUnitDoc, createStudyGuideFor, anonAgent,
} from '../helpers/seed.js';

describe('study guides — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.get('/api/units/x/study-guide')).status).toBe(401);
    expect((await anon.post('/api/units/x/study-guide/generate').send({})).status).toBe(401);
  });
});

describe('study guides — happy path (owner)', () => {
  it('owner can generate and read their own study guide', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { unit } = await seedCourseUnitDoc(agent);

    const guide = await createStudyGuideFor(agent, unit.id);
    expect(guide.content).toContain('Study Guide');

    const get = await agent.get(`/api/units/${unit.id}/study-guide`);
    expect(get.status).toBe(200);
    expect(get.body.content).toContain('Study Guide');
  });

  it('404s when no guide exists yet for an owned unit', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { unit } = await seedCourseUnitDoc(agent);
    expect((await agent.get(`/api/units/${unit.id}/study-guide`)).status).toBe(404);
  });
});

describe('study guides — cross-user denial', () => {
  it("user B cannot generate for or read user A's study guide", async () => {
    const { agent: a } = await createTestUser({ displayName: 'SG Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'SG Bob', tier: 'pro' });
    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);
    await createDocumentFor(a, unitA.id);
    await createStudyGuideFor(a, unitA.id);

    expect((await b.get(`/api/units/${unitA.id}/study-guide`)).status).toBe(404);
    expect((await b.post(`/api/units/${unitA.id}/study-guide/generate`).send({})).status).toBe(404);
  });
});
