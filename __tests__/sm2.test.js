import { describe, it, expect } from 'vitest';
import { qualityFromAnswer, sm2Next } from '../server/src/services/sm2.js';

describe('qualityFromAnswer', () => {
  it('rewards confident-correct more than guessed-correct', () => {
    expect(qualityFromAnswer(1, 'confident')).toBe(5);
    expect(qualityFromAnswer(1, 'unsure')).toBe(4);
    expect(qualityFromAnswer(1, 'guess')).toBe(3);
  });

  it('defaults correct to 4 when confidence is unknown (older clients)', () => {
    expect(qualityFromAnswer(1, null)).toBe(4);
    expect(qualityFromAnswer(1, undefined)).toBe(4);
  });

  it('treats partial as a pass unless guessed', () => {
    expect(qualityFromAnswer(0.5, 'confident')).toBe(3);
    expect(qualityFromAnswer(0.5, 'unsure')).toBe(3);
    expect(qualityFromAnswer(0.5, 'guess')).toBe(2); // < 3 → SM-2 treats as a miss
  });

  it('treats wrong as a miss, hardest when confidently wrong', () => {
    expect(qualityFromAnswer(0, 'confident')).toBe(0);
    expect(qualityFromAnswer(0, 'unsure')).toBe(2);
    expect(qualityFromAnswer(0, null)).toBe(2);
  });
});

describe('confidence changes SM-2 scheduling on correct answers', () => {
  const base = { ease: 2.5, interval_days: 1, repetitions: 1, mastery: 0.3, due_at: '', last_seen_at: null };

  it('confident-correct raises ease above guessed-correct', () => {
    const confident = sm2Next(base, qualityFromAnswer(1, 'confident'));
    const guessed = sm2Next(base, qualityFromAnswer(1, 'guess'));
    expect(confident.ease).toBeGreaterThan(guessed.ease);
    // guessed-correct still passes (advances), just with a shorter leash
    expect(guessed.repetitions).toBe(base.repetitions + 1);
  });
});
