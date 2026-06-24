import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

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
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    api.get(`/courses/${courseId}`).then(setCourse).catch(() => navigate('/'));
    api.get(`/courses/${courseId}/units`).then(setUnits).catch(console.error);
  }, [courseId]);

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
    if (!confirm(`Delete "${course?.name}" and all its contents?`)) return;
    await api.delete(`/courses/${courseId}`);
    navigate('/');
  };

  if (!course) return null;

  return (
    <>
      <p className="breadcrumb"><Link to="/">Home</Link> › Courses</p>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', flex: 1 }}>
          <span style={{ width: 16, height: 16, borderRadius: '50%', background: course.color ?? '#4f46e5' }} />
          <h1>{course.name}</h1>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => setAdding(v => !v)}>+ Unit</button>
        <button className="btn btn-danger btn-sm" onClick={deleteCourse}>Delete course</button>
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
