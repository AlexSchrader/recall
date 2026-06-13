import db from './index.js';

const stmts = {
  // Full row including text/image — used for detail view and generation
  findById: db.prepare('SELECT * FROM documents WHERE id = ?'),
  // List view omits large blobs
  listByUnit: db.prepare(
    `SELECT id, unit_id, filename, mime_type, kind, parse_status, token_estimate, created_at
     FROM documents WHERE unit_id = ? ORDER BY created_at`
  ),
  insert: db.prepare(
    `INSERT INTO documents (id, unit_id, filename, mime_type, kind, parse_status, created_at)
     VALUES (@id, @unit_id, @filename, @mime_type, @kind, @parse_status, @created_at)`
  ),
  markParsed: db.prepare(
    `UPDATE documents
     SET extracted_text = @extracted_text, token_estimate = @token_estimate, parse_status = 'parsed'
     WHERE id = @id`
  ),
  saveImageData: db.prepare(
    `UPDATE documents SET image_data = @image_data, parse_status = 'parsed' WHERE id = @id`
  ),
  markFailed: db.prepare(`UPDATE documents SET parse_status = 'failed' WHERE id = ?`),
  delete: db.prepare('DELETE FROM documents WHERE id = ?'),
};

export function createDocument(data) {
  return stmts.insert.run(data);
}

export function getDocumentById(id) {
  return stmts.findById.get(id);
}

export function listDocumentsByUnit(unitId) {
  return stmts.listByUnit.all(unitId);
}

export function markParsed(id, { extracted_text, token_estimate }) {
  return stmts.markParsed.run({ id, extracted_text, token_estimate });
}

export function saveImageData(id, imageData) {
  return stmts.saveImageData.run({ id, image_data: imageData });
}

export function markFailed(id) {
  return stmts.markFailed.run(id);
}

export function deleteDocument(id) {
  return stmts.delete.run(id);
}
