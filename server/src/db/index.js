import Database from 'better-sqlite3';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DATABASE_PATH lets Railway (or any host) point to a persistent volume.
// Falls back to the local dev path when not set.
const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../../data/recall.db');
const DATA_DIR = dirname(DB_PATH);

mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

// Migration: add email column to users if it doesn't exist yet
const userCols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
if (!userCols.includes('email')) {
  db.exec('ALTER TABLE users ADD COLUMN email TEXT');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL');
}

export { DB_PATH };
export default db;
