import { describe, it, expect } from 'vitest';
import { courseReadiness, readinessColor, readinessLabel } from '../client/src/readiness.js';

describe('courseReadiness', () => {
  it('is zero / not-started when no topic has been seen', () => {
    const r = courseReadiness([{ topic: 'A', mastery: 0, repetitions: 0 }]);
    expect(r).toMatchObject({ score: 0, seenCount: 0, ready: false });
  });

  it('averages mastery across seen topics only', () => {
    const r = courseReadiness([
      { topic: 'A', mastery: 0.8, repetitions: 3 },
      { topic: 'B', mastery: 0.4, repetitions: 1 },
      { topic: 'C', mastery: 0, repetitions: 0 }, // unseen — excluded
    ]);
    expect(r.seenCount).toBe(2);
    expect(r.topicCount).toBe(3);
    expect(r.score).toBeCloseTo(0.6);
  });

  it('counts a topic as seen when it has reps even at 0 mastery', () => {
    const r = courseReadiness([{ topic: 'A', mastery: 0, repetitions: 2 }]);
    expect(r.seenCount).toBe(1);
  });

  it('flags ready at 80%+', () => {
    expect(courseReadiness([{ topic: 'A', mastery: 0.85, repetitions: 4 }]).ready).toBe(true);
    expect(courseReadiness([{ topic: 'A', mastery: 0.7, repetitions: 4 }]).ready).toBe(false);
  });
});

describe('readiness labels & colors', () => {
  it('maps score bands to labels', () => {
    expect(readinessLabel(0)).toBe('Not started');
    expect(readinessLabel(0.3)).toBe('Keep going');
    expect(readinessLabel(0.5)).toBe('Getting there');
    expect(readinessLabel(0.65)).toBe('Almost there');
    expect(readinessLabel(0.9)).toBe('Exam-ready');
  });

  it('maps score bands to theme colors', () => {
    expect(readinessColor(0.9)).toContain('success');
    expect(readinessColor(0.6)).toContain('warning');
    expect(readinessColor(0.2)).toContain('danger');
  });
});
