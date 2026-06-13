import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  createDocument,
  getDocumentById,
  listDocumentsByUnit,
  markParsed,
  saveImageData,
  markFailed,
  deleteDocument,
} from '../db/documentsDb.js';
import { getUnitById } from '../db/unitsDb.js';
import {
  SUPPORTED_MIME_TYPES,
  getKind,
  tokenEstimate,
  parsePdf,
  parseDocx,
  parseTxt,
} from '../ingestion/parsers.js';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter(_req, file, cb) {
    if (SUPPORTED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${file.mimetype}". Accepted: PDF, DOCX, TXT, MD, and common image formats.`));
    }
  },
});

function multerSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'File exceeds the 15 MB limit.'
        : err.message;
      return res.status(400).json({ error: msg });
    }
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}

const router = Router();

// POST /api/units/:id/documents
router.post('/units/:id/documents', multerSingle, async (req, res) => {
  const unit = getUnitById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send the file in a multipart/form-data field named "file".' });
  }

  const { originalname, mimetype, buffer } = req.file;
  const kind = getKind(mimetype);
  const docId = uuidv4();
  const now = new Date().toISOString();

  createDocument({
    id: docId,
    unit_id: unit.id,
    filename: originalname,
    mime_type: mimetype,
    kind,
    parse_status: 'pending',
    created_at: now,
  });

  try {
    if (kind === 'image') {
      saveImageData(docId, buffer.toString('base64'));
    } else {
      let text;
      if (kind === 'pdf') text = await parsePdf(buffer);
      else if (kind === 'docx') text = await parseDocx(buffer);
      else text = parseTxt(buffer);

      markParsed(docId, { extracted_text: text, token_estimate: tokenEstimate(text) });
    }
  } catch (_) {
    markFailed(docId);
  }

  res.status(201).json(getDocumentById(docId));
});

// GET /api/units/:id/documents (list for a unit — omits blobs)
router.get('/units/:id/documents', (req, res) => {
  const unit = getUnitById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });
  res.json(listDocumentsByUnit(unit.id));
});

// GET /api/documents/:id
router.get('/documents/:id', (req, res) => {
  const doc = getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  res.json(doc);
});

// DELETE /api/documents/:id
router.delete('/documents/:id', (req, res) => {
  const doc = getDocumentById(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document not found.' });
  deleteDocument(req.params.id);
  res.status(204).end();
});

export default router;
