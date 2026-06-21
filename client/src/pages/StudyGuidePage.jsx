import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { api } from '../api.js';

function timeAgo(iso) {
  if (!iso) return '';
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function StudyGuidePage() {
  const { unitId } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState(null);
  const [course, setCourse] = useState(null);
  const [guide, setGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/units/${unitId}`)
      .then(u => {
        setUnit(u);
        return api.get(`/courses/${u.course_id}`);
      })
      .then(setCourse)
      .catch(() => navigate('/'));

    api.get(`/units/${unitId}/study-guide`)
      .then(setGuide)
      .catch(() => {}) // 404 just means none exists yet
      .finally(() => setLoading(false));
  }, [unitId]);

  const generate = async () => {
    setGenerating(true);
    setError('');
    try {
      const result = await api.post(`/units/${unitId}/study-guide/generate`);
      setGuide(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const askRappel = async () => {
    if (!guide) return;
    const prompt = `I just read the study guide for "${unit?.name}". Can you quiz me on it or explain anything that might be tricky?`;
    try {
      const thread = await api.post('/chat/threads', { title: `${unit?.name} — study guide review` });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(prompt)}`);
    } catch {
      navigate('/chat');
    }
  };

  if (!unit || !course) return null;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Home</Link> › <Link to={`/courses/${course.id}`}>{course.name}</Link> › <Link to={`/units/${unitId}`}>{unit.name}</Link>
      </p>
      <div className="page-header">
        <h1>Study Guide</h1>
        {guide && (
          <button className="btn btn-ghost btn-sm" onClick={generate} disabled={generating}>
            {generating ? 'Regenerating…' : '↻ Regenerate'}
          </button>
        )}
      </div>

      {guide && (
        <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>
          Generated {timeAgo(guide.created_at)} · {guide.model}
        </p>
      )}

      {error && <p className="error-msg" style={{ marginBottom: '1rem' }}>{error}</p>}

      {loading ? null : guide ? (
        <>
          <div className="card study-guide-md" style={{ marginBottom: '1.25rem' }}>
            <ReactMarkdown>{guide.content}</ReactMarkdown>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={askRappel}>
              Ask Rappel about this →
            </button>
            <Link to={`/units/${unitId}/flashcards`} className="btn btn-ghost">
              Study flashcards →
            </Link>
          </div>
        </>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '.75rem' }}>📖</div>
          <p style={{ fontWeight: 600, marginBottom: '.5rem' }}>No study guide yet</p>
          <p className="muted" style={{ marginBottom: '1.5rem', maxWidth: 420, margin: '0 auto 1.5rem' }}>
            Rappel will read your uploaded documents and write a clear, structured guide covering the key concepts and definitions.
          </p>
          {generating ? (
            <div style={{ color: 'var(--muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>✨</div>
              Writing your study guide — this takes about 20 seconds…
            </div>
          ) : (
            <button className="btn btn-primary" onClick={generate}>Generate study guide</button>
          )}
        </div>
      )}
    </>
  );
}
