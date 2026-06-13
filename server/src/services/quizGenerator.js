import { v4 as uuidv4 } from 'uuid';
import { generate, getGenerationConfig } from './claude.js';
import { listDueForReview } from '../db/topicMasteryDb.js';
import { createQuiz } from '../db/quizzesDb.js';
import { bulkCreateQuestions } from '../db/questionsDb.js';

const VALID_TYPES = new Set(['mcq', 'short', 'true_false']);
const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard']);

export class GenerationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GenerationError';
  }
}

// ── Prompt builders (exported for testing) ───────────────────────────────────

export function buildSystemPrompt() {
  return `You are an expert educator creating practice quiz questions from provided study material.

Generate the requested number of questions and return them as a JSON array.
Output ONLY the JSON array — no prose, no markdown fences, no other text.

Each element must conform to this schema:
{
  "type": "mcq" | "short" | "true_false",
  "topic": "<concise label, 3–6 words>",
  "prompt": "<the question text>",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correct_answer": "<A|B|C|D for mcq | True|False for true_false | brief phrase for short>",
  "rubric": "<grading guidance, 1–2 sentences>",
  "explanation": "<why the answer is correct, 1–2 sentences>",
  "source_ref": "<relevant section or heading>",
  "difficulty": "easy" | "medium" | "hard"
}

Rules:
- "options" is required for mcq (exactly 4 items prefixed A) B) C) D)); omit for all other types.
- "rubric" is required for short answer; omit for all other types.
- "explanation" is required on every question.
- Base every question strictly on the provided source material; introduce no outside facts.
- "source_ref" is optional but encouraged.`;
}

export function buildUserPrompt({ questionCount, types, difficulty, reviewTopics, newCount, reviewCount, sourceText }) {
  const typeStr = types.join(', ');
  const diffStr = difficulty === 'mixed'
    ? 'distribute evenly across easy, medium, and hard'
    : difficulty;

  const lines = [
    `Generate ${questionCount} questions.`,
    '',
    'Configuration:',
    `- Allowed question types: ${typeStr}`,
    `- Difficulty: ${diffStr}`,
  ];

  if (reviewTopics.length > 0) {
    lines.push(
      `- Create exactly ${reviewCount} review question${reviewCount !== 1 ? 's' : ''} targeting these weak topics` +
      ` (one question per topic where possible): ${reviewTopics.map(t => t.topic).join(', ')}`
    );
    lines.push(
      `- Create exactly ${newCount} new question${newCount !== 1 ? 's' : ''} covering fresh material` +
      ` not already addressed by the weak topics above.`
    );
  }

  lines.push('', 'Source material:', '---', sourceText, '---');
  return lines.join('\n');
}

// ── Parsing and validation ────────────────────────────────────────────────────

export function extractJson(text) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {}
  const match = trimmed.match(/\[[\s\S]*\]/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

export function validateQuestion(q) {
  if (!q || typeof q !== 'object') return false;
  if (!VALID_TYPES.has(q.type)) return false;
  if (!q.topic?.trim() || !q.prompt?.trim()) return false;
  if (!q.correct_answer?.trim() || !q.explanation?.trim()) return false;
  if (!VALID_DIFFICULTIES.has(q.difficulty)) return false;
  if (q.type === 'mcq' && (!Array.isArray(q.options) || q.options.length !== 4)) return false;
  return true;
}

// ── Main entry point ──────────────────────────────────────────────────────────

/**
 * @param {object} config   - GenerateQuizConfig from the route (includes .tier)
 * @param {object} sourceContext - { text, imageBlocks } pre-resolved by the route
 * @param {object} preferences  - user prefs pre-resolved by the route
 */
export async function generateQuiz({ config, sourceContext, preferences }) {
  const {
    userId, courseId, unitIds, title,
    questionCount, reviewMix, types, difficulty, tier = 'free',
  } = config;

  const { model } = getGenerationConfig(tier);

  // ── Compute new vs. review split ─────────────────────────────────────────
  const wantedReview = Math.round(questionCount * (reviewMix ?? 0));
  let reviewTopics = [];
  if (wantedReview > 0) {
    reviewTopics = listDueForReview(userId, wantedReview);
  }
  // If no weak topics are due, fall back to all-new questions.
  const reviewCount = reviewTopics.length > 0 ? Math.min(wantedReview, reviewTopics.length) : 0;
  const newCount = questionCount - reviewCount;

  // ── Build prompts ─────────────────────────────────────────────────────────
  const system = buildSystemPrompt();
  const userText = buildUserPrompt({
    questionCount, types, difficulty,
    reviewTopics, newCount, reviewCount,
    sourceText: sourceContext.text,
  });

  const userContent = sourceContext.imageBlocks.length > 0
    ? [{ type: 'text', text: userText }, ...sourceContext.imageBlocks]
    : userText;

  const messages = [{ role: 'user', content: userContent }];

  // ── First generation attempt ──────────────────────────────────────────────
  const firstResponse = await generate({ model, system, messages, maxTokens: 4096 });
  const firstText = firstResponse.content[0]?.text ?? '';
  let parsed = extractJson(firstText);

  // ── One repair retry on malformed output ─────────────────────────────────
  if (parsed === null) {
    const repairMessages = [
      ...messages,
      { role: 'assistant', content: firstText },
      { role: 'user', content: 'Your response was not valid JSON. Return ONLY the JSON array, nothing else.' },
    ];
    const repairResponse = await generate({ model, system, messages: repairMessages, maxTokens: 4096 });
    const repairText = repairResponse.content[0]?.text ?? '';
    parsed = extractJson(repairText);
  }

  // ── Validate, filter to allowed types, dedupe topics ─────────────────────
  const raw = (Array.isArray(parsed) ? parsed : [])
    .filter(validateQuestion)
    .filter(q => types.includes(q.type));   // enforce format restriction

  const reviewTopicLookup = new Set(reviewTopics.map(t => t.topic.toLowerCase()));
  const seenTopics = new Set();

  const reviewQs = [];
  const newQs = [];

  for (const q of raw) {
    const key = q.topic.toLowerCase();
    const isReview = reviewTopicLookup.has(key) ? 1 : 0;
    if (isReview) {
      if (!seenTopics.has(key)) { seenTopics.add(key); reviewQs.push({ ...q, is_review: 1 }); }
    } else {
      if (!seenTopics.has(key)) { seenTopics.add(key); newQs.push({ ...q, is_review: 0 }); }
    }
  }

  const finalQuestions = [...reviewQs, ...newQs].slice(0, questionCount);

  if (finalQuestions.length === 0) {
    throw new GenerationError('No valid questions could be extracted from the model response.');
  }

  // ── Persist quiz + questions ──────────────────────────────────────────────
  const quizId = uuidv4();
  const now = new Date().toISOString();

  createQuiz({
    id: quizId,
    user_id: userId,
    title,
    source_unit_ids: JSON.stringify(unitIds),
    config_json: JSON.stringify(config),
    status: 'generated',
    model,
    created_at: now,
  });

  bulkCreateQuestions(
    finalQuestions.map((q, i) => ({
      id: uuidv4(),
      quiz_id: quizId,
      position: i,
      type: q.type,
      topic: q.topic,
      prompt: q.prompt,
      options_json: q.options ? JSON.stringify(q.options) : null,
      correct_answer: q.correct_answer,
      rubric: q.rubric ?? null,
      explanation: q.explanation,
      source_ref: q.source_ref ?? null,
      difficulty: q.difficulty,
      is_review: q.is_review,
    }))
  );

  return { quizId, questionCount: finalQuestions.length };
}
