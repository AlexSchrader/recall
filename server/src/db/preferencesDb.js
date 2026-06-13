import db from './index.js';

const stmts = {
  find: db.prepare('SELECT * FROM preferences WHERE user_id = ?'),
  upsert: db.prepare(
    `INSERT INTO preferences (user_id, prefs_json, updated_at)
     VALUES (@user_id, @prefs_json, @updated_at)
     ON CONFLICT(user_id) DO UPDATE SET
       prefs_json = excluded.prefs_json,
       updated_at = excluded.updated_at`
  ),
};

export function getPreferences(userId) {
  const row = stmts.find.get(userId);
  if (!row) return null;
  return { ...row, prefs: JSON.parse(row.prefs_json) };
}

export function upsertPreferences(userId, prefs) {
  return stmts.upsert.run({
    user_id: userId,
    prefs_json: typeof prefs === 'string' ? prefs : JSON.stringify(prefs),
    updated_at: new Date().toISOString(),
  });
}
