import db from './index.js';

const stmts = {
  // ── Decks ──────────────────────────────────────────────────────────────────
  insertDeck: db.prepare(
    `INSERT INTO flashcard_decks (id, user_id, unit_id, name, created_at, updated_at)
     VALUES (@id, @user_id, @unit_id, @name, @created_at, @updated_at)`
  ),
  getDeck: db.prepare(
    `SELECT * FROM flashcard_decks WHERE id = ? AND user_id = ?`
  ),
  listDecksForUnit: db.prepare(
    `SELECT * FROM flashcard_decks WHERE unit_id = ? AND user_id = ? ORDER BY created_at DESC`
  ),
  // Every deck for a user, with course/unit context and card count — for the
  // Games-hub Match It deck picker (no single unit in scope there).
  listDecksForUser: db.prepare(
    `SELECT d.id, d.name, d.unit_id,
            u.name AS unit_name,
            c.id   AS course_id,
            c.name AS course_name,
            (SELECT COUNT(*) FROM flashcards f WHERE f.deck_id = d.id) AS card_count
     FROM flashcard_decks d
     JOIN units   u ON u.id = d.unit_id
     JOIN courses c ON c.id = u.course_id
     WHERE d.user_id = ?
     ORDER BY c.name, u.name, d.created_at DESC`
  ),
  deleteDeck: db.prepare(
    `DELETE FROM flashcard_decks WHERE id = ? AND user_id = ?`
  ),

  // ── Cards ──────────────────────────────────────────────────────────────────
  insertCard: db.prepare(
    `INSERT INTO flashcards
       (id, deck_id, user_id, front, back, topic, ease, interval_days, repetitions, due_at, created_at)
     VALUES
       (@id, @deck_id, @user_id, @front, @back, @topic, @ease, @interval_days, @repetitions, @due_at, @created_at)`
  ),
  updateCard: db.prepare(
    `UPDATE flashcards
     SET front = @front, back = @back, topic = @topic,
         ease = @ease, interval_days = @interval_days, repetitions = @repetitions,
         due_at = @due_at, last_reviewed_at = @last_reviewed_at
     WHERE id = @id AND user_id = @user_id`
  ),
  editCard: db.prepare(
    `UPDATE flashcards SET front = ?, back = ?, topic = ? WHERE id = ? AND user_id = ?`
  ),
  deleteCard: db.prepare(
    `DELETE FROM flashcards WHERE id = ? AND user_id = ?`
  ),
  getCard: db.prepare(
    `SELECT f.* FROM flashcards f
     JOIN flashcard_decks d ON d.id = f.deck_id
     WHERE f.id = ? AND f.user_id = ?`
  ),
  getCardsForDeck: db.prepare(
    `SELECT f.* FROM flashcards f
     JOIN flashcard_decks d ON d.id = f.deck_id
     WHERE f.deck_id = ? AND d.user_id = ?
     ORDER BY f.created_at`
  ),
  getDueCards: db.prepare(
    `SELECT f.* FROM flashcards f
     JOIN flashcard_decks d ON d.id = f.deck_id
     WHERE f.deck_id = ? AND d.user_id = ? AND f.due_at <= ?
     ORDER BY f.due_at
     LIMIT ?`
  ),
  getDueCardsAllDecks: db.prepare(
    `SELECT f.* FROM flashcards f
     JOIN flashcard_decks d ON d.id = f.deck_id
     WHERE f.user_id = ? AND f.due_at <= ?
     ORDER BY f.due_at
     LIMIT ?`
  ),
  countCards: db.prepare(
    `SELECT
       COUNT(*)                                  AS total,
       SUM(CASE WHEN due_at <= ? THEN 1 ELSE 0 END) AS due,
       SUM(CASE WHEN repetitions = 0 THEN 1 ELSE 0 END) AS new
     FROM flashcards WHERE deck_id = ?`
  ),
  countReviews: db.prepare(
    `SELECT COALESCE(SUM(repetitions), 0) AS n FROM flashcards WHERE user_id = ?`
  ),
  listReviews: db.prepare(
    `SELECT f.front, f.back, f.topic, f.ease, f.interval_days, f.repetitions, f.due_at, f.last_reviewed_at,
            fd.name AS deck
     FROM flashcards f
     JOIN flashcard_decks fd ON fd.id = f.deck_id
     WHERE f.user_id = ?
     ORDER BY f.last_reviewed_at DESC NULLS LAST`
  ),
};

// ── Decks ────────────────────────────────────────────────────────────────────

export function createDeck({ id, userId, unitId, name, now }) {
  stmts.insertDeck.run({ id, user_id: userId, unit_id: unitId, name, created_at: now, updated_at: now });
  return stmts.getDeck.get(id, userId);
}

export function getDeck(id, userId) {
  return stmts.getDeck.get(id, userId) ?? null;
}

export function listDecksForUnit(unitId, userId) {
  return stmts.listDecksForUnit.all(unitId, userId);
}

export function listDecksForUser(userId) {
  return stmts.listDecksForUser.all(userId);
}

export function deleteDeck(id, userId) {
  return stmts.deleteDeck.run(id, userId).changes > 0;
}

// ── Cards ────────────────────────────────────────────────────────────────────

export function createCard(card) {
  stmts.insertCard.run(card);
}

export function updateCard(card) {
  stmts.updateCard.run(card);
}

export function editCardFields(id, userId, { front, back, topic }) {
  return stmts.editCard.run(front, back, topic, id, userId).changes > 0;
}

export function deleteCard(id, userId) {
  return stmts.deleteCard.run(id, userId).changes > 0;
}

export function getCard(id, userId) {
  return stmts.getCard.get(id, userId) ?? null;
}

export function getCardsForDeck(deckId, userId) {
  return stmts.getCardsForDeck.all(deckId, userId);
}

export function getDueCards(userId, { deckId } = {}, limit = 30) {
  const now = new Date().toISOString();
  if (deckId) return stmts.getDueCards.all(deckId, userId, now, limit);
  return stmts.getDueCardsAllDecks.all(userId, now, limit);
}

export function getCardCounts(deckId) {
  const now = new Date().toISOString();
  const row = stmts.countCards.get(now, deckId);
  return { total: row.total ?? 0, due: row.due ?? 0, new: row.new ?? 0 };
}

export function countCardReviewsByUser(userId) {
  return stmts.countReviews.get(userId).n;
}

export function listFlashcardReviewsByUser(userId) {
  return stmts.listReviews.all(userId);
}
