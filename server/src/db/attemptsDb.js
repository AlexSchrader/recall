import db from './index.js';

const stmts = {
  insert: db.prepare(
    `INSERT INTO attempts (id, question_id, user_id, given_answer, is_correct, answered_at)
     VALUES (@id, @question_id, @user_id, @given_answer, @is_correct, @answered_at)`
  ),
  listByQuestion: db.prepare(
    `SELECT * FROM attempts
     WHERE question_id = ? AND user_id = ? ORDER BY answered_at DESC`
  ),
  listByUser: db.prepare(
    `SELECT * FROM attempts WHERE user_id = ? ORDER BY answered_at DESC LIMIT ? OFFSET ?`
  ),
  listByTopic: db.prepare(
    `SELECT a.* FROM attempts a
     JOIN questions q ON q.id = a.question_id
     WHERE a.user_id = ? AND q.topic = ?
     ORDER BY a.answered_at DESC`
  ),
};

export const bulkCreateAttempts = db.transaction((attempts) => {
  for (const a of attempts) stmts.insert.run(a);
});

export function createAttempt(data) {
  return stmts.insert.run(data);
}

export function listAttemptsByQuestion(questionId, userId) {
  return stmts.listByQuestion.all(questionId, userId);
}

export function listAttemptsByUser(userId, { limit = 50, offset = 0 } = {}) {
  return stmts.listByUser.all(userId, limit, offset);
}

export function listAttemptsByTopic(userId, topic) {
  return stmts.listByTopic.all(userId, topic);
}
