// Feedback route: auth, validation, persistence, and that the email is fired
// with an admin deep-link. email.js is mocked at the boundary (integration.setup).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTestUser, anonAgent } from '../helpers/seed.js';
import { sendFeedback } from '../../server/src/services/email.js';

describe('feedback', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('rejects unauthenticated submissions with 401', async () => {
    const res = await anonAgent().post('/api/feedback').send({ type: 'bug', message: 'hi' });
    expect(res.status).toBe(401);
  });

  it('validates type and message', async () => {
    const { agent } = await createTestUser();
    expect((await agent.post('/api/feedback').send({ type: 'nope', message: 'x' })).status).toBe(400);
    expect((await agent.post('/api/feedback').send({ type: 'bug', message: '   ' })).status).toBe(400);
    expect((await agent.post('/api/feedback').send({ type: 'bug', message: 'a'.repeat(4001) })).status).toBe(400);
  });

  it('accepts valid feedback and fires the email with an /admin link', async () => {
    const { agent } = await createTestUser();
    const res = await agent.post('/api/feedback').send({ type: 'feature', message: 'Add dark mode to games' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    expect(sendFeedback).toHaveBeenCalledTimes(1);
    const arg = sendFeedback.mock.calls[0][0];
    expect(arg.type).toBe('feature');
    expect(arg.message).toBe('Add dark mode to games');
    expect(arg.adminUrl).toMatch(/\/admin$/);
  });
});
