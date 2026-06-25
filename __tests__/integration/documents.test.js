// Regression tests for the original auth bypass: document routes had no
// requireAuth and no ownership check (fixed in e99b56a).
import { describe, it, expect } from 'vitest';
import {
  createTestUser, createCourseFor, createUnitFor, createDocumentFor, anonAgent,
} from '../helpers/seed.js';

describe('documents — auth', () => {
  it('rejects unauthenticated upload, list, get, delete with 401', async () => {
    const anon = anonAgent();
    expect((await anon.post('/api/units/whatever/documents').attach('file', Buffer.from('x'), 'a.txt')).status).toBe(401);
    expect((await anon.get('/api/units/whatever/documents')).status).toBe(401);
    expect((await anon.get('/api/documents/whatever')).status).toBe(401);
    expect((await anon.delete('/api/documents/whatever')).status).toBe(401);
  });
});

describe('documents — happy path (owner)', () => {
  it('owner can upload, list, read and delete their own document', async () => {
    const { agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const unit = await createUnitFor(agent, course.id);

    const doc = await createDocumentFor(agent, unit.id);
    expect(doc.id).toBeTruthy();
    expect(doc.parse_status).toBe('parsed');

    const list = await agent.get(`/api/units/${unit.id}/documents`);
    expect(list.status).toBe(200);
    expect(list.body.map(d => d.id)).toContain(doc.id);

    expect((await agent.get(`/api/documents/${doc.id}`)).status).toBe(200);
    expect((await agent.delete(`/api/documents/${doc.id}`)).status).toBe(204);
    expect((await agent.get(`/api/documents/${doc.id}`)).status).toBe(404);
  });
});

describe('documents — cross-user denial', () => {
  it("user B cannot upload to, list, read or delete user A's documents", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Doc Alice' });
    const { agent: b } = await createTestUser({ displayName: 'Doc Bob' });

    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);
    const docA = await createDocumentFor(a, unitA.id);

    // B uploads to A's unit
    const upload = await b
      .post(`/api/units/${unitA.id}/documents`)
      .attach('file', Buffer.from('intrusion'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(upload.status).toBe(404);

    // B lists A's unit documents
    expect((await b.get(`/api/units/${unitA.id}/documents`)).status).toBe(404);

    // B reads A's document by id
    expect((await b.get(`/api/documents/${docA.id}`)).status).toBe(404);

    // B deletes A's document by id
    expect((await b.delete(`/api/documents/${docA.id}`)).status).toBe(404);

    // ...and A's document is still intact
    expect((await a.get(`/api/documents/${docA.id}`)).status).toBe(200);
  });
});
