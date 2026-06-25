import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daysUntilExam, examCountdownLabel, examUrgency } from '../client/src/examCountdown.js';

// Pin "today" to 2026-06-24 (local) so day math is deterministic.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 5, 24, 9, 0, 0)); // month is 0-indexed → June
});
afterEach(() => {
  vi.useRealTimers();
});

describe('daysUntilExam', () => {
  it('returns null for missing or malformed input', () => {
    expect(daysUntilExam(null)).toBe(null);
    expect(daysUntilExam('')).toBe(null);
    expect(daysUntilExam('not-a-date')).toBe(null);
    expect(daysUntilExam('2026/06/24')).toBe(null);
  });

  it('returns 0 for today', () => {
    expect(daysUntilExam('2026-06-24')).toBe(0);
  });

  it('counts whole days forward regardless of clock time', () => {
    expect(daysUntilExam('2026-06-25')).toBe(1);
    expect(daysUntilExam('2026-07-01')).toBe(7);
  });

  it('returns a negative number for past dates', () => {
    expect(daysUntilExam('2026-06-20')).toBe(-4);
  });
});

describe('examCountdownLabel', () => {
  it('null for no date', () => {
    expect(examCountdownLabel(null)).toBe(null);
  });
  it('special-cases today / tomorrow / past', () => {
    expect(examCountdownLabel('2026-06-24')).toBe('Exam today');
    expect(examCountdownLabel('2026-06-25')).toBe('Exam tomorrow');
    expect(examCountdownLabel('2026-06-20')).toBe('Exam passed');
  });
  it('pluralises future days', () => {
    expect(examCountdownLabel('2026-07-01')).toBe('7 days to exam');
  });
});

describe('examUrgency', () => {
  it('buckets by proximity', () => {
    expect(examUrgency(null)).toBe(null);
    expect(examUrgency('2026-06-20')).toBe('past');
    expect(examUrgency('2026-06-25')).toBe('urgent'); // 1 day
    expect(examUrgency('2026-06-27')).toBe('urgent'); // 3 days
    expect(examUrgency('2026-06-30')).toBe('soon');   // 6 days
    expect(examUrgency('2026-07-10')).toBe('far');    // 16 days
  });
});
