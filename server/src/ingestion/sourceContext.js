import { listFullDocumentsByUnit } from '../db/documentsDb.js';

// Tokens reserved per image to leave room for vision content blocks.
const IMAGE_TOKEN_RESERVE = 1000;

// Split text on paragraph boundaries or markdown headings.
export function splitIntoChunks(text) {
  return text
    .split(/\n\n+|(?=\n#{1,6} )/)
    .map(c => c.trim())
    .filter(Boolean);
}

// Pick a representative spread of chunks from start/middle/end within budgetTokens.
export function selectRepresentative(chunks, budgetTokens) {
  if (chunks.length === 0) return [];

  const n = chunks.length;
  const size = Math.ceil(n / 3);
  const sections = [
    chunks.slice(0, size),
    chunks.slice(size, 2 * size),
    chunks.slice(2 * size),
  ].filter(s => s.length > 0);

  const perSection = Math.floor(budgetTokens / sections.length);
  const selected = [];

  for (const section of sections) {
    let remaining = perSection;
    for (const chunk of section) {
      const t = Math.ceil(chunk.length / 4);
      if (t <= remaining) {
        selected.push(chunk);
        remaining -= t;
      }
    }
  }

  // Trim from the tail to ensure the joined string (including \n\n separators) fits budget.
  while (selected.length > 0 && Math.ceil(selected.join('\n\n').length / 4) > budgetTokens) {
    selected.pop();
  }

  return selected;
}

// Pure function — takes already-loaded doc rows, returns { text, imageBlocks }.
export function buildSourceContextFromDocs(docs, budgetTokens) {
  const imageDocs = docs.filter(d => d.kind === 'image' && d.image_data);
  const textDocs = docs.filter(d => d.kind !== 'image' && d.extracted_text);

  const textBudget = Math.max(0, budgetTokens - imageDocs.length * IMAGE_TOKEN_RESERVE);

  const imageBlocks = imageDocs.map(d => ({
    type: 'image',
    source: { type: 'base64', media_type: d.mime_type, data: d.image_data },
  }));

  const fullText = textDocs.map(d => d.extracted_text).join('\n\n');
  const totalTokens = Math.ceil(fullText.length / 4);

  if (totalTokens <= textBudget) {
    return { text: fullText, imageBlocks };
  }

  const chunks = splitIntoChunks(fullText);
  const selected = selectRepresentative(chunks, textBudget);
  return { text: selected.join('\n\n'), imageBlocks };
}

// DB-aware entry point used by quiz generation.
export function buildSourceContext(unitIds, budgetTokens) {
  const docs = unitIds.flatMap(uid => listFullDocumentsByUnit(uid));
  return buildSourceContextFromDocs(docs, budgetTokens);
}
