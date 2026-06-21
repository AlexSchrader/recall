import { v4 as uuidv4 } from 'uuid';
import { generate, getGenerationConfig } from './claude.js';
import { getUserById } from '../db/usersDb.js';
import { getUnitById } from '../db/unitsDb.js';
import { buildSourceContext } from '../ingestion/sourceContext.js';
import { countTodayByUser } from '../db/quizzesDb.js';
import db from '../db/index.js';

const countTodayDecks = db.prepare(
  `SELECT COUNT(*) AS count FROM flashcard_decks WHERE user_id = ? AND created_at >= ?`
);
const countTodayGuides = db.prepare(
  `SELECT COUNT(*) AS count FROM study_guides WHERE user_id = ? AND created_at >= ?`
);
const upsertGuide = db.prepare(`
  INSERT INTO study_guides (id, user_id, unit_id, content, model, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id, unit_id) DO UPDATE SET
    content    = excluded.content,
    model      = excluded.model,
    created_at = excluded.created_at
`);
const findGuide = db.prepare(
  `SELECT * FROM study_guides WHERE user_id = ? AND unit_id = ?`
);

function todayUtc() {
  return new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z';
}

function buildPrompt(sourceText, unitName) {
  return `Create a comprehensive study guide for a student studying "${unitName}".

Write in clear markdown with these sections (use these exact headings):
# ${unitName} — Study Guide
## Overview
## Key Concepts
## Definitions
## Core Ideas Explained
## Quick Review

Rules:
- Overview: 2-3 sentences giving the big picture.
- Key Concepts: bullet list of 5-10 most important ideas (one line each).
- Definitions: "**term** — definition" format, most important vocabulary.
- Core Ideas Explained: 2-4 short paragraphs on the hardest/most important ideas.
- Quick Review: 5-8 bullet points — perfect for a scan right before an exam.
- Plain language. Define jargon before using it. Every sentence teaches something.
- Return ONLY the markdown. No preamble or "Here is your study guide".

Source material:
${sourceText}`;
}

export async function generateStudyGuide({ userId, unitId }) {
  const user = getUserById(userId);
  if (!user) throw new Error('User not found.');

  const unit = getUnitById(unitId);
  if (!unit) throw new Error('Unit not found.');

  const { generationModel, dailyCap, sourceTokenBudget } = getGenerationConfig(user.tier);

  const today = todayUtc();
  const total = countTodayByUser(userId)
    + countTodayDecks.get(userId, today).count
    + countTodayGuides.get(userId, today).count;
  if (total >= dailyCap) {
    throw Object.assign(
      new Error(`Daily generation limit of ${dailyCap} reached. Try again tomorrow.`),
      { status: 429 }
    );
  }

  const sourceContext = buildSourceContext([unitId], sourceTokenBudget);
  if (!sourceContext.text?.trim()) {
    throw new Error('No source material found for this unit. Upload documents first.');
  }

  const response = await generate({
    model: generationModel,
    system: 'You write structured study guides in markdown for a learning app.',
    messages: [{ role: 'user', content: buildPrompt(sourceContext.text, unit.name) }],
    maxTokens: 4096,
  });

  const content = response.content[0]?.text?.trim() ?? '';
  if (!content) throw new Error('Model returned an empty study guide.');

  const now = new Date().toISOString();
  upsertGuide.run(uuidv4(), userId, unitId, content, generationModel, now);

  return { content, model: generationModel, createdAt: now };
}

export function getStudyGuide(userId, unitId) {
  return findGuide.get(userId, unitId) ?? null;
}
