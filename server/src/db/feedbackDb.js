import db from './index.js';

const stmts = {
  insert: db.prepare(
    `INSERT INTO feedback (id, user_id, type, message, has_screenshot, created_at)
     VALUES (@id, @user_id, @type, @message, @has_screenshot, @created_at)`
  ),
  list: db.prepare(`
    SELECT f.id, f.type, f.message, f.has_screenshot, f.created_at,
           u.display_name
    FROM feedback f
    LEFT JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `),
};

export function createFeedback(data) {
  return stmts.insert.run(data);
}

export function listFeedback() {
  return stmts.list.all();
}
