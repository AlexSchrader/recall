import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { getUserByName, getUserById, createUser } from '../db/usersDb.js';

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { displayName, passphrase, tier = 'free' } = req.body ?? {};
  if (!displayName?.trim() || !passphrase) {
    return res.status(400).json({ error: 'displayName and passphrase are required.' });
  }
  if (getUserByName(displayName.trim())) {
    return res.status(409).json({ error: 'Display name already taken.' });
  }
  const id = uuidv4();
  const hash = await bcrypt.hash(passphrase, SALT_ROUNDS);
  createUser({ id, display_name: displayName.trim(), passphrase_hash: hash, tier, created_at: new Date().toISOString() });
  req.session.userId = id;
  const { passphrase_hash: _, ...user } = getUserById(id);
  res.status(201).json(user);
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { displayName, passphrase } = req.body ?? {};
  if (!displayName || !passphrase) {
    return res.status(400).json({ error: 'displayName and passphrase are required.' });
  }
  const user = getUserByName(displayName.trim());
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const ok = await bcrypt.compare(passphrase, user.passphrase_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
  req.session.userId = user.id;
  const { passphrase_hash: _, ...safe } = user;
  res.json(safe);
});

// DELETE /api/auth/session
router.delete('/auth/session', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

// GET /api/me
router.get('/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated.' });
  const user = getUserById(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found.' });
  const { passphrase_hash: _, ...safe } = user;
  res.json(safe);
});

export default router;
