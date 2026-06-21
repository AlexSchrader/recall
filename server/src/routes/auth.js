import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import {
  getUserByEmail, getUserByName, getUserById, createUser, deleteUser,
  createResetToken, getResetToken, markTokenUsed,
  updatePassphraseHash, updateDisplayName, updateEmail,
} from '../db/usersDb.js';
import { requireAuth } from '../middleware/auth.js';
import { sendPasswordReset } from '../services/email.js';

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  const { displayName, email, passphrase, tier = 'free' } = req.body ?? {};
  if (!displayName?.trim() || !email?.trim() || !passphrase) {
    return res.status(400).json({ error: 'Display name, email, and passphrase are required.' });
  }
  if (getUserByName(displayName.trim())) {
    return res.status(409).json({ error: 'That display name is already taken.' });
  }
  if (getUserByEmail(email.trim())) {
    return res.status(409).json({ error: 'An account with that email already exists.' });
  }
  const id = uuidv4();
  const hash = await bcrypt.hash(passphrase, SALT_ROUNDS);
  createUser({
    id,
    display_name: displayName.trim(),
    email: email.trim().toLowerCase(),
    passphrase_hash: hash,
    tier,
    created_at: new Date().toISOString(),
  });
  req.session.userId = id;
  const { passphrase_hash: _, ...user } = getUserById(id);
  res.status(201).json(user);
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  const { identifier, passphrase } = req.body ?? {};
  if (!identifier || !passphrase) {
    return res.status(400).json({ error: 'Display name (or email) and passphrase are required.' });
  }
  const id = identifier.trim();
  const user = id.includes('@') ? getUserByEmail(id) : getUserByName(id);
  if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
  const ok = await bcrypt.compare(passphrase, user.passphrase_hash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });
  req.session.userId = user.id;
  const { passphrase_hash: _, ...safe } = user;
  res.json(safe);
});

// POST /api/auth/forgot-password
router.post('/auth/forgot-password', async (req, res) => {
  const { email } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: 'email is required.' });

  // Always respond 200 — don't reveal whether an account exists
  res.json({ ok: true });

  const user = getUserByEmail(email.trim());
  if (!user?.email) return;

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  createResetToken(token, user.id, expiresAt);

  const origin = req.headers.origin || `${req.protocol}://${req.headers.host}`;
  const resetUrl = `${origin}/reset-password?token=${token}`;

  sendPasswordReset(user.email, resetUrl).catch(err =>
    console.error('[forgot-password] email send failed:', err.message)
  );
});

// POST /api/auth/reset-password
router.post('/auth/reset-password', async (req, res) => {
  const { token, passphrase } = req.body ?? {};
  if (!token || !passphrase) {
    return res.status(400).json({ error: 'token and passphrase are required.' });
  }
  const record = getResetToken(token);
  if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.' });

  const hash = await bcrypt.hash(passphrase, SALT_ROUNDS);
  updatePassphraseHash(record.user_id, hash);
  markTokenUsed(token);

  // Log them in automatically
  req.session.userId = record.user_id;
  const user = getUserById(record.user_id);
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

// GET /api/me/check-name?displayName=foo
router.get('/me/check-name', requireAuth, (req, res) => {
  const name = (req.query.displayName ?? '').trim();
  if (!name) return res.json({ available: false });
  const existing = getUserByName(name);
  res.json({ available: !existing || existing.id === req.session.userId });
});

// PATCH /api/me/display-name
router.patch('/me/display-name', requireAuth, (req, res) => {
  const { displayName } = req.body ?? {};
  if (!displayName?.trim()) return res.status(400).json({ error: 'Display name is required.' });
  const existing = getUserByName(displayName.trim());
  if (existing && existing.id !== req.session.userId) {
    return res.status(409).json({ error: 'That display name is already taken.' });
  }
  updateDisplayName(req.session.userId, displayName.trim());
  const user = getUserById(req.session.userId);
  const { passphrase_hash: _, ...safe } = user;
  res.json(safe);
});

// PATCH /api/me/email
router.patch('/me/email', requireAuth, (req, res) => {
  const { email } = req.body ?? {};
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' });
  const existing = getUserByEmail(email.trim());
  if (existing && existing.id !== req.session.userId) {
    return res.status(409).json({ error: 'That email is already in use.' });
  }
  updateEmail(req.session.userId, email.trim().toLowerCase());
  const user = getUserById(req.session.userId);
  const { passphrase_hash: _, ...safe } = user;
  res.json(safe);
});

// DELETE /api/me  (delete account)
router.delete('/me', requireAuth, (req, res) => {
  deleteUser(req.session.userId);
  req.session.destroy(() => res.status(204).end());
});

// PATCH /api/me/password
router.patch('/me/password', requireAuth, async (req, res) => {
  const { currentPassphrase, newPassphrase } = req.body ?? {};
  if (!currentPassphrase || !newPassphrase) {
    return res.status(400).json({ error: 'currentPassphrase and newPassphrase are required.' });
  }
  const user = getUserById(req.session.userId);
  const ok = await bcrypt.compare(currentPassphrase, user.passphrase_hash);
  if (!ok) return res.status(401).json({ error: 'Current passphrase is incorrect.' });
  const hash = await bcrypt.hash(newPassphrase, SALT_ROUNDS);
  updatePassphraseHash(req.session.userId, hash);
  res.json({ ok: true });
});

export default router;
