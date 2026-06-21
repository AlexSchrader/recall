import db from './index.js';

const stmts = {
  insert: db.prepare(
    `INSERT INTO feedback (id, user_id, type, message, has_screenshot, created_at)
     VALUES (@id, @user_id, @type, @message, @has_screenshot, @created_at)`
  ),
};

export function createFeedback(data) {
  return stmts.insert.run(data);
}
