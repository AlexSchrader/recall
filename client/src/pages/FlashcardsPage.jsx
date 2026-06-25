import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

function timeAgo(iso) {
  const secs = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function FlashcardsPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();

  const [unit, setUnit] = useState(null);
  const [course, setCourse] = useState(null);
  const [decks, setDecks] = useState([]);
  const [showGen, setShowGen] = useState(false);
  const [count, setCount] = useState(20);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    api.get(`/units/${unitId}`)
      .then(u => {
        setUnit(u);
        return api.get(`/courses/${u.course_id}`);
      })
      .then(setCourse)
      .catch(() => navigate('/'));

    api.get(`/units/${unitId}/flashcards/decks`).then(setDecks).catch(console.error);
  }, [unitId]);

  const generate = async () => {
    setGenerating(true);
    setGenError('');
    try {
      const result = await api.post(`/units/${unitId}/flashcards/generate`, { count });
      navigate(`/flashcards/decks/${result.deckId}`);
    } catch (err) {
      setGenError(err.message);
      setGenerating(false);
    }
  };

  if (!unit || !course) return null;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Home</Link> › <Link to={`/courses/${course.id}`}>{course.name}</Link> › <Link to={`/units/${unitId}`}>{unit.name}</Link>
      </p>
      <div className="page-header">
        <h1>Flashcards</h1>
      </div>

      {decks.length === 0 ? (
        <div className="onboarding" style={{ padding: '2rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '.75rem' }}>⚡️</div>
          <p style={{ fontWeight: 600, marginBottom: '.5rem' }}>No flashcard decks yet</p>
          <p className="muted" style={{ marginBottom: '1.5rem' }}>Generate a deck from your uploaded documents and start memorizing.</p>
          <button className="btn btn-primary" onClick={() => setShowGen(true)}>Generate deck</button>
        </div>
      ) : (
        <>
          <ul className="item-list" style={{ marginBottom: '1.25rem' }}>
            {decks.map(deck => (
              <li key={deck.id} className="item-row" onClick={() => navigate(`/flashcards/decks/${deck.id}`)}>
                <span className="label">{deck.name}</span>
                <span className="meta">{timeAgo(deck.created_at)}</span>
                <div className="deck-count-badges">
                  {deck.due > 0 && <span className="count-badge count-badge-due">{deck.due} due</span>}
                  {deck.new > 0 && <span className="count-badge count-badge-new">{deck.new} new</span>}
                  <span className="count-badge count-badge-total">{deck.total}</span>
                </div>
                {deck.due > 0 && (
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={e => { e.stopPropagation(); navigate(`/flashcards/decks/${deck.id}/review`); }}
                  >
                    Review
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost" onClick={() => setShowGen(v => !v)}>
            {showGen ? 'Cancel' : '+ Generate new deck'}
          </button>
        </>
      )}

      {showGen && (
        <div className="card" style={{ marginTop: '1rem' }}>
          <p className="section-title">New deck</p>
          <div className="form-group" style={{ marginBottom: '1.25rem' }}>
            <label>Cards to generate: <strong>{count}</strong></label>
            <input
              type="range" min="5" max="30" step="5" value={count}
              onChange={e => setCount(Number(e.target.value))}
              style={{ marginTop: '.35rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--muted)' }}>
              <span>5</span><span>30</span>
            </div>
          </div>
          {genError && <p className="error-msg" style={{ marginBottom: '.75rem' }}>{genError}</p>}
          {generating ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--muted)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>✨</div>
              Building your deck — this takes about 15 seconds…
            </div>
          ) : (
            <button className="btn btn-primary" onClick={generate}>Generate {count} cards</button>
          )}
        </div>
      )}
    </>
  );
}
