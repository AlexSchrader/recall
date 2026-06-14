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
          <ul className="item-list">
            {units.map(u => (
              <li key={u.id} className="item-row" onClick={() => navigate(`/units/${u.id}`)}>
                <span className="label">{u.name}</span>
                <span className="meta">{u.documentCount ?? 0} doc{u.documentCount !== 1 ? 's' : ''}</span>
              </li>
            ))}
          </ul>
        )
      }
    </>
  );
}
