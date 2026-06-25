// Voice routes are session-gated (PIN), not resource-owned. These assert the
// gate without reaching ElevenLabs (ELEVENLABS_API_KEY is intentionally unset,
// so any real TTS path fails closed with 503).
import { describe, it, expect } from 'vitest';
import { createTestUser, anonAgent } from '../helpers/seed.js';

describe('voice — auth + PIN gate', () => {
  it('rejects unauthenticated TTS with 401', async () => {
    expect((await anonAgent().post('/api/voice/tts').send({ text: 'hi' })).status).toBe(401);
  });

  it('reports locked status and blocks TTS before unlock', async () => {
    const { agent } = await createTestUser();
    const status = await agent.get('/api/voice/status');
    expect(status.status).toBe(200);
    expect(status.body.unlocked).toBe(false);
    expect((await agent.post('/api/voice/tts').send({ text: 'hi' })).status).toBe(403);
  });

  it('rejects the wrong PIN, accepts the right one', async () => {
    const { agent } = await createTestUser();
    expect((await agent.post('/api/voice/unlock').send({ pin: 'nope' })).status).toBe(403);
    expect((await agent.post('/api/voice/unlock').send({ pin: '1234' })).status).toBe(200);
    expect((await agent.get('/api/voice/status')).body.unlocked).toBe(true);
  });

  it('after unlock, empty TTS text is rejected before any ElevenLabs call', async () => {
    const { agent } = await createTestUser();
    await agent.post('/api/voice/unlock').send({ pin: '1234' });
    expect((await agent.post('/api/voice/tts').send({ text: '   ' })).status).toBe(400);
  });

  it('preview fails closed (503) when ELEVENLABS_API_KEY is unset', async () => {
    const { agent } = await createTestUser();
    expect((await agent.get('/api/voice/preview?voice=mathieu')).status).toBe(503);
  });
});
