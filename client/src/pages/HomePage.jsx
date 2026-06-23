import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, NavLink } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

async function searchBooks(q) {
  if (!q.trim()) return [];
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&fields=key,title,author_name,first_publish_year&limit=5`
  ).catch(() => null);
  if (!res?.ok) return [];
  const data = await res.json();
  return data.docs ?? [];
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4f46e5');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [bookQuery, setBookQuery] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [bookSearching, setBookSearching] = useState(false);
  const bookTimer = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#4f46e5');
  const [editBusy, setEditBusy] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    api.get('/courses').then(c => { setCourses(c); setLoading(false); }).catch(() => setLoading(false));
    api.get(`/users/${user.id}/quizzes?limit=5`).then(setRecentQuizzes).catch(console.error);
  }, [user.id]);

  const onBookQuery = (val) => {
    setBookQuery(val);
    setBookResults([]);
    clearTimeout(bookTimer.current);
    if (!val.trim()) return;
    setBookSearching(true);
    bookTimer.current = setTimeout(async () => {
      const results = await searchBooks(val);
      setBookResults(results);
      setBookSearching(false);
    }, 400);
  };

  const pickBook = (book) => {
    setNewName(book.title);
    setBookQuery('');
    setBookResults([]);
  };

  const startEdit = (e, course) => {
    e.stopPropagation();
    setEditingId(course.id);
    setEditName(course.name);
    setEditColor(course.color ?? '#4f46e5');
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const saveCourse = async (e, id) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setEditBusy(true);
    try {
      const updated = await api.put(`/courses/${id}`, { name: editName.trim(), color: editColor });
      setCourses(prev => prev.map(c => c.id === id ? updated : c));
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const deleteCourse = async (id) => {
    setEditBusy(true);
    try {
      await api.delete(`/courses/${id}`);
      setCourses(prev => prev.filter(c => c.id !== id));
      setEditingId(null);
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const createCourse = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const c = await api.post('/courses', { name: newName.trim(), color: newColor });
      setCourses(prev => [...prev, c]);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const streakDue = user?.streak > 0 &&
    user?.streak_updated_at?.slice(0, 10) !== new Date().toISOString().slice(0, 10);

  return (
    <>
      {streakDue && (
        <div className="streak-nudge">
          <span>Your <strong>{user.streak}-day streak</strong> is on the line — study something today to keep it going!</span>
          <Link to="/progress" className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>Study now</Link>
        </div>
      )}
      <div className="page-header">
        <h1>My Courses</h1>
        <button className="btn btn-primary" onClick={() => setAdding(v => !v)}>
          {adding ? 'Cancel' : '+ New course'}
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={createCourse}>
            <div className="form-group">
              <label>Search textbook <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
              <input
                value={bookQuery}
                onChange={e => onBookQuery(e.target.value)}
                placeholder="e.g. Campbell Biology"
              />
              {(bookResults.length > 0 || bookSearching) && (
                <ul className="book-results">
                  {bookSearching && <li className="book-result-item muted">Searching…</li>}
                  {bookResults.map(b => (
                    <li key={b.key} className="book-result-item" onClick={() => pickBook(b)}>
                      <strong>{b.title}</strong>
                      {b.author_name?.[0] && <span className="muted"> — {b.author_name[0]}{b.first_publish_year ? ` (${b.first_publish_year})` : ''}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="row">
              <div className="form-group" style={{ flex: 3 }}>
                <label>Course name</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} autoFocus placeholder="e.g. Biology 101" required />
              </div>
              <div className="form-group" style={{ flex: 0 }}>
                <label>Color</label>
                <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} style={{ width: '3rem', padding: '2px' }} />
              </div>
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button className="btn btn-primary" style={{ marginTop: '0.75rem' }} disabled={busy}>
              {busy ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {!loading && courses.length === 0 && !adding && (
        <div className="onboarding">
          <h2 className="onboarding-title">Study smarter, not harder.</h2>
          <p className="onboarding-sub">Upload your notes, get a quiz, and Recall will automatically bring back the topics you keep missing.</p>
          <div className="onboarding-steps">
            <div className="onboarding-step">
              <span className="onboarding-step-num">1</span>
              <strong>Create a course</strong>
              <p>Organise by class or subject. Add units inside.</p>
            </div>
            <div className="onboarding-step">
              <span className="onboarding-step-num">2</span>
              <strong>Upload your notes</strong>
              <p>PDF, Word, plain text, Markdown, or images.</p>
            </div>
            <div className="onboarding-step">
              <span className="onboarding-step-num">3</span>
              <strong>Generate &amp; take a quiz</strong>
              <p>Claude reads your notes and writes the questions. Weak topics come back automatically.</p>
            </div>
          </div>
          <button className="btn btn-primary onboarding-cta" onClick={() => setAdding(true)}>
            Create your first course
          </button>
        </div>
      )}

      {courses.length > 0 && (
        <ul className="item-list">
          {courses.map(c => editingId === c.id ? (
            <li key={c.id} className="item-row item-row--editing">
              <form onSubmit={e => saveCourse(e, c.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                <input
                  type="color"
                  value={editColor}
                  onChange={e => setEditColor(e.target.value)}
                  style={{ width: '2rem', height: '2rem', padding: '2px', flexShrink: 0, cursor: 'pointer' }}
                />
                <input
                  className="edit-inline-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  autoFocus
                  required
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={editBusy}>Save</button>
                <button className="btn btn-sm" type="button" onClick={cancelEdit} disabled={editBusy}>Cancel</button>
                {confirmDeleteId === c.id ? (
                  <>
                    <span className="muted" style={{ fontSize: '0.85rem' }}>Delete?</span>
                    <button className="btn btn-danger btn-sm" type="button" onClick={() => deleteCourse(c.id)} disabled={editBusy}>Yes</button>
                    <button className="btn btn-sm" type="button" onClick={() => setConfirmDeleteId(null)} disabled={editBusy}>No</button>
                  </>
                ) : (
                  <button className="btn btn-danger btn-sm" type="button" onClick={() => setConfirmDeleteId(c.id)} disabled={editBusy}>Delete</button>
                )}
              </form>
            </li>
          ) : (
            <li key={c.id} className="item-row" onClick={() => navigate(`/courses/${c.id}`)}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color ?? '#4f46e5', flexShrink: 0 }} />
              <span className="label">{c.name}</span>
              <button
                className="btn-icon edit-btn"
                title="Edit course"
                onClick={e => startEdit(e, c)}
              >✏️</button>
            </li>
          ))}
        </ul>
      )}

      {recentQuizzes.length > 0 && (
        <>
          <hr />
          <p className="section-title">Recent quizzes</p>
          <ul className="item-list">
            {recentQuizzes.map(q => (
              <li key={q.id} className="item-row" onClick={() => navigate(q.status === 'completed' ? `/quizzes/${q.id}/results` : `/quizzes/${q.id}`)}>
                <span className="label">{q.title}</span>
                {q.score != null
                  ? <span className="meta">{Math.round(q.score * 100)}%</span>
                  : <span className="meta status status-pending">in progress</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {recentQuizzes.some(q => q.status === 'completed') && (
        <>
          <hr />
          <p className="section-title">Quick study</p>
          <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
            Practice with your existing quiz questions — no generation needed.
          </p>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <Link to="/games/speed-round" className="btn btn-ghost">🏃 Speed Round</Link>
            <Link to="/games/streak" className="btn btn-ghost">🔥 Streak Challenge</Link>
            <button
              className="btn btn-primary"
              onClick={() => navigate(Math.random() < 0.5 ? '/games/speed-round' : '/games/streak')}
            >🎲 Surprise me</button>
          </div>
        </>
      )}
    </>
  );
}
