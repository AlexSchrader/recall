// Flashcard deck + card scoping. flashcards.js already had the ownsUnit pattern;
// these lock it in as regressions.
import { describe, it, expect } from 'vitest';
import {
  createTestUser, createCourseFor, createUnitFor, createDocumentFor,
  seedCourseUnitDoc, createDeckFor, anonAgent,
} from '../helpers/seed.js';

describe('flashcards — auth', () => {
  it('rejects unauthenticated access with 401', async () => {
    const anon = anonAgent();
    expect((await anon.post('/api/units/x/flashcards/generate').send({})).status).toBe(401);
    expect((await anon.get('/api/units/x/flashcards/decks')).status).toBe(401);
    expect((await anon.get('/api/flashcards/decks/x')).status).toBe(401);
    expect((await anon.get('/api/flashcards/decks/x/cards')).status).toBe(401);
    expect((await anon.get('/api/flashcards/due')).status).toBe(401);
    expect((await anon.delete('/api/flashcards/decks/x')).status).toBe(401);
  });
});

describe('flashcards — happy path (owner)', () => {
  it('owner can generate, list, read, review, edit and delete their own deck/cards', async () => {
    const { agent } = await createTestUser({ tier: 'pro' });
    const { unit } = await seedCourseUnitDoc(agent);

    const { deckId } = await createDeckFor(agent, unit.id);
    expect(deckId).toBeTruthy();

    expect((await agent.get(`/api/units/${unit.id}/flashcards/decks`)).status).toBe(200);
    expect((await agent.get(`/api/flashcards/decks/${deckId}`)).status).toBe(200);

    const cards = await agent.get(`/api/flashcards/decks/${deckId}/cards`);
    expect(cards.status).toBe(200);
    expect(cards.body.length).toBeGreaterThan(0);
    const cardId = cards.body[0].id;

    expect((await agent.post(`/api/flashcards/cards/${cardId}/review`).send({ rating: 'good' })).status).toBe(200);
    expect((await agent.patch(`/api/flashcards/cards/${cardId}`).send({ front: 'F', back: 'B', topic: 'T' })).status).toBe(200);
    expect((await agent.get('/api/flashcards/due')).status).toBe(200);
    expect((await agent.delete(`/api/flashcards/cards/${cardId}`)).status).toBe(204);
    expect((await agent.delete(`/api/flashcards/decks/${deckId}`)).status).toBe(204);
  });
});

describe('flashcards — cross-user denial', () => {
  it("user B cannot touch user A's units, decks or cards", async () => {
    const { agent: a } = await createTestUser({ displayName: 'FC Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'FC Bob', tier: 'pro' });

    const courseA = await createCourseFor(a);
    const unitA = await createUnitFor(a, courseA.id);
    await createDocumentFor(a, unitA.id);
    const { deckId } = await createDeckFor(a, unitA.id);
    const cardId = (await a.get(`/api/flashcards/decks/${deckId}/cards`)).body[0].id;

    // Unit-scoped
    expect((await b.post(`/api/units/${unitA.id}/flashcards/generate`).send({ count: 4 })).status).toBe(404);
    expect((await b.get(`/api/units/${unitA.id}/flashcards/decks`)).status).toBe(404);

    // Deck-scoped
    expect((await b.get(`/api/flashcards/decks/${deckId}`)).status).toBe(404);
    expect((await b.get(`/api/flashcards/decks/${deckId}/cards`)).status).toBe(404);
    expect((await b.post(`/api/flashcards/decks/${deckId}/regenerate`).send({})).status).toBe(404);
    expect((await b.delete(`/api/flashcards/decks/${deckId}`)).status).toBe(404);

    // Card-scoped
    expect((await b.post(`/api/flashcards/cards/${cardId}/review`).send({ rating: 'good' })).status).toBe(404);
    expect((await b.patch(`/api/flashcards/cards/${cardId}`).send({ front: 'x', back: 'y', topic: 'z' })).status).toBe(404);
    expect((await b.delete(`/api/flashcards/cards/${cardId}`)).status).toBe(404);

    // A's deck still intact
    expect((await a.get(`/api/flashcards/decks/${deckId}`)).status).toBe(200);
  });

  it("user B's daily-due never includes user A's cards", async () => {
    const { agent: a } = await createTestUser({ displayName: 'Due Alice', tier: 'pro' });
    const { agent: b } = await createTestUser({ displayName: 'Due Bob', tier: 'pro' });
    const { unit } = await seedCourseUnitDoc(a);
    await createDeckFor(a, unit.id);

    const due = await b.get('/api/flashcards/due');
    expect(due.status).toBe(200);
    expect(due.body).toEqual([]); // B owns no cards
  });
});
