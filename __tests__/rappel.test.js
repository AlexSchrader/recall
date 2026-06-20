import { describe, it, expect } from 'vitest';
import { VOICE_ID, MODEL_ID, SYSTEM_PROMPT } from '../server/src/config/rappel.js';

describe('Rappel config', () => {
  it('exports the correct ElevenLabs voice ID', () => {
    expect(VOICE_ID).toBe('y7bvdjGvOKdLpEryP5tK');
  });

  it('exports the correct ElevenLabs model ID', () => {
    expect(MODEL_ID).toBe('eleven_turbo_v2_5');
  });

  it('SYSTEM_PROMPT contains the {{USER_CONTEXT}} placeholder', () => {
    expect(SYSTEM_PROMPT).toContain('{{USER_CONTEXT}}');
  });

  it('SYSTEM_PROMPT establishes the Rappel persona', () => {
    expect(SYSTEM_PROMPT.toLowerCase()).toContain('rappel');
    expect(SYSTEM_PROMPT).toContain('French');
  });
});
