// Chat thread scoping — chatDb is the reference pattern; lock it in.
import { describe, it, expect } from 'vitest';
import { createTestUser, createThreadFor, anonAgent } from '../helpers/seed.js';

describe('chat — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.get('/api/chat/threads')).status).toBe(401);
    expect((await anon.post('/api/chat/threads').send({ title: 'x' })).status).toBe(401);
    expect((await anon.get('/api/chat/threads/x')).status).toBe(401);
    expect((await anon.patch('/api/chat/threads/x').send({ title: 'y' })).status).toBe(401);
    expect((await anon.delete('/api/chat/threads/x')).status).toBe(401);
    expect((await anon.post('/api/chat/threads/x/messages').send({ content: 'hi' })).status).toBe(401);
  });
});

describe('chat — happy path (owner)', () => {
  it('owner can create, list, read, message, rename and delete their thread', async () => {
    const { agent } = await createTestUser();
    const thread = await createThreadFor(agent, { title: 'My thread' });
    expect(thread.id).toBeTruthy();

    expect((await agent.get('/api/chat/threads')).body.map(t => t.id)).toContain(thread.id);

    const get = await agent.get(`/api/chat/threads/${thread.id}`);
    expect(get.status).toBe(200);
    expect(get.body.messages).toEqual([]);

    // Streamed reply via the mocked rappel boundary
    const msg = await agent.post(`/api/chat/threads/${thread.id}/messages`).send({ content: 'Hello Rappel' });
    expect(msg.status).toBe(200);
    expect(msg.text).toContain('Mock reply');

    // Message history now has the user message + assistant reply persisted
    const after = await agent.get(`/api/chat/threads/${thread.id}`);
    expect(after.body.messages.length).toBe(2);

    expect((await agent.patch(`/api/chat/threads/${thread.id}`).send({ title: 'Renamed' })).status).toBe(200);
    expect((await agent.delete(`/api/chat/threads/${thread.id}`)).status).toBe(204);
  });
});

describe('chat — cross-user denial', () => {
  it("user B cannot read, message, rename or delete user A's thread", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Chat Alice' });
    const { agent: b } = await createTestUser({ displayName: 'Chat Bob' });
    const thread = await createThreadFor(a);

    expect((await b.get(`/api/chat/threads/${thread.id}`)).status).toBe(404);
    expect((await b.post(`/api/chat/threads/${thread.id}/messages`).send({ content: 'sneak' })).status).toBe(404);
    expect((await b.patch(`/api/chat/threads/${thread.id}`).send({ title: 'hijack' })).status).toBe(404);
    expect((await b.delete(`/api/chat/threads/${thread.id}`)).status).toBe(404);

    // B's thread list does not include A's thread
    expect((await b.get('/api/chat/threads')).body.map(t => t.id)).not.toContain(thread.id);
  });
});
