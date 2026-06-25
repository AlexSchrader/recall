// Course + unit scoping (and the bulk-import route added in e99b56a).
import { describe, it, expect } from 'vitest';
import {
  createTestUser, createCourseFor, createUnitFor, anonAgent,
} from '../helpers/seed.js';

describe('courses/units — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.get('/api/courses')).status).toBe(401);
    expect((await anon.post('/api/courses').send({ name: 'x' })).status).toBe(401);
    expect((await anon.get('/api/courses/x')).status).toBe(401);
    expect((await anon.get('/api/units/x')).status).toBe(401);
    expect((await anon.post('/api/courses/x/bulk-import')).status).toBe(401);
  });
});

describe('courses/units — happy path (owner)', () => {
  it('owner can CRUD their own course and units', async () => {
    const { agent } = await createTestUser();
    const course = await createCourseFor(agent, { name: 'Biology' });
    expect((await agent.get(`/api/courses/${course.id}`)).status).toBe(200);

    const renamed = await agent.put(`/api/courses/${course.id}`).send({ name: 'Bio 101' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Bio 101');

    const unit = await createUnitFor(agent, course.id, { name: 'Chapter 1' });
    expect((await agent.get(`/api/courses/${course.id}/units`)).body.map(u => u.id)).toContain(unit.id);
    expect((await agent.get(`/api/units/${unit.id}`)).status).toBe(200);
    expect((await agent.put(`/api/units/${unit.id}`).send({ name: 'Ch 1' })).status).toBe(200);
    expect((await agent.delete(`/api/units/${unit.id}`)).status).toBe(204);
    expect((await agent.delete(`/api/courses/${course.id}`)).status).toBe(204);
  });

  it('bulk-import creates one unit per uploaded file', async () => {
    const { agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const res = await agent
      .post(`/api/courses/${course.id}/bulk-import`)
      .attach('files', Buffer.from('Chapter one content.'), { filename: 'Chapter 1.txt', contentType: 'text/plain' })
      .attach('files', Buffer.from('Chapter two content.'), { filename: 'Chapter 2.txt', contentType: 'text/plain' });
    expect(res.status).toBe(201);
    expect(res.body.created.length).toBe(2);
    const names = res.body.created.map(c => c.unit.name).sort();
    expect(names).toEqual(['Chapter 1', 'Chapter 2']);
  });
});

describe('courses/units — cross-user denial', () => {
  it("user B cannot read, mutate or extend user A's course/units", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Course Alice' });
    const { agent: b } = await createTestUser({ displayName: 'Course Bob' });
    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);

    expect((await b.get(`/api/courses/${courseA.id}`)).status).toBe(404);
    expect((await b.put(`/api/courses/${courseA.id}`).send({ name: 'hijack' })).status).toBe(404);
    expect((await b.delete(`/api/courses/${courseA.id}`)).status).toBe(404);
    expect((await b.get(`/api/courses/${courseA.id}/units`)).status).toBe(404);
    expect((await b.post(`/api/courses/${courseA.id}/units`).send({ name: 'sneak' })).status).toBe(404);
    expect((await b.get(`/api/units/${unitA.id}`)).status).toBe(404);
    expect((await b.put(`/api/units/${unitA.id}`).send({ name: 'sneak' })).status).toBe(404);
    expect((await b.delete(`/api/units/${unitA.id}`)).status).toBe(404);

    // bulk-import into A's course
    const bulk = await b
      .post(`/api/courses/${courseA.id}/bulk-import`)
      .attach('files', Buffer.from('x'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(bulk.status).toBe(404);

    // A's course list does not include anything of B's, and vice-versa
    expect((await b.get('/api/courses')).body.map(c => c.id)).not.toContain(courseA.id);
  });
});
