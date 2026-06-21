import db from './index.js';

const stmts = {
  findById: db.prepare('SELECT * FROM quizzes WHERE id = ?'),
  listByUser: db.prepare(
    'SELECT * FROM quizzes WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ),
  // json_each lets us search inside the source_unit_ids JSON array
  listByUnit: db.prepare(
    `SELECT DISTINCT q.*
     FROM quizzes q, json_each(q.source_unit_ids)
     WHERE q.user_id = ? AND json_each.value = ?
     ORDER BY q.created_at DESC LIMIT ?`
  ),
  insert: db.prepare(
    `INSERT INTO quizzes
     (id, user_id, title, source_unit_ids, config_json, status, model, created_at)
     VALUES (@id, @user_id, @title, @source_unit_ids, @config_json, @status, @model, @created_at)`
  ),
  updateStatus: db.prepare('UPDATE quizzes SET status = ? WHERE id = ?'),
  complete: db.prepare(
    `UPDATE quizzes
     SET status = 'completed', score = @score, completed_at = @completed_at
     WHERE id = @id`
  ),
  countToday: db.prepare(
    `SELECT COUNT(*) AS count FROM quizzes WHERE user_id = ? AND created_at >= ?`
  ),
  delete: db.prepare('DELETE FROM quizzes WHERE id = ? AND user_id = ?'),
};

export function createQuiz(data) {
  return stmts.insert.run(data);
}

export function getQuizById(id) {
  return stmts.findById.get(id);
}

export function listQuizzesByUser(userId, { limit = 20, offset = 0 } = {}) {
  return stmts.listByUser.all(userId, limit, offset);
}

export function listRecentByUnit(userId, unitId, limit = 5) {
  return stmts.listByUnit.all(userId, unitId, limit);
}

export function updateQuizStatus(id, status) {
  return stmts.updateStatus.run(status, id);
}

export function completeQuiz(id, { score, completed_at }) {
  return stmts.complete.run({ id, score, completed_at });
}

export function deleteQuiz(id, userId) {
  return stmts.delete.run(id, userId);
}

export function countTodayByUser(userId) {
  const todayUtc = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  return stmts.countToday.get(userId, todayUtc).count;
}
