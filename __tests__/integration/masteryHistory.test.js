// updateMastery() must update the live topic_mastery row AND append exactly one
// mastery_history row with the right fields (write-only log for future trends).
import { describe, it, expect } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { createTestUser, createCourseFor } from '../helpers/seed.js';
import db from '../../server/src/db/index.js';
import { updateMastery, getMastery } from '../../server/src/db/topicMasteryDb.js';

const historyFor = (userId, topic) =>
  db.prepare('SELECT * FROM mastery_history WHERE user_id = ? AND topic = ? ORDER BY changed_at').all(userId, topic);

describe('mastery history logging', () => {
  it('writes exactly one history row with the right fields on an update', async () => {
    const { user, agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const topic = 'Photosynthesis';
    const now = new Date().toISOString();

    updateMastery({
      id: uuidv4(), user_id: user.id, course_id: course.id, topic,
      ease: 2.6, interval_days: 6, repetitions: 2, mastery: 0.45,
      due_at: now, last_seen_at: now,
    }, 'quiz');

    // Live row updated
    const live = getMastery(user.id, course.id, topic);
    expect(live.mastery).toBeCloseTo(0.45);

    // Exactly one history row, with the right fields mapped
    const rows = historyFor(user.id, topic);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      user_id: user.id,
      course_id: course.id,
      topic,
      mastery_score: 0.45,
      ease: 2.6,
      interval_days: 6,
      repetitions: 2,
      source: 'quiz',
    });
    expect(rows[0].changed_at).toBeTruthy();
  });

  it('appends a second row on the next update (append-only)', async () => {
    const { user, agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const topic = 'Cell Division';
    const base = {
      id: uuidv4(), user_id: user.id, course_id: course.id, topic,
      ease: 2.5, interval_days: 1, repetitions: 1, mastery: 0.2,
      due_at: new Date().toISOString(), last_seen_at: new Date().toISOString(),
    };
    updateMastery(base, 'flashcard');
    updateMastery({ ...base, mastery: 0.6, repetitions: 2 }, 'speed_round');

    const rows = historyFor(user.id, topic);
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.source).sort()).toEqual(['flashcard', 'speed_round']);
  });
});

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

describe('mastery trend on /me/progress', () => {
  const topicTrend = (body, topic) =>
    body.progress.flatMap(p => p.topics).find(t => t.topic === topic)?.trend;

  it('computes the 7-day delta against the baseline at the cutoff', async () => {
    const { user, agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const topic = 'Thermodynamics';
    const base = {
      id: uuidv4(), user_id: user.id, course_id: course.id, topic,
      ease: 2.5, interval_days: 1, repetitions: 1, due_at: daysAgo(0),
    };
    // Old baseline (outside the 7-day window) then a recent improvement.
    updateMastery({ ...base, mastery: 0.2, last_seen_at: daysAgo(10) }, 'quiz');
    updateMastery({ ...base, mastery: 0.6, last_seen_at: daysAgo(0) }, 'quiz');

    const res = await agent.get('/api/me/progress');
    expect(res.status).toBe(200);
    expect(topicTrend(res.body, topic)).toBe(40); // 0.6 - 0.2 = +40 pts
  });

  it('falls back to the earliest score for a topic first seen within the window', async () => {
    const { user, agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const topic = 'Kinematics';
    const base = {
      id: uuidv4(), user_id: user.id, course_id: course.id, topic,
      ease: 2.5, interval_days: 1, repetitions: 1, due_at: daysAgo(0),
    };
    updateMastery({ ...base, mastery: 0.3, last_seen_at: daysAgo(3) }, 'quiz');
    updateMastery({ ...base, mastery: 0.5, last_seen_at: daysAgo(0) }, 'quiz');

    const res = await agent.get('/api/me/progress');
    expect(topicTrend(res.body, topic)).toBe(20); // 0.5 - 0.3 = +20 pts
  });

  it('reports null trend for a topic with no history', async () => {
    const { user, agent } = await createTestUser();
    const course = await createCourseFor(agent);
    const topic = 'Optics';
    // Write the live row only, bypassing the history log.
    db.prepare(
      `INSERT INTO topic_mastery (id, user_id, course_id, topic, ease, interval_days, repetitions, mastery, due_at, last_seen_at)
       VALUES (?, ?, ?, ?, 2.5, 1, 1, 0.4, ?, ?)`
    ).run(uuidv4(), user.id, course.id, topic, daysAgo(0), daysAgo(0));

    const res = await agent.get('/api/me/progress');
    expect(topicTrend(res.body, topic)).toBeNull();
  });
});
