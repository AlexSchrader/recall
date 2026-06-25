// Supertest seed helpers for integration tests.
//
// Every helper drives the real HTTP API through an authenticated agent, so the
// data it creates exercises the same auth + ownership paths the tests assert on.
// `app` is imported here (after the global setup has set DATABASE_PATH=:memory:
// and registered the service mocks).
import request from 'supertest';
import { app } from '../../server/src/index.js';

export { app };

let counter = 0;
function uniq(prefix) {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

// Register a brand-new user and return their row plus a cookie-bearing agent.
export async function createTestUser({ displayName, tier = 'free' } = {}) {
  const agent = request.agent(app);
  const name = displayName ?? uniq('user');
  const email = `${uniq('e')}@test.dev`;
  const res = await agent
    .post('/api/auth/register')
    .send({ displayName: name, email, passphrase: 'passphrase123', tier });
  if (res.status !== 201) {
    throw new Error(`createTestUser failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return { user: res.body, agent };
}

export async function createCourseFor(agent, { name } = {}) {
  const res = await agent.post('/api/courses').send({ name: name ?? uniq('course') });
  if (res.status !== 201) throw new Error(`createCourseFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function createUnitFor(agent, courseId, { name } = {}) {
  const res = await agent.post(`/api/courses/${courseId}/units`).send({ name: name ?? uniq('unit') });
  if (res.status !== 201) throw new Error(`createUnitFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// Upload a small text document so the unit has parseable source material.
export async function createDocumentFor(agent, unitId, { text = 'The cell is the basic unit of life. ATP is the energy currency. DNA stores genetic information.' } = {}) {
  const res = await agent
    .post(`/api/units/${unitId}/documents`)
    .attach('file', Buffer.from(text), { filename: 'notes.txt', contentType: 'text/plain' });
  if (res.status !== 201) throw new Error(`createDocumentFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// Convenience: course + unit + a parsed document in one call.
export async function seedCourseUnitDoc(agent) {
  const course = await createCourseFor(agent);
  const unit = await createUnitFor(agent, course.id);
  const document = await createDocumentFor(agent, unit.id);
  return { course, unit, document };
}

export async function createQuizFor(agent, { courseId, unitIds, title = 'Test Quiz', types = ['mcq', 'short'], questionCount = 5, difficulty = 'mixed', reviewMix = 0 } = {}) {
  const res = await agent.post('/api/quizzes/generate').send({ courseId, unitIds, title, types, questionCount, difficulty, reviewMix });
  if (res.status !== 201) throw new Error(`createQuizFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body; // { quizId, questionCount }
}

export async function createDeckFor(agent, unitId, { count = 4 } = {}) {
  const res = await agent.post(`/api/units/${unitId}/flashcards/generate`).send({ count });
  if (res.status !== 201) throw new Error(`createDeckFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body; // { deckId, cardCount, model }
}

export async function createStudyGuideFor(agent, unitId) {
  const res = await agent.post(`/api/units/${unitId}/study-guide/generate`).send({});
  if (res.status !== 201) throw new Error(`createStudyGuideFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

export async function createThreadFor(agent, { title = 'Test Thread' } = {}) {
  const res = await agent.post('/api/chat/threads').send({ title });
  if (res.status !== 201) throw new Error(`createThreadFor failed (${res.status}): ${JSON.stringify(res.body)}`);
  return res.body;
}

// An unauthenticated agent (no session cookie) for auth-required assertions.
export function anonAgent() {
  return request.agent(app);
}
