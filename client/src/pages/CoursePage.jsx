import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, bulkImportUnits } from '../api.js';
import { examCountdownLabel, examUrgency } from '../examCountdown.js';

const EXAM_TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short', label: 'Short answer' },
];
const EXAM_COUNTS = [10, 20, 30];
const EXAM_DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'];

export default function CoursePage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [units, setUnits] = useState([]);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [editingExam, setEditingExam] = useState(false);
  const [examInput, setExamInput] = useState('');
  const [examBusy, setExamBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState('');
  const bulkRef = useRef(null);

  // Mock exam (multi-unit quiz across the course)
  const [mockOpen, setMockOpen] = useState(false);
  const [mockTitle, setMockTitle] = useState('');
  const [mockUnitIds, setMockUnitIds] = useState([]);
  const [mockCount, setMockCount] = useState(20);
  const [mockDifficulty, setMockDifficulty] = useState('mixed');
  const [mockTypes, setMockTypes] = useState(['mcq', 'true_false', 'short']);
  const [mockBusy, setMockBusy] = useState(false);
  const [mockError, setMockError] = useState('');

  useEffect(() => {
    api.get(`/courses/${courseId}`).then(setCourse).catch(() => navigate('/'));
    api.get(`/courses/${courseId}/units`).then(setUnits).catch(console.error);
  }, [courseId]);

  const handleBulkImport = async (e) => {
    const files = Array.from(e.target.files ?? []);
    if (bulkRef.current) bulkRef.current.value = '';
    if (!files.length) return;
    setBulkBusy(true);
    setBulkMsg('');
    setError('');
    try {
      const { created } = await bulkImportUnits(courseId, files);
      // Refresh the unit list so counts/positions are authoritative.
      const fresh = await api.get(`/courses/${courseId}/units`);
      setUnits(fresh);
      const failed = created.filter(c => c.document?.parse_status === 'failed').length;
      setBulkMsg(
        `Added ${created.length} unit${created.length !== 1 ? 's' : ''}` +
        (failed ? ` · ${failed} file${failed !== 1 ? 's' : ''} couldn't be parsed` : '')
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const openExamEdit = () => {
    setExamInput(course?.exam_date ?? '');
    setEditingExam(true);
  };

  const saveExamDate = async (value) => {
    setExamBusy(true);
    try {
      const updated = await api.put(`/courses/${courseId}`, { exam_date: value || null });
      setCourse(updated);
      setEditingExam(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setExamBusy(false);
    }
  };

  const createUnit = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const u = await api.post(`/courses/${courseId}/units`, { name: newName.trim() });
      setUnits(prev => [...prev, { ...u, documentCount: 0 }]);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEditUnit = (e, u) => {
    e.stopPropagation();
    setEditingId(u.id);
    setEditName(u.name);
    setConfirmDeleteId(null);
    setError('');
  };

  const cancelEditUnit = () => {
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const deleteUnit = async (id) => {
    setEditBusy(true);
    try {
      await api.delete(`/units/${id}`);
      setUnits(prev => prev.filter(u => u.id !== id));
      setEditingId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const saveUnit = async (e, id) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditBusy(true);
    try {
      const updated = await api.put(`/units/${id}`, { name: editName.trim() });
      setUnits(prev => prev.map(u => u.id === id ? { ...u, ...updated } : u));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const deleteCourse = async () => {
    await api.delete(`/courses/${courseId}`);
    navigate('/');
  };

  const openMock = () => {
    if (!mockOpen) {
      // Default to units that actually have documents (otherwise nothing to generate from).
      const withDocs = units.filter(u => (u.documentCount ?? 0) > 0).map(u => u.id);
      setMockUnitIds(withDocs.length ? withDocs : units.map(u => u.id));
      setMockTitle(`${course.name} exam`);
      setMockError('');
    }
    setMockOpen(v => !v);
  };

  const toggleMockUnit = (id) => {
    setMockUnitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleMockType = (t) => {
    setMockTypes(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
  };

  const generateMock = async () => {
    if (!mockUnitIds.length) { setMockError('Pick at least one unit to include.'); return; }
    setMockBusy(true);
    setMockError('');
    try {
      const result = await api.post('/quizzes/generate', {
        courseId,
        unitIds: mockUnitIds,
        title: mockTitle.trim() || `${course.name} exam`,
        questionCount: Number(mockCount),
        reviewMix: 0, // an exam is a fresh assessment, not weighted toward review
        types: mockTypes,
        difficulty: mockDifficulty,
      });
      navigate(`/quizzes/${result.quizId}`);
    } catch (err) {
      setMockError(err.message);
      setMockBusy(false);
    }
  };

  if (!course) return null;

  return (
    <>
      <div className="course-top">
        <p className="breadcrumb breadcrumb--lg"><Link to="/">Home</Link> › Courses</p>
        {confirmDeleteCourse ? (
          <span className="course-del-confirm">
            Delete this course &amp; everything in it?
            <button className="btn btn-danger btn-sm" onClick={deleteCourse}>Yes, delete</button>
            <button className="btn btn-sm" onClick={() => setConfirmDeleteCourse(false)}>Cancel</button>
          </span>
        ) : (
          <button className="course-del-x" title="Delete course" onClick={() => setConfirmDeleteCourse(true)}>✕</button>
        )}
      </div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flex: 1 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: course.color ?? '#4f46e5' }} />
          <h1>{course.name}</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(v => !v)}>+ Unit</button>
        <label className="btn btn-ghost btn-sm" style={{ cursor: bulkBusy ? 'default' : 'pointer' }}>
          {bulkBusy ? 'Importing…' : '⇪ Bulk import'}
          <input
            ref={bulkRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md,image/*"
            style={{ display: 'none' }}
            onChange={handleBulkImport}
            disabled={bulkBusy}
          />
        </label>
        {units.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={openMock}>
            {mockOpen ? 'Cancel' : '📝 Mock exam'}
          </button>
        )}
      </div>

      {mockOpen && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <p className="section-title">Mock exam</p>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
            Generate one test drawing from every unit you select across this course.
          </p>

          <div className="form-group">
            <label>Exam title</label>
            <input value={mockTitle} onChange={e => setMockTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Units to include</label>
            <div className="exam-unit-list">
              {units.map(u => {
                const noDocs = (u.documentCount ?? 0) === 0;
                return (
                  <label key={u.id} className={`exam-unit ${noDocs ? 'exam-unit--empty' : ''}`}>
                    <input
                      type="checkbox"
                      checked={mockUnitIds.includes(u.id)}
                      onChange={() => toggleMockUnit(u.id)}
                    />
                    <span>{u.name}</span>
                    <span className="exam-unit-meta">{u.documentCount ?? 0} doc{u.documentCount !== 1 ? 's' : ''}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="row" style={{ marginBottom: '1rem' }}>
            <div className="form-group">
              <label>Questions</label>
              <div style={{ display: 'flex', gap: '.4rem' }}>
                {EXAM_COUNTS.map(n => (
                  <button key={n} type="button" className={`btn btn-sm ${mockCount === n ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMockCount(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select value={mockDifficulty} onChange={e => setMockDifficulty(e.target.value)}>
                {EXAM_DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Question types</label>
            <div className="type-checks">
              {EXAM_TYPES.map(t => (
                <div key={t.value} className="type-check-row">
                  <span>{t.label}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={mockTypes.includes(t.value)} onChange={() => toggleMockType(t.value)} />
                    <span className="toggle-slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {mockError && <p className="error-msg">{mockError}</p>}
          <button className="btn btn-primary" style={{ marginTop: '.75rem' }} disabled={mockBusy} onClick={generateMock}>
            {mockBusy ? 'Building your exam…' : '⚡ Generate exam'}
          </button>
        </div>
      )}

      {bulkMsg && (
        <p className="success-msg" style={{ marginBottom: '.75rem' }}>{bulkMsg}</p>
      )}
      {bulkBusy && (
        <p className="muted" style={{ marginBottom: '.75rem', fontSize: '.85rem' }}>
          Creating a unit per file and parsing each — this can take a moment for large PDFs.
        </p>
      )}

      {/* Exam countdown */}
      <div className="exam-row">
        {editingExam ? (
          <div className="exam-edit">
            <label style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Exam date</label>
            <input
              type="date"
              value={examInput}
              onChange={e => setExamInput(e.target.value)}
              disabled={examBusy}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" disabled={examBusy} onClick={() => saveExamDate(examInput)}>Save</button>
            {course.exam_date && (
              <button className="btn btn-ghost btn-sm" disabled={examBusy} onClick={() => saveExamDate(null)}>Clear</button>
            )}
            <button className="btn btn-sm" disabled={examBusy} onClick={() => setEditingExam(false)}>Cancel</button>
          </div>
        ) : course.exam_date ? (
          <button className={`exam-badge exam-badge--${examUrgency(course.exam_date)}`} onClick={openExamEdit} title="Edit exam date">
            📅 {examCountdownLabel(course.exam_date)}
          </button>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={openExamEdit}>📅 Set exam date</button>
        )}
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={createUnit}>
            <div className="form-group">
              <label>Unit name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder="e.g. Chapter 3 — Cell Division" required />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add unit'}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {units.length === 0
        ? <p className="empty">No units yet. Add one above.</p>
        : (
          <>
          <ul className="item-list">
            {units.map(u => editingId === u.id ? (
              <li key={u.id} className="item-row item-row--editing">
                <form onSubmit={e => saveUnit(e, u.id)} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flex: 1 }}>
                  <input
                    className="edit-inline-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    autoFocus
                    required
                  />
                  <button className="btn btn-primary btn-sm" type="submit" disabled={editBusy}>{editBusy ? 'Saving…' : 'Save'}</button>
                  <button className="btn btn-sm" type="button" onClick={cancelEditUnit} disabled={editBusy}>Cancel</button>
                  {confirmDeleteId === u.id ? (
                    <>
                      <span className="muted" style={{ fontSize: '.85rem' }}>Delete unit &amp; its contents?</span>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteUnit(u.id)} disabled={editBusy}>Yes</button>
                      <button className="btn btn-sm" type="button" onClick={() => setConfirmDeleteId(null)} disabled={editBusy}>No</button>
                    </>
                  ) : (
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => setConfirmDeleteId(u.id)} disabled={editBusy}>Delete</button>
                  )}
                </form>
              </li>
            ) : (
              <li
                key={u.id}
                className={`item-row ${selectedId === u.id ? 'item-row--selected' : ''}`}
                onClick={() => setSelectedId(selectedId === u.id ? null : u.id)}
              >
                <span
                  className="label"
                  style={{ cursor: 'pointer' }}
                  onClick={e => { e.stopPropagation(); navigate(`/units/${u.id}`); }}
                >{u.name}</span>
                <span className="meta">{u.documentCount ?? 0} doc{u.documentCount !== 1 ? 's' : ''}</span>
                {selectedId === u.id && (
                  <button className="edit-btn" style={{ opacity: 1 }} title="Rename unit" onClick={e => startEditUnit(e, u)}>✏️</button>
                )}
              </li>
            ))}
          </ul>
          {error && <p className="error-msg" style={{ marginTop: '.5rem' }}>{error}</p>}
          </>
        )
      }
    </>
  );
}
