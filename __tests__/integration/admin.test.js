// Admin gating: requireAuth → requireAdmin (ADMIN_USER_IDS) → requireAdminPin.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestUser, anonAgent } from '../helpers/seed.js';

let adminUser, adminAgent, normalAgent;
const savedAdminEnv = process.env.ADMIN_USER_IDS;

beforeAll(async () => {
  ({ user: adminUser, agent: adminAgent } = await createTestUser({ displayName: 'The Admin' }));
  ({ agent: normalAgent } = await createTestUser({ displayName: 'Normal User' }));
  // requireAdmin reads ADMIN_USER_IDS per request — flag only the admin user.
  process.env.ADMIN_USER_IDS = adminUser.id;
});

afterAll(() => {
  if (savedAdminEnv === undefined) delete process.env.ADMIN_USER_IDS;
  else process.env.ADMIN_USER_IDS = savedAdminEnv;
});

describe('admin — gating', () => {
  it('401 for unauthenticated', async () => {
    expect((await anonAgent().get('/api/admin/usage')).status).toBe(401);
  });

  it('403 Forbidden for an authenticated non-admin', async () => {
    const res = await normalAgent.get('/api/admin/usage');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Forbidden.');
  });

  it('403 locked for an admin who has not entered the PIN', async () => {
    const res = await adminAgent.get('/api/admin/usage');
    expect(res.status).toBe(403);
    expect(res.body.locked).toBe(true);
  });

  it('rejects the wrong PIN', async () => {
    expect((await adminAgent.post('/api/admin/unlock').send({ pin: 'nope' })).status).toBe(403);
  });

  it('unlocks with the correct PIN and then serves usage', async () => {
    expect((await adminAgent.post('/api/admin/unlock').send({ pin: '1234' })).status).toBe(200);
    const usage = await adminAgent.get('/api/admin/usage');
    expect(usage.status).toBe(200);
    expect(usage.body).toHaveProperty('detail');
  });

  it('a non-admin cannot unlock even with the right PIN', async () => {
    expect((await normalAgent.post('/api/admin/unlock').send({ pin: '1234' })).status).toBe(403);
  });
});
