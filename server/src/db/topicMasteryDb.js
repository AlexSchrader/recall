import { v4 as uuidv4 } from 'uuid';
import db from './index.js';

const stmts = {
  findOne: db.prepare(
    'SELECT * FROM topic_mastery WHERE user_id = ? AND course_id = ? AND topic = ?'
  ),
  listByUser: db.prepare(
    'SELECT * FROM topic_mastery WHERE user_id = ? ORDER BY mastery ASC'
  ),
  listByCourse: db.prepare(
    'SELECT * FROM topic_mastery WHERE user_id = ? AND course_id = ? ORDER BY mastery ASC'
  ),
  // Topics whose next review is due now, weakest first
  listDue: db.prepare(
    `SELECT * FROM topic_mastery
     WHERE user_id = ? AND due_at <= ?
     ORDER BY mastery ASC LIMIT ?`
  ),
  upsert: db.prepare(
    `INSERT INTO topic_mastery
     (id, user_id, course_id, topic, ease, interval_days, repetitions, mastery, due_at, last_seen_at)
     VALUES
     (@id, @user_id, @course_id, @topic, @ease, @interval_days, @repetitions, @mastery, @due_at, @last_seen_at)
     ON CONFLICT(user_id, topic, course_id) DO UPDATE SET
       ease          = excluded.ease,
       interval_days = excluded.interval_days,
       repetitions   = excluded.repetitions,
       mastery       = excluded.mastery,
       due_at        = excluded.due_at,
       last_seen_at  = excluded.last_seen_at`
  ),
  insertHistory: db.prepare(
    `INSERT INTO mastery_history
     (id, user_id, course_id, topic, mastery_score, ease, interval_days, repetitions, source, changed_at)
     VALUES
     (@id, @user_id, @course_id, @topic, @mastery_score, @ease, @interval_days, @repetitions, @source, @changed_at)`
  ),
  // Baseline mastery per topic for trend arrows: the score as of `cutoff`
  // (newest history row at/before the cutoff). For a topic first seen *after*
  // the cutoff, fall back to its earliest recorded score, so a brand-new topic
  // still shows movement since it started.
  baselines: db.prepare(
    `WITH ranked AS (
       SELECT course_id, topic, mastery_score,
              ROW_NUMBER() OVER (
                PARTITION BY course_id, topic
                ORDER BY (changed_at <= @cutoff) DESC,
                         CASE WHEN changed_at <= @cutoff THEN changed_at END DESC,
                         changed_at ASC
              ) AS rn
       FROM mastery_history
       WHERE user_id = @user_id
     )
     SELECT course_id, topic, mastery_score AS baseline FROM ranked WHERE rn = 1`
  ),
};

export function getMastery(userId, courseId, topic) {
  return stmts.findOne.get(userId, courseId, topic);
}

export function upsertMastery(data) {
  return stmts.upsert.run(data);
}

// Update the live topic_mastery row, then append an immutable history row so
// future trend visualizations have data to draw on. `source` records what drove
// the change ('quiz' | 'flashcard' | 'speed_round' | 'streak' | 'match_it' | 'boss').
const logHistory = db.transaction((data, source) => {
  stmts.upsert.run(data);
  stmts.insertHistory.run({
    id: uuidv4(),
    user_id: data.user_id,
    course_id: data.course_id,
    topic: data.topic,
    mastery_score: data.mastery,
    ease: data.ease,
    interval_days: data.interval_days,
    repetitions: data.repetitions,
    source: source ?? 'unknown',
    changed_at: data.last_seen_at ?? new Date().toISOString(),
  });
});

export function updateMastery(data, source) {
  return logHistory(data, source);
}

export function listMasteryByUser(userId) {
  return stmts.listByUser.all(userId);
}

export function listMasteryByCourse(userId, courseId) {
  return stmts.listByCourse.all(userId, courseId);
}

export function listDueForReview(userId, limit = 10) {
  return stmts.listDue.all(userId, new Date().toISOString(), limit);
}

// Map of `${course_id}::${topic}` → baseline mastery score as of `cutoff` (ISO).
// Used to compute trend deltas without a second pass over history.
export function getMasteryBaselines(userId, cutoff) {
  const rows = stmts.baselines.all({ user_id: userId, cutoff });
  const map = new Map();
  for (const r of rows) map.set(`${r.course_id}::${r.topic}`, r.baseline);
  return map;
}
