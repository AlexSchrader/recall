import db from './index.js';

const stmts = {
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),
  findByName: db.prepare('SELECT * FROM users WHERE display_name = ?'),
  findByEmail: db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)'),
  listAll: db.prepare(
    'SELECT id, display_name, email, tier, created_at FROM users ORDER BY created_at'
  ),
  insert: db.prepare(
    `INSERT INTO users (id, display_name, email, passphrase_hash, tier, created_at)
     VALUES (@id, @display_name, @email, @passphrase_hash, @tier, @created_at)`
  ),
  updateName: db.prepare('UPDATE users SET display_name = ? WHERE id = ?'),
  updateHash: db.prepare('UPDATE users SET passphrase_hash = ? WHERE id = ?'),
  updateStreak: db.prepare('UPDATE users SET streak = ?, streak_updated_at = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
  insertResetToken: db.prepare(
    `INSERT INTO password_reset_tokens (token, user_id, expires_at) VALUES (?, ?, ?)`
  ),
  getResetToken: db.prepare(
    `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > ?`
  ),
  markTokenUsed: db.prepare(
    `UPDATE password_reset_tokens SET used = 1 WHERE token = ?`
  ),
  expireOldTokens: db.prepare(
    `UPDATE password_reset_tokens SET used = 1 WHERE user_id = ? AND used = 0`
  ),
};

export function createUser(data) {
  return stmts.insert.run(data);
}

export function getUserById(id) {
  return stmts.findById.get(id);
}

export function getUserByName(name) {
  return stmts.findByName.get(name);
}

export function getUserByEmail(email) {
  return stmts.findByEmail.get(email);
}

export function listUsers() {
  return stmts.listAll.all();
}

export function updateDisplayName(id, name) {
  return stmts.updateName.run(name, id);
}

export function updatePassphraseHash(id, hash) {
  return stmts.updateHash.run(hash, id);
}

export function deleteUser(id) {
  return stmts.delete.run(id);
}

export function createResetToken(token, userId, expiresAt) {
  stmts.expireOldTokens.run(userId);
  stmts.insertResetToken.run(token, userId, expiresAt);
}

export function getResetToken(token) {
  return stmts.getResetToken.get(token, new Date().toISOString()) ?? null;
}

export function markTokenUsed(token) {
  stmts.markTokenUsed.run(token);
}

export function updateStreak(userId) {
  const user = stmts.findById.get(userId);
  if (!user) return 0;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const lastStr = user.streak_updated_at?.slice(0, 10);

  if (lastStr === todayStr) return user.streak; // already counted today

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  const newStreak = lastStr === yesterdayStr ? (user.streak || 0) + 1 : 1;
  stmts.updateStreak.run(newStreak, now.toISOString(), userId);
  return newStreak;
}
