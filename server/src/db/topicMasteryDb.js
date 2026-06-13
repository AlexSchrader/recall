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
};

export function getMastery(userId, courseId, topic) {
  return stmts.findOne.get(userId, courseId, topic);
}

export function upsertMastery(data) {
  return stmts.upsert.run(data);
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
