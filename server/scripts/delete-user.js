// Usage: node server/scripts/delete-user.js "DisplayName"
import 'dotenv/config';
import db from '../src/db/index.js';

const name = process.argv[2];
if (!name) { console.error('Usage: node server/scripts/delete-user.js "DisplayName"'); process.exit(1); }

const user = db.prepare('SELECT id, display_name FROM users WHERE display_name = ?').get(name);
if (!user) { console.log(`No user found with display name "${name}"`); process.exit(0); }

db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
console.log(`Deleted user "${user.display_name}" (${user.id})`);
