import { vi, describe, it, expect, beforeEach } from 'vitest';

// ── Mock all modules that touch the DB or the API ────────────────────────────
// vi.mock calls are hoisted before imports by vitest.

vi.mock('../server/src/services/claude.js', () => ({
  generate: vi.fn(),
  ClaudeError: class ClaudeError extends Error {
    constructor(msg, cause) { super(msg); this.name = 'ClaudeError'; this.cause = cause; }
  },
  getGenerationConfig: vi.fn(() => ({
    model: 'claude-haiku-4-5',
    dailyCap: 5,
    sourceTokenBudget: 50_000,
  })),
}));

vi.mock('../server/src/db/topicMasteryDb.js', () => ({
  listDueForReview: vi.fn(() => []),
}));

vi.mock('../server/src/db/quizzesDb.js', () => ({
  createQuiz: vi.fn(),
}));

vi.mock('../server/src/db/questionsDb.js', () => ({
  bulkCreateQuestions: vi.fn(),
}));

// ── Imports (resolved against the mocked modules above) ──────────────────────
import { generateQuiz, buildUserPrompt, extractJson, validateQuestion } from '../server/src/services/quizGenerator.js';
import { generate } from '../server/src/services/claude.js';
import { listDueForReview } from '../server/src/db/topicMasteryDb.js';
import { bulkCreateQuestions } from '../server/src/db/questionsDb.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeMcq = (topic = 'Photosynthesis') => ({
  type: 'mcq',
  topic,
  prompt: `What is ${topic}?`,
  options: ['A) foo', 'B) bar', 'C) baz', 'D) qux'],
  correct_answer: 'A',
  explanation: 'Because foo.',
  difficulty: 'medium',
});

const makeApiResponse = (questions) => ({
  content: [{ type: 'text', text: JSON.stringify(questions) }],
});

const BASE_CONFIG = {
  userId: 'u1',
  courseId: 'c1',
  unitIds: ['unit1'],
  title: 'Test Quiz',
  questionCount: 3,
  reviewMix: 0,
  types: ['mcq'],
  difficulty: 'medium',
  tier: 'free',
};

const SOURCE = { text: 'Some material about plants.', imageBlocks: [] };

beforeEach(() => {
  vi.clearAllMocks();
});

// ── extractJson ───────────────────────────────────────────────────────────────

describe('extractJson', () => {
  it('parses a bare JSON array', () => {
    expect(extractJson('[{"a":1}]')).toEqual([{ a: 1 }]);
  });

  it('extracts a JSON array embedded in prose', () => {
    const text = 'Here are the questions:\n[{"a":1}]\nEnd.';
    expect(extractJson(text)).toEqual([{ a: 1 }]);
  });

  it('returns null for unparseable text', () => {
    expect(extractJson('not json at all')).toBeNull();
  });
});

// ── validateQuestion ──────────────────────────────────────────────────────────

describe('validateQuestion', () => {
  it('accepts a valid MCQ', () => {
    expect(validateQuestion(makeMcq())).toBe(true);
  });

  it('rejects MCQ missing options', () => {
    expect(validateQuestion({ ...makeMcq(), options: undefined })).toBe(false);
  });

  it('rejects MCQ with wrong option count', () => {
    expect(validateQuestion({ ...makeMcq(), options: ['A) x', 'B) y'] })).toBe(false);
  });

  it('rejects unknown type', () => {
    expect(validateQuestion({ ...makeMcq(), type: 'essay' })).toBe(false);
  });

  it('rejects invalid difficulty', () => {
    expect(validateQuestion({ ...makeMcq(), difficulty: 'extreme' })).toBe(false);
  });

  it('accepts a multi with two correct letters', () => {
    expect(validateQuestion({ ...makeMcq(), type: 'multi', correct_answer: 'A,C' })).toBe(true);
  });

  it('rejects a multi with only one correct letter', () => {
    expect(validateQuestion({ ...makeMcq(), type: 'multi', correct_answer: 'A' })).toBe(false);
  });

  it('rejects a multi with an out-of-range letter', () => {
    expect(validateQuestion({ ...makeMcq(), type: 'multi', correct_answer: 'A,E' })).toBe(false);
  });

  it('accepts a cloze with a blank in the prompt', () => {
    expect(validateQuestion({
      type: 'cloze', topic: 'Cells', prompt: 'The ____ is the powerhouse of the cell.',
      correct_answer: 'mitochondria', explanation: 'It makes ATP.', difficulty: 'easy',
    })).toBe(true);
  });

  it('rejects a cloze with no blank in the prompt', () => {
    expect(validateQuestion({
      type: 'cloze', topic: 'Cells', prompt: 'What is the powerhouse of the cell?',
      correct_answer: 'mitochondria', explanation: 'It makes ATP.', difficulty: 'easy',
    })).toBe(false);
  });
});

// ── buildUserPrompt ───────────────────────────────────────────────────────────

describe('buildUserPrompt', () => {
  it('includes allowed types in the prompt', () => {
    const text = buildUserPrompt({
      questionCount: 5, types: ['mcq', 'short'], difficulty: 'easy',
      reviewTopics: [], newCount: 5, reviewCount: 0, sourceText: 'material',
    });
    expect(text).toContain('mcq');
    expect(text).toContain('short');
  });

  it('does not mention weak topics when reviewTopics is empty', () => {
    const text = buildUserPrompt({
      questionCount: 5, types: ['mcq'], difficulty: 'medium',
      reviewTopics: [], newCount: 5, reviewCount: 0, sourceText: 'material',
    });
    expect(text).not.toContain('weak topics');
    expect(text).not.toContain('review question');
  });

  it('names weak topics in the prompt when present', () => {
    const text = buildUserPrompt({
      questionCount: 5, types: ['mcq'], difficulty: 'medium',
      reviewTopics: [{ topic: 'Cell Division' }],
      newCount: 4, reviewCount: 1, sourceText: 'material',
    });
    expect(text).toContain('Cell Division');
    expect(text).toContain('review question');
  });
});

// ── generateQuiz – format restriction ────────────────────────────────────────

describe('generateQuiz – format restriction', () => {
  it('strips questions whose type is not in the allowed list', async () => {
    const questions = [
      makeMcq('Topic A'),
      { ...makeMcq('Topic B'), type: 'short', rubric: 'check it', correct_answer: 'Answer' },
      makeMcq('Topic C'),
    ];
    vi.mocked(generate).mockResolvedValueOnce(makeApiResponse(questions));

    const result = await generateQuiz({
      config: { ...BASE_CONFIG, types: ['mcq'], questionCount: 3 },
      sourceContext: SOURCE,
      preferences: {},
    });

    // Only MCQ questions should survive; short was filtered
    expect(result.questionCount).toBe(2);
    const saved = vi.mocked(bulkCreateQuestions).mock.calls[0][0];
    expect(saved.every(q => q.type === 'mcq')).toBe(true);
  });
});

// ── generateQuiz – reviewMix fallback ────────────────────────────────────────

describe('generateQuiz – reviewMix fallback', () => {
  it('falls back to all-new when no weak topics are due', async () => {
    // listDueForReview returns [] by default from the mock factory
    vi.mocked(generate).mockResolvedValueOnce(makeApiResponse([makeMcq('Mitosis')]));

    await generateQuiz({
      config: { ...BASE_CONFIG, reviewMix: 0.5, questionCount: 2 },
      sourceContext: SOURCE,
      preferences: {},
    });

    const userMessage = vi.mocked(generate).mock.calls[0][0].messages[0].content;
    // Prompt must not ask for review questions when none are due
    expect(userMessage).not.toContain('review question');

    const saved = vi.mocked(bulkCreateQuestions).mock.calls[0][0];
    expect(saved.every(q => q.is_review === 0)).toBe(true);
  });

  it('marks questions is_review=1 when weak topics are due', async () => {
    vi.mocked(listDueForReview).mockReturnValueOnce([{ topic: 'Mitosis', mastery: 0.1 }]);
    vi.mocked(generate).mockResolvedValueOnce(
      makeApiResponse([makeMcq('Mitosis'), makeMcq('Meiosis')])
    );

    await generateQuiz({
      config: { ...BASE_CONFIG, reviewMix: 0.5, questionCount: 2 },
      sourceContext: SOURCE,
      preferences: {},
    });

    const saved = vi.mocked(bulkCreateQuestions).mock.calls[0][0];
    const reviewQ = saved.find(q => q.topic === 'Mitosis');
    expect(reviewQ.is_review).toBe(1);
    const newQ = saved.find(q => q.topic === 'Meiosis');
    expect(newQ.is_review).toBe(0);
  });
});

// ── generateQuiz – malformed JSON triggers repair ─────────────────────────────

describe('generateQuiz – repair retry', () => {
  it('retries exactly once on malformed JSON and uses the repair response', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'Not JSON at all!' }] })
      .mockResolvedValueOnce(makeApiResponse([makeMcq('Genetics')]));

    const result = await generateQuiz({
      config: { ...BASE_CONFIG, questionCount: 1 },
      sourceContext: SOURCE,
      preferences: {},
    });

    expect(vi.mocked(generate)).toHaveBeenCalledTimes(2);
    expect(result.questionCount).toBe(1);
  });

  it('repair message asks for JSON-only output', async () => {
    vi.mocked(generate)
      .mockResolvedValueOnce({ content: [{ type: 'text', text: 'oops' }] })
      .mockResolvedValueOnce(makeApiResponse([makeMcq('Evolution')]));

    await generateQuiz({
      config: { ...BASE_CONFIG, questionCount: 1 },
      sourceContext: SOURCE,
      preferences: {},
    });

    const secondCallMessages = vi.mocked(generate).mock.calls[1][0].messages;
    const repairMsg = secondCallMessages[secondCallMessages.length - 1];
    expect(repairMsg.role).toBe('user');
    expect(repairMsg.content).toMatch(/JSON/);
  });
});
