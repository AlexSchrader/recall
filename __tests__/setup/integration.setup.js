// Global test setup — runs before every test file (vitest `setupFiles`).
//
// Two jobs:
//  1. Force a fresh in-memory SQLite DB and safe env BEFORE any app/db import.
//  2. Mock every external-API boundary so no test reaches Anthropic, ElevenLabs,
//     Resend, or Wikipedia. Mocks are registered here so all integration test
//     files share one definition; the existing pure-unit tests are unaffected
//     because they never call the mocked functions.
import { vi, afterAll } from 'vitest';

// ── Environment (must be set before db/index.js or services/claude.js load) ──
// vitest already sets NODE_ENV=test (which makes index.js skip app.listen()).
process.env.DATABASE_PATH   = ':memory:';
process.env.SESSION_SECRET  = 'test-secret';
process.env.VOICE_PIN       = '1234';
process.env.ANTHROPIC_API_KEY = 'test-key';
// Intentionally leave ELEVENLABS_API_KEY / RESEND_API_KEY unset so any
// accidentally-unmocked call fails closed (503) instead of reaching the network.
delete process.env.ELEVENLABS_API_KEY;
delete process.env.ADMIN_USER_IDS;

// ── Deterministic model output, keyed by the call's _meta.feature ──
// Includes one valid question of every type so a quiz request for any subset of
// types still yields questions after the generator filters to requested types.
export const MOCK_QUIZ_QUESTIONS = [
  { type: 'mcq',        topic: 'Mock MCQ',   prompt: 'What is 2+2?', options: ['A) 3', 'B) 4', 'C) 5', 'D) 6'], correct_answer: 'B', explanation: 'Two plus two is four.', difficulty: 'easy' },
  { type: 'short',      topic: 'Mock Short', prompt: 'Define a cell.', correct_answer: 'the basic unit of life', rubric: 'Credit the core idea.', explanation: 'A cell is the basic unit of life.', difficulty: 'medium' },
  { type: 'true_false', topic: 'Mock TF',    prompt: 'The sky is blue.', correct_answer: 'True', explanation: 'It scatters blue light.', difficulty: 'easy' },
  { type: 'multi',      topic: 'Mock Multi', prompt: 'Select all primes.', options: ['A) 2', 'B) 4', 'C) 3', 'D) 9'], correct_answer: 'A,C', explanation: '2 and 3 are prime.', difficulty: 'hard' },
  { type: 'cloze',      topic: 'Mock Cloze', prompt: 'The ____ is the powerhouse of the cell.', correct_answer: 'mitochondria', explanation: 'It produces ATP.', difficulty: 'medium' },
];

export const MOCK_FLASHCARDS = [
  { front: 'What is a cell?', back: 'The basic unit of life.', topic: 'Cells' },
  { front: 'What is ATP?',    back: 'The energy currency of the cell.', topic: 'Energy' },
  { front: 'What is DNA?',    back: 'The molecule that stores genetic information.', topic: 'Genetics' },
  { front: 'What is a gene?', back: 'A unit of heredity.', topic: 'Genetics' },
];

// Mock claude.js: keep getGenerationConfig / GRADING_MODEL / ClaudeError real,
// override generate() to return deterministic content per feature.
vi.mock('../../server/src/services/claude.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    generate: vi.fn(async ({ _meta }) => {
      const feature = _meta?.feature;
      let text;
      switch (feature) {
        case 'quiz_gen':        text = JSON.stringify(MOCK_QUIZ_QUESTIONS); break;
        case 'flashcard_gen':   text = JSON.stringify(MOCK_FLASHCARDS);     break;
        case 'grading':         text = 'correct';                           break;
        case 'study_guide_gen': text = '# Study Guide\n\nMock study guide content.'; break;
        default:                text = 'ok';
      }
      return { content: [{ type: 'text', text }], usage: { input_tokens: 1, output_tokens: 1 } };
    }),
  };
});

// Mock rappel.js: chat goes through the Anthropic client directly (not generate),
// so it needs its own boundary. streamRappelChat writes a minimal SSE response.
vi.mock('../../server/src/services/rappel.js', () => ({
  generateThreadTitle: vi.fn(async () => 'Mock Thread Title'),
  streamRappelChat: vi.fn(async ({ res }) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write(`data: ${JSON.stringify({ text: 'Bonjour! ' })}\n\n`);
    res.write(`data: ${JSON.stringify({ text: 'Mock reply.' })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return 'Bonjour! Mock reply.';
  }),
}));

// Mock Wikipedia + email so quiz generation and feedback/reset never hit the network.
vi.mock('../../server/src/services/wikipedia.js', () => ({
  fetchWikiSummary: vi.fn(async () => null),
}));
vi.mock('../../server/src/services/email.js', () => ({
  sendFeedback: vi.fn(async () => {}),
  sendPasswordReset: vi.fn(async () => {}),
}));

// Close the better-sqlite3 handle at end of each test file so its native
// finalizer runs cleanly instead of segfaulting during worker teardown.
// Dynamic import (not a static one) so it resolves the singleton AFTER the env
// above has pointed it at the in-memory DB.
afterAll(async () => {
  try {
    const { default: db } = await import('../../server/src/db/index.js');
    db.close();
  } catch { /* already closed or never opened */ }
});
