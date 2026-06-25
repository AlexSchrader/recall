import db from './index.js';

const stmts = {
  findById: db.prepare('SELECT * FROM courses WHERE id = ?'),
  listByUser: db.prepare(
    'SELECT * FROM courses WHERE user_id = ? ORDER BY created_at'
  ),
  insert: db.prepare(
    `INSERT INTO courses (id, user_id, name, color, created_at)
     VALUES (@id, @user_id, @name, @color, @created_at)`
  ),
  update: db.prepare('UPDATE courses SET name = @name, color = @color, exam_date = @exam_date WHERE id = @id'),
  delete: db.prepare('DELETE FROM courses WHERE id = ?'),
};

export function createCourse(data) {
  return stmts.insert.run(data);
}

export function getCourseById(id) {
  return stmts.findById.get(id);
}

export function listCoursesByUser(userId) {
  return stmts.listByUser.all(userId);
}

export function updateCourse(id, { name, color, exam_date }) {
  return stmts.update.run({ id, name, color, exam_date: exam_date ?? null });
}

export function deleteCourse(id) {
  return stmts.delete.run(id);
}
