import db from './index.js';

const stmts = {
  findById: db.prepare('SELECT * FROM units WHERE id = ?'),
  listByCourse: db.prepare(
    'SELECT * FROM units WHERE course_id = ? ORDER BY position'
  ),
  maxPosition: db.prepare(
    'SELECT COALESCE(MAX(position), 0) AS max FROM units WHERE course_id = ?'
  ),
  insert: db.prepare(
    `INSERT INTO units (id, course_id, name, position, created_at)
     VALUES (@id, @course_id, @name, @position, @created_at)`
  ),
  update: db.prepare(
    'UPDATE units SET name = @name, position = @position WHERE id = @id'
  ),
  delete: db.prepare('DELETE FROM units WHERE id = ?'),
};

export function createUnit(data) {
  return stmts.insert.run(data);
}

export function getUnitById(id) {
  return stmts.findById.get(id);
}

export function listUnitsByCourse(courseId) {
  return stmts.listByCourse.all(courseId);
}

export function getNextPosition(courseId) {
  const { max } = stmts.maxPosition.get(courseId);
  return max + 1;
}

export function updateUnit(id, { name, position }) {
  return stmts.update.run({ id, name, position });
}

export function deleteUnit(id) {
  return stmts.delete.run(id);
}
