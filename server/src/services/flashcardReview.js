import { v4 as uuidv4 } from 'uuid';
import { getCard, updateCard } from '../db/flashcardsDb.js';
import { getDeck } from '../db/flashcardsDb.js';
import { getMastery, upsertMastery } from '../db/topicMasteryDb.js';
import { getUnitById } from '../db/unitsDb.js';

const ALPHA = 0.2; // EMA smoothing factor

const RATING_TARGETS = { again: 0, hard: 0.5, good: 1, easy: 1 };

function emaToward(current, target) {
  return Math.max(0, Math.min(1, ALPHA * target + (1 - ALPHA) * current));
}

function schedule(card, rating) {
  let { ease, interval_days, repetitions } = card;

  switch (rating) {
    case 'again':
      repetitions = 0;
      interval_days = 0;
      ease = Math.max(1.3, ease - 0.20);
      break;
    case 'hard':
      interval_days = Math.max(1, Math.round(interval_days * 1.2));
      ease = Math.max(1.3, ease - 0.15);
      // repetitions stays the same
      break;
    case 'good':
      repetitions += 1;
      if (repetitions === 1) interval_days = 1;
      else if (repetitions === 2) interval_days = 6;
      else interval_days = Math.round(interval_days * ease);
      break;
    case 'easy':
      repetitions += 1;
      if (repetitions === 1) interval_days = 1;
      else if (repetitions === 2) interval_days = 6;
      else interval_days = Math.round(interval_days * ease);
      interval_days = Math.round(interval_days * 1.3);
      ease = Math.min(4.0, ease + 0.15);
      break;
  }

  const due_at = interval_days === 0
    ? new Date().toISOString()
    : new Date(Date.now() + interval_days * 86_400_000).toISOString();

  return { ease, interval_days, repetitions, due_at };
}

export async function reviewCard({ userId, cardId, rating }) {
  if (!['again', 'hard', 'good', 'easy'].includes(rating)) {
    throw new Error('rating must be again | hard | good | easy');
  }

  const card = getCard(cardId, userId);
  if (!card) throw Object.assign(new Error('Card not found.'), { status: 404 });

  const deck = getDeck(card.deck_id, userId);
  if (!deck) throw Object.assign(new Error('Deck not found.'), { status: 404 });

  const { ease, interval_days, repetitions, due_at } = schedule(card, rating);
  const now = new Date().toISOString();

  updateCard({
    id: cardId,
    user_id: userId,
    front: card.front,
    back: card.back,
    topic: card.topic,
    ease,
    interval_days,
    repetitions,
    due_at,
    last_reviewed_at: now,
  });

  // Update shared topic mastery so flashcard reviews feed the same system as quizzes
  const unit = getUnitById(deck.unit_id);
  if (unit) {
    const existing = getMastery(userId, unit.course_id, card.topic);
    const currentMastery = existing?.mastery ?? 0;
    const newMastery = emaToward(currentMastery, RATING_TARGETS[rating]);

    upsertMastery({
      id: existing?.id ?? uuidv4(),
      user_id: userId,
      course_id: unit.course_id,
      topic: card.topic,
      ease,
      interval_days,
      repetitions,
      mastery: newMastery,
      due_at,
      last_seen_at: now,
    });
  }

  return { ...card, ease, interval_days, repetitions, due_at, last_reviewed_at: now };
}
