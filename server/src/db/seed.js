import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import db from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seeds = JSON.parse(readFileSync(join(__dirname, 'seeds.json'), 'utf8'));

const SALT_ROUNDS = 10;

const exists = db.prepare('SELECT id FROM users WHERE display_name = ?');
const insert = db.prepare(
  `INSERT INTO users (id, display_name, passphrase_hash, tier, created_at)
   VALUES (?, ?, ?, ?, ?)`
);

console.log('Seeding database…');

for (const user of seeds.users) {
  if (exists.get(user.display_name)) {
    console.log(`  skip  "${user.display_name}" — already exists`);
    continue;
  }
  const id = uuidv4();
  const hash = bcrypt.hashSync(user.passphrase, SALT_ROUNDS);
  insert.run(id, user.display_name, hash, user.tier, new Date().toISOString());
  console.log(`  added "${user.display_name}" (${user.tier})  id=${id}`);
}

// Smoke-query: print every user in the DB
const users = db.prepare('SELECT id, display_name, tier FROM users').all();
console.log('\nUsers in DB:');
for (const u of users) {
  console.log(`  ${u.id}  ${u.display_name}  [${u.tier}]`);
}
