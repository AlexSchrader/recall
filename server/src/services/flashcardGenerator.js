import { v4 as uuidv4 } from 'uuid';
import { generate, getGenerationConfig } from './claude.js';
import { getUserById } from '../db/usersDb.js';
import { getUnitById } from '../db/unitsDb.js';
import { buildSourceContext } from '../ingestion/sourceContext.js';
import { createDeck, createCard } from '../db/flashcardsDb.js';
import { countTodayByUser } from '../db/quizzesDb.js';
import db from '../db/index.js';

const countTodayDecks = db.prepare(
  `SELECT COUNT(*) AS count FROM flashcard_decks WHERE user_id = ? AND created_at >= ?`
);

function todayUtc() {
  return new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
}

function buildPrompt(sourceText, count, unitName) {
  return `You are generating flashcards for a student studying "${unitName}".

Create exactly ${count} flashcards from the source material below. Return ONLY a valid JSON array — no prose, no markdown fences.

Rules:
- Each card covers ONE tight concept. Front: a term, question, or prompt. Back: the answer in 1–2 sentences.
- Cover the material broadly — spread cards across the full unit, not just the opening pages.
- topic: a concise 2–4 word tag (e.g. "Cell Division", "Supply & Demand"). Must match the style used for quiz topics.
- No duplicate fronts within this deck.
- Return ONLY valid JSON. Schema: [{ "front": string, "back": string, "topic": string }, ...]

Source material:
${sourceText}`;
}

function parseCards(raw) {
  const text = raw.trim().replace(/^```(?:json)?|```$/gm, '').trim();
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array');
  return parsed.filter(c => c.front?.trim() && c.back?.trim() && c.topic?.trim());
}

export async function generateDeck({ userId, unitId, count = 20 }) {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found.');

  const unit = getUnitById(unitId);
  if (!unit) throw new Error('Unit not found.');

  const { generationModel, dailyCap, sourceTokenBudget } = getGenerationConfig(user.tier);

  // Shared daily cap: quizzes + flashcard decks combined
  const quizCount = countTodayByUser(userId);
  const deckCount = countTodayDecks.get(userId, todayUtc()).count;
  if (quizCount + deckCount >= dailyCap) {
    throw Object.assign(new Error(`Daily generation limit of ${dailyCap} reached. Try again tomorrow.`), { status: 429 });
  }

  const sourceContext = buildSourceContext([unitId], sourceTokenBudget);
  if (!sourceContext.text?.trim()) {
    throw new Error('No source material found for this unit. Upload documents first.');
  }

  const systemPrompt = 'You generate flashcard JSON for a study app. Return only valid JSON — no other text.';
  const userPrompt = buildPrompt(sourceContext.text, count, unit.name);

  const meta = { userId, feature: 'flashcard_gen' };
  const response = await generate({
    model: generationModel,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 4096,
    _meta: meta,
  });

  let cards;
  try {
    cards = parseCards(response.content[0]?.text ?? '');
  } catch {
    // One repair retry
    const repair = await generate({
      model: generationModel,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: response.content[0]?.text ?? '' },
        { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON array, nothing else.' },
      ],
      maxTokens: 4096,
      _meta: meta,
    });
    cards = parseCards(repair.content[0]?.text ?? '');
  }

  // Trim/pad to requested count
  cards = cards.slice(0, count);

  const now = new Date().toISOString();
  const deck = createDeck({ id: uuidv4(), userId, unitId, name: unit.name, now });

  for (const card of cards) {
    createCard({
      id: uuidv4(),
      deck_id: deck.id,
      user_id: userId,
      front: card.front.trim(),
      back: card.back.trim(),
      topic: card.topic.trim(),
      ease: 2.5,
      interval_days: 0,
      repetitions: 0,
      due_at: now,
      created_at: now,
    });
  }

  return { deckId: deck.id, cardCount: cards.length, model: generationModel };
}
