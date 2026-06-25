import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import {
  createCourse, getCourseById, listCoursesByUser, updateCourse, deleteCourse,
} from '../db/coursesDb.js';
import {
  createUnit, getUnitById, listUnitsByCourse, getNextPosition, updateUnit, deleteUnit,
} from '../db/unitsDb.js';
import { listDocumentsByUnit } from '../db/documentsDb.js';

const router = Router();

// ── Courses ───────────────────────────────────────────────────────────────────

router.post('/courses', requireAuth, (req, res) => {
  const { name, color } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
  const id = uuidv4();
  createCourse({ id, user_id: req.session.userId, name: name.trim(), color: color ?? null, created_at: new Date().toISOString() });
  res.status(201).json(getCourseById(id));
});

router.get('/courses', requireAuth, (req, res) => {
  res.json(listCoursesByUser(req.session.userId));
});

router.get('/courses/:id', requireAuth, (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Course not found.' });
  res.json(course);
});

router.put('/courses/:id', requireAuth, (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Course not found.' });
  const body = req.body ?? {};
  const name = body.name ?? course.name;
  const color = body.color ?? course.color;

  // exam_date: accept a YYYY-MM-DD string, or null to clear. Only touch it if the key is present.
  let exam_date = course.exam_date;
  if ('exam_date' in body) {
    const raw = body.exam_date;
    if (raw === null || raw === '') {
      exam_date = null;
    } else if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw) && !Number.isNaN(Date.parse(raw))) {
      exam_date = raw;
    } else {
      return res.status(400).json({ error: 'exam_date must be a YYYY-MM-DD date or null.' });
    }
  }

  updateCourse(course.id, { name, color, exam_date });
  res.json(getCourseById(course.id));
});

router.delete('/courses/:id', requireAuth, (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Course not found.' });
  deleteCourse(course.id);
  res.status(204).end();
});

// ── Units (under courses) ─────────────────────────────────────────────────────

router.post('/courses/:id/units', requireAuth, (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Course not found.' });
  const { name } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'name is required.' });
  const id = uuidv4();
  const position = getNextPosition(course.id);
  createUnit({ id, course_id: course.id, name: name.trim(), position, created_at: new Date().toISOString() });
  res.status(201).json(getUnitById(id));
});

router.get('/courses/:id/units', requireAuth, (req, res) => {
  const course = getCourseById(req.params.id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Course not found.' });
  const units = listUnitsByCourse(course.id);
  // Attach document count to each unit for the client
  const withDocs = units.map(u => ({ ...u, documentCount: listDocumentsByUnit(u.id).length }));
  res.json(withDocs);
});

// ── Units (standalone) ────────────────────────────────────────────────────────

router.get('/units/:id', requireAuth, (req, res) => {
  const unit = getUnitById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Unit not found.' });
  res.json(unit);
});

router.put('/units/:id', requireAuth, (req, res) => {
  const unit = getUnitById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Unit not found.' });
  const { name = unit.name, position = unit.position } = req.body ?? {};
  updateUnit(unit.id, { name, position });
  res.json(getUnitById(unit.id));
});

router.delete('/units/:id', requireAuth, (req, res) => {
  const unit = getUnitById(req.params.id);
  if (!unit) return res.status(404).json({ error: 'Unit not found.' });
  const course = getCourseById(unit.course_id);
  if (!course || course.user_id !== req.session.userId) return res.status(404).json({ error: 'Unit not found.' });
  deleteUnit(unit.id);
  res.status(204).end();
});

export default router;
