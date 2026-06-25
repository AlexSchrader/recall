import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import {
  createThread, listThreads, getThread,
  addMessage, getMessages, deleteThread, renameThread, updateThreadTimestamp,
} from '../db/chatDb.js';
import { streamRappelChat, generateThreadTitle } from '../services/rappel.js';

const router = Router();

// ── Threads ───────────────────────────────────────────────────────────────────

router.post('/chat/threads', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  const thread = createThread({
    id: uuidv4(),
    userId: req.session.userId,
    title: req.body?.title?.trim() || 'New chat',
    now,
  });
  res.status(201).json(thread);
});

router.get('/chat/threads', requireAuth, (req, res) => {
  res.json(listThreads(req.session.userId));
});

router.get('/chat/threads/:id', requireAuth, (req, res) => {
  const thread = getThread(req.params.id, req.session.userId);
  if (!thread) return res.status(404).json({ error: 'Thread not found.' });
  const messages = getMessages(thread.id, req.session.userId);
  res.json({ ...thread, messages });
});

router.patch('/chat/threads/:id', requireAuth, (req, res) => {
  const { title } = req.body ?? {};
  if (!title?.trim()) return res.status(400).json({ error: 'title is required.' });
  const ok = renameThread(req.params.id, req.session.userId, title.trim());
  if (!ok) return res.status(404).json({ error: 'Thread not found.' });
  res.json(getThread(req.params.id, req.session.userId));
});

router.delete('/chat/threads/:id', requireAuth, (req, res) => {
  const ok = deleteThread(req.params.id, req.session.userId);
  if (!ok) return res.status(404).json({ error: 'Thread not found.' });
  res.status(204).end();
});

// ── Messages ─────────────────────────────────────────────────────────────────

router.post('/chat/threads/:id/messages', requireAuth, async (req, res) => {
  const userId = req.session.userId;
  const thread = getThread(req.params.id, userId);
  if (!thread) return res.status(404).json({ error: 'Thread not found.' });

  const { content, attachments } = req.body ?? {};
  if (!content?.trim()) return res.status(400).json({ error: 'content is required.' });

  const now = new Date().toISOString();

  // Persist user message
  addMessage({
    id: uuidv4(),
    threadId: thread.id,
    role: 'user',
    content: content.trim(),
    attachmentsJson: attachments?.length ? JSON.stringify(attachments) : null,
    createdAt: now,
  });

  // Auto-title the thread on its first message
  const existingMessages = getMessages(thread.id, userId);
  if (existingMessages.length === 1) {
    generateThreadTitle(content.trim()).then(title => {
      renameThread(thread.id, userId, title);
    }).catch(() => {});
  }

  // Build message history for Claude (role alternation required)
  const history = existingMessages.map(m => ({ role: m.role, content: m.content }));

  // Stream Claude's response; when done, persist it
  try {
    const assistantText = await streamRappelChat({ history, userId, res });
    const assistantNow = new Date().toISOString();
    addMessage({
      id: uuidv4(),
      threadId: thread.id,
      role: 'assistant',
      content: assistantText,
      createdAt: assistantNow,
    });
    updateThreadTimestamp(thread.id, userId, assistantNow);
  } catch (err) {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Rappel is unavailable. Try again in a moment.' });
    }
    console.error('[chat/messages]', err);
  }
});

export default router;
