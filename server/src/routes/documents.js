import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import {
  createDocument,
  getDocumentById,
  listDocumentsByUnit,
  markParsed,
  saveImageData,
  markFailed,
  deleteDocument,
} from '../db/documentsDb.js';
import { getUnitById, createUnit, getNextPosition } from '../db/unitsDb.js';
import { getCourseById } from '../db/coursesDb.js';
import {
  SUPPORTED_MIME_TYPES,
  getKind,
  tokenEstimate,
  parsePdf,
  parseDocx,
  parseTxt,
} from '../ingestion/parsers.js';

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const MAX_BULK_FILES = 15;

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

function multerError(err, res) {
  const msg = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
    ? 'File exceeds the 15 MB limit.'
    : err.message;
  res.status(400).json({ error: msg });
}

function multerSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return multerError(err, res);
    next();
  });
}

function multerArray(req, res, next) {
  upload.array('files', MAX_BULK_FILES)(req, res, (err) => {
    if (err) return multerError(err, res);
    next();
  });
}

// Returns the unit if it exists and the caller owns its course, else null.
function ownedUnit(unitId, userId) {
  const unit = getUnitById(unitId);
  if (!unit) return null;
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== userId) return null;
  return unit;
}

// Drop a filename's extension for use as a unit name. "Chapter 1.pdf" → "Chapter 1".
function unitNameFromFile(filename) {
  const base = filename.replace(/\.[^./\\]+$/, '').trim();
  return base || filename;
}

// Persist + parse one uploaded file under a unit. Never throws — failures mark the doc failed.
async function storeAndParse(unitId, file) {
  const { originalname, mimetype, buffer } = file;
  const kind = getKind(mimetype);
  const docId = uuidv4();
  createDocument({
    id: docId,
    unit_id: unitId,
    filename: originalname,
    mime_type: mimetype,
    kind,
    parse_status: 'pending',
    created_at: new Date().toISOString(),
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
  return getDocumentById(docId);
}

const router = Router();

// POST /api/units/:id/documents
router.post('/units/:id/documents', requireAuth, multerSingle, async (req, res) => {
  const unit = ownedUnit(req.params.id, req.session.userId);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded. Send the file in a multipart/form-data field named "file".' });
  }

  const doc = await storeAndParse(unit.id, req.file);
  res.status(201).json(doc);
});

// POST /api/courses/:id/bulk-import — one new unit per uploaded file
router.post('/courses/:id/bulk-import', requireAuth, multerArray, async (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) {
    return res.status(404).json({ error: 'Course not found.' });
  }
  if (!req.files?.length) {
    return res.status(400).json({ error: 'No files uploaded. Send one or more files in a multipart/form-data field named "files".' });
  }

  // Sequential so unit positions stay ordered and parsing doesn't spike memory.
  const created = [];
  for (const file of req.files) {
    const unitId = uuidv4();
    createUnit({
      id: unitId,
      course_id: course.id,
      name: unitNameFromFile(file.originalname),
      position: getNextPosition(course.id),
      created_at: new Date().toISOString(),
    });
    const doc = await storeAndParse(unitId, file);
    created.push({ unit: getUnitById(unitId), document: doc });
  }

  res.status(201).json({ created });
});

// GET /api/units/:id/documents (list for a unit — omits blobs)
router.get('/units/:id/documents', requireAuth, (req, res) => {
  const unit = ownedUnit(req.params.id, req.session.userId);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });
  res.json(listDocumentsByUnit(unit.id));
});

// GET /api/documents/:id
router.get('/documents/:id', requireAuth, (req, res) => {
  const doc = getDocumentById(req.params.id);
  if (!doc || !ownedUnit(doc.unit_id, req.session.userId)) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  res.json(doc);
});

// DELETE /api/documents/:id
router.delete('/documents/:id', requireAuth, (req, res) => {
  const doc = getDocumentById(req.params.id);
  if (!doc || !ownedUnit(doc.unit_id, req.session.userId)) {
    return res.status(404).json({ error: 'Document not found.' });
  }
  deleteDocument(req.params.id);
  res.status(204).end();
});

export default router;
