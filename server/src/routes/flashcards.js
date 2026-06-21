import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getUnitById } from '../db/unitsDb.js';
import { getCourseById } from '../db/coursesDb.js';
import { generateDeck } from '../services/flashcardGenerator.js';
import { reviewCard } from '../services/flashcardReview.js';
import {
  getDeck, listDecksForUnit, deleteDeck,
  getCardsForDeck, getDueCards, getCardCounts,
  editCardFields, deleteCard, getCard,
} from '../db/flashcardsDb.js';

const router = Router();

function ownsUnit(unitId, userId) {
  const unit = getUnitById(unitId);
  if (!unit) return null;
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== userId) return null;
  return unit;
}

// ── Generation ────────────────────────────────────────────────────────────────

router.post('/units/:unitId/flashcards/generate', requireAuth, async (req, res) => {
  if (!ownsUnit(req.params.unitId, req.session.userId)) {
    return res.status(404).json({ error: 'Unit not found.' });
  }
  const count = Math.min(50, Math.max(5, Number(req.body?.count) || 20));
  try {
    const result = await generateDeck({ userId: req.session.userId, unitId: req.params.unitId, count });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ── Decks ─────────────────────────────────────────────────────────────────────

router.get('/units/:unitId/flashcards/decks', requireAuth, (req, res) => {
  if (!ownsUnit(req.params.unitId, req.session.userId)) {
    return res.status(404).json({ error: 'Unit not found.' });
  }
  const decks = listDecksForUnit(req.params.unitId, req.session.userId);
  res.json(decks.map(d => ({ ...d, ...getCardCounts(d.id) })));
});

router.get('/flashcards/decks/:deckId', requireAuth, (req, res) => {
  const deck = getDeck(req.params.deckId, req.session.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });
  res.json({ ...deck, ...getCardCounts(deck.id) });
});

router.delete('/flashcards/decks/:deckId', requireAuth, (req, res) => {
  const ok = deleteDeck(req.params.deckId, req.session.userId);
  if (!ok) return res.status(404).json({ error: 'Deck not found.' });
  res.status(204).end();
});

// ── Cards ─────────────────────────────────────────────────────────────────────

router.get('/flashcards/decks/:deckId/cards', requireAuth, (req, res) => {
  const deck = getDeck(req.params.deckId, req.session.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });
  res.json(getCardsForDeck(deck.id, req.session.userId));
});

router.get('/flashcards/decks/:deckId/due', requireAuth, (req, res) => {
  const deck = getDeck(req.params.deckId, req.session.userId);
  if (!deck) return res.status(404).json({ error: 'Deck not found.' });
  const limit = Math.min(50, Number(req.query.limit) || 30);
  res.json(getDueCards(req.session.userId, { deckId: deck.id }, limit));
});

router.post('/flashcards/cards/:cardId/review', requireAuth, async (req, res) => {
  try {
    const updated = await reviewCard({ userId: req.session.userId, cardId: req.params.cardId, rating: req.body?.rating });
    res.json(updated);
  } catch (err) {
    res.status(err.status ?? 400).json({ error: err.message });
  }
});

router.patch('/flashcards/cards/:cardId', requireAuth, (req, res) => {
  const { front, back, topic } = req.body ?? {};
  if (!front?.trim() || !back?.trim() || !topic?.trim()) {
    return res.status(400).json({ error: 'front, back, and topic are required.' });
  }
  const card = getCard(req.params.cardId, req.session.userId);
  if (!card) return res.status(404).json({ error: 'Card not found.' });
  editCardFields(req.params.cardId, req.session.userId, { front: front.trim(), back: back.trim(), topic: topic.trim() });
  res.json({ ...card, front: front.trim(), back: back.trim(), topic: topic.trim() });
});

router.delete('/flashcards/cards/:cardId', requireAuth, (req, res) => {
  if (!deleteCard(req.params.cardId, req.session.userId)) {
    return res.status(404).json({ error: 'Card not found.' });
  }
  res.status(204).end();
});

export default router;
