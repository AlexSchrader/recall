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
