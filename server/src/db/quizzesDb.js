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
  setShare: db.prepare('UPDATE quizzes SET share_token = @token WHERE id = @id AND user_id = @user_id'),
  findByShareToken: db.prepare('SELECT * FROM quizzes WHERE share_token = ?'),
  countCompleted: db.prepare(
    `SELECT COUNT(*) AS n FROM quizzes WHERE user_id = ? AND status = 'completed'`
  ),
  listWithQuestions: db.prepare(
    `SELECT q.id, q.title, q.score, q.status, q.created_at, q.completed_at,
            json_group_array(json_object(
              'prompt', qn.prompt,
              'type',   qn.type,
              'topic',  qn.topic,
              'correct_answer', qn.correct_answer
            )) AS questions
     FROM quizzes q
     LEFT JOIN questions qn ON qn.quiz_id = q.id
     WHERE q.user_id = ?
     GROUP BY q.id
     ORDER BY q.created_at DESC`
  ),
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

// Set (or clear, with token=null) a quiz's public share token. Scoped to owner.
export function setQuizShareToken(id, userId, token) {
  return stmts.setShare.run({ id, user_id: userId, token });
}

export function getQuizByShareToken(token) {
  return stmts.findByShareToken.get(token) ?? null;
}

export function countTodayByUser(userId) {
  const todayUtc = new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
  return stmts.countToday.get(userId, todayUtc).count;
}

export function countCompletedQuizzesByUser(userId) {
  return stmts.countCompleted.get(userId).n;
}

export function listQuizzesWithQuestions(userId) {
  return stmts.listWithQuestions.all(userId).map(q => ({
    ...q,
    questions: JSON.parse(q.questions ?? '[]'),
  }));
}
