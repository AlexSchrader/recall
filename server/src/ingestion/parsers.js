import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'text/x-markdown',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export function getKind(mimeType) {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  if (IMAGE_MIME_TYPES.has(mimeType)) return 'image';
  return 'text';
}

export function normalizeText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function tokenEstimate(text) {
  return Math.ceil(text.length / 4);
}

export async function parsePdf(buffer) {
  const result = await pdfParse(buffer);
  return normalizeText(result.text);
}

export async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeText(result.value);
}

export function parseTxt(buffer) {
  return normalizeText(buffer.toString('utf-8'));
}
