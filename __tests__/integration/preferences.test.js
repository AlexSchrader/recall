// Preferences are per-user and merged (partial PUT must not clobber other keys).
import { describe, it, expect } from 'vitest';
import { createTestUser, anonAgent } from '../helpers/seed.js';

describe('preferences — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.get('/api/preferences')).status).toBe(401);
    expect((await anon.put('/api/preferences').send({ x: 1 })).status).toBe(401);
  });
});

describe('preferences — happy path + merge', () => {
  it('partial PUTs merge instead of replacing', async () => {
    const { agent } = await createTestUser();
    await agent.put('/api/preferences').send({ questionCount: 15, difficulty: 'hard' });
    await agent.put('/api/preferences').send({ voiceAutoPlay: true }); // partial

    const res = await agent.get('/api/preferences');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ questionCount: 15, difficulty: 'hard', voiceAutoPlay: true });
  });
});

describe('preferences — per-user isolation', () => {
  it("user B's preferences are independent of user A's", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Pref Alice' });
    const { agent: b } = await createTestUser({ displayName: 'Pref Bob' });
    await a.put('/api/preferences').send({ difficulty: 'easy' });

    const bPrefs = await b.get('/api/preferences');
    expect(bPrefs.body.difficulty).toBeUndefined(); // B never set it
  });
});
