import db from './index.js';

const stmts = {
  findById: db.prepare('SELECT * FROM users WHERE id = ?'),
  findByName: db.prepare('SELECT * FROM users WHERE display_name = ?'),
  listAll: db.prepare(
    'SELECT id, display_name, tier, created_at FROM users ORDER BY created_at'
  ),
  insert: db.prepare(
    `INSERT INTO users (id, display_name, passphrase_hash, tier, created_at)
     VALUES (@id, @display_name, @passphrase_hash, @tier, @created_at)`
  ),
  updateName: db.prepare('UPDATE users SET display_name = ? WHERE id = ?'),
  updateHash: db.prepare('UPDATE users SET passphrase_hash = ? WHERE id = ?'),
  delete: db.prepare('DELETE FROM users WHERE id = ?'),
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
