import db from './index.js';

const stmts = {
  insertThread: db.prepare(
    `INSERT INTO chat_threads (id, user_id, title, created_at, updated_at)
     VALUES (@id, @user_id, @title, @created_at, @updated_at)`
  ),
  listThreads: db.prepare(
    `SELECT id, title, created_at, updated_at
     FROM chat_threads WHERE user_id = ?
     ORDER BY updated_at DESC`
  ),
  getThread: db.prepare(
    `SELECT * FROM chat_threads WHERE id = ? AND user_id = ?`
  ),
  updateTitle: db.prepare(
    `UPDATE chat_threads SET title = ? WHERE id = ? AND user_id = ?`
  ),
  updateTimestamp: db.prepare(
    `UPDATE chat_threads SET updated_at = ? WHERE id = ? AND user_id = ?`
  ),
  deleteThread: db.prepare(
    `DELETE FROM chat_threads WHERE id = ? AND user_id = ?`
  ),
  insertMessage: db.prepare(
    `INSERT INTO chat_messages (id, thread_id, role, content, attachments_json, created_at)
     VALUES (@id, @thread_id, @role, @content, @attachments_json, @created_at)`
  ),
  getMessages: db.prepare(
    `SELECT m.* FROM chat_messages m
     JOIN chat_threads t ON t.id = m.thread_id
     WHERE m.thread_id = ? AND t.user_id = ?
     ORDER BY m.created_at`
  ),
};

export function createThread({ id, userId, title, now }) {
  stmts.insertThread.run({ id, user_id: userId, title, created_at: now, updated_at: now });
  return stmts.getThread.get(id, userId);
}

export function listThreads(userId) {
  return stmts.listThreads.all(userId);
}

export function getThread(id, userId) {
  return stmts.getThread.get(id, userId) ?? null;
}

export function addMessage({ id, threadId, role, content, attachmentsJson = null, createdAt }) {
  stmts.insertMessage.run({
    id,
    thread_id: threadId,
    role,
    content,
    attachments_json: attachmentsJson,
    created_at: createdAt,
  });
  return { id, thread_id: threadId, role, content, attachments_json: attachmentsJson, created_at: createdAt };
}

export function getMessages(threadId, userId) {
  return stmts.getMessages.all(threadId, userId);
}

export function deleteThread(id, userId) {
  return stmts.deleteThread.run(id, userId).changes > 0;
}

export function renameThread(id, userId, title) {
  return stmts.updateTitle.run(title, id, userId).changes > 0;
}

export function updateThreadTimestamp(id, userId, now) {
  stmts.updateTimestamp.run(now, id, userId);
}
