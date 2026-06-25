import { describe, it, expect } from 'vitest';
import {
  buildSourceContextFromDocs,
  splitIntoChunks,
} from '../server/src/ingestion/sourceContext.js';

describe('splitIntoChunks', () => {
  it('splits on double newlines', () => {
    const chunks = splitIntoChunks('Para one.\n\nPara two.\n\nPara three.');
    expect(chunks).toEqual(['Para one.', 'Para two.', 'Para three.']);
  });

  it('splits on markdown headings', () => {
    const text = 'Intro text.\n# Section A\nContent A.\n# Section B\nContent B.';
    const chunks = splitIntoChunks(text);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks.some(c => c.includes('Section A'))).toBe(true);
  });
});

describe('buildSourceContextFromDocs', () => {
  it('passes through text within budget unchanged', () => {
    const docs = [
      { kind: 'text', extracted_text: 'Hello world', token_estimate: 3, mime_type: 'text/plain' },
      { kind: 'text', extracted_text: 'Foo bar baz', token_estimate: 3, mime_type: 'text/plain' },
    ];
    const { text, imageBlocks } = buildSourceContextFromDocs(docs, 1000);
    expect(text).toBe('Hello world\n\nFoo bar baz');
    expect(imageBlocks).toHaveLength(0);
  });

  it('returns empty text when there are no text docs', () => {
    const { text, imageBlocks } = buildSourceContextFromDocs([], 1000);
    expect(text).toBe('');
    expect(imageBlocks).toHaveLength(0);
  });

  it('includes image blocks for image docs', () => {
    const docs = [
      { kind: 'image', image_data: 'abc123', mime_type: 'image/png' },
    ];
    const { imageBlocks } = buildSourceContextFromDocs(docs, 5000);
    expect(imageBlocks).toHaveLength(1);
    expect(imageBlocks[0]).toMatchObject({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'abc123' },
    });
  });

  it('truncates to within budget when text is over limit', () => {
    // Each repetition: ~60 chars = ~15 tokens; 300 reps = ~4500 tokens
    const paragraph = 'Lorem ipsum dolor sit amet consectetur.\n\nNext paragraph here.\n\nFinal line.';
    const longText = (paragraph + '\n\n').repeat(300);
    const docs = [{ kind: 'text', extracted_text: longText, token_estimate: Math.ceil(longText.length / 4), mime_type: 'text/plain' }];

    const { text } = buildSourceContextFromDocs(docs, 100);

    expect(Math.ceil(text.length / 4)).toBeLessThanOrEqual(100);
    expect(text.length).toBeGreaterThan(0);
  });

  it('representative spread includes content from multiple regions', () => {
    // Build text with clearly labelled sections
    const makeSection = (label, n) =>
      Array.from({ length: n }, (_, i) => `${label} paragraph ${i + 1} content here.`).join('\n\n');

    const text = [
      makeSection('START', 30),
      makeSection('MIDDLE', 30),
      makeSection('END', 30),
    ].join('\n\n');

    const docs = [{ kind: 'text', extracted_text: text, token_estimate: Math.ceil(text.length / 4), mime_type: 'text/plain' }];

    // Budget tight enough to force chunking (~1/10th of total)
    const budget = Math.ceil(text.length / 4 / 10);
    const { text: result } = buildSourceContextFromDocs(docs, budget);

    expect(Math.ceil(result.length / 4)).toBeLessThanOrEqual(budget);
    // Should draw from more than one region
    const hasStart = result.includes('START');
    const hasMiddle = result.includes('MIDDLE');
    const hasEnd = result.includes('END');
    expect([hasStart, hasMiddle, hasEnd].filter(Boolean).length).toBeGreaterThanOrEqual(2);
  });
});
