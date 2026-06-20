import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [recentQuizzes, setRecentQuizzes] = useState([]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#4f46e5');
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/courses').then(setCourses).catch(console.error);
    api.get(`/users/${user.id}/quizzes?limit=5`).then(setRecentQuizzes).catch(console.error);
  }, [user.id]);

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

  return (
    <>
      <div className="page-header">
        <h1>My Courses</h1>
        <button className="btn btn-primary" onClick={() => setAdding(v => !v)}>
          {adding ? 'Cancel' : '+ New course'}
        </button>
      </div>

      {adding && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <form onSubmit={createCourse}>
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

      {courses.length === 0 && !adding && (
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
          {courses.map(c => (
            <li key={c.id} className="item-row" onClick={() => navigate(`/courses/${c.id}`)}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: c.color ?? '#4f46e5', flexShrink: 0 }} />
              <span className="label">{c.name}</span>
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
    </>
  );
}
