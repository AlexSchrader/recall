import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

const SESSION_OPTIONS = [
  { label: 'Quick 5', value: 5 },
  { label: '10 cards', value: 10 },
  { label: '20 cards', value: 20 },
];

export default function DeckPage() {
  const { deckId } = useParams();
  const navigate = useNavigate();

  const [deck, setDeck] = useState(null);
  const [unit, setUnit] = useState(null);
  const [cards, setCards] = useState([]);
  const [sessionLimit, setSessionLimit] = useState(null); // null = all due
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState('');
  const [editingCard, setEditingCard] = useState(null);
  const [editFields, setEditFields] = useState({ front: '', back: '', topic: '' });

  useEffect(() => {
    api.get(`/flashcards/decks/${deckId}`)
      .then(d => {
        setDeck(d);
        return api.get(`/units/${d.unit_id}`);
      })
      .then(setUnit)
      .catch(() => navigate('/'));

    api.get(`/flashcards/decks/${deckId}/cards`).then(setCards).catch(console.error);
  }, [deckId]);

  const deleteDeck = async () => {
    await api.delete(`/flashcards/decks/${deckId}`);
    navigate(`/units/${deck.unit_id}/flashcards`);
  };

  const regenerate = async () => {
    setRegenerating(true);
    setRegenError('');
    try {
      const result = await api.post(`/flashcards/decks/${deckId}/regenerate`, {});
      navigate(`/flashcards/decks/${result.deckId}`);
    } catch (err) {
      setRegenError(err.message);
      setRegenerating(false);
    }
  };

  const startEdit = (card) => {
    setEditingCard(card.id);
    setEditFields({ front: card.front, back: card.back, topic: card.topic });
  };

  const saveEdit = async (cardId) => {
    const updated = await api.patch(`/flashcards/cards/${cardId}`, editFields);
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, ...updated } : c));
    setEditingCard(null);
  };

  const deleteCard = async (cardId) => {
    await api.delete(`/flashcards/cards/${cardId}`);
    setCards(prev => prev.filter(c => c.id !== cardId));
  };

  const startReview = () => {
    const limit = sessionLimit ?? deck.due;
    const url = `/flashcards/decks/${deckId}/review${limit < deck.due ? `?limit=${limit}` : ''}`;
    navigate(url);
  };

  if (!deck || !unit) return null;

  const allDue = deck.due;
  const sessionOptions = SESSION_OPTIONS.filter(o => o.value < allDue).concat(
    allDue > 0 ? [{ label: `All ${allDue} due`, value: null }] : []
  );
  const selectedValue = sessionLimit;

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Home</Link> › <Link to={`/units/${deck.unit_id}`}>{unit.name}</Link> › <Link to={`/units/${deck.unit_id}/flashcards`}>Flashcards</Link>
      </p>
      <div className="page-header">
        <h1>{deck.name}</h1>
        {!confirmDelete
          ? <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', border: '1px solid' }} onClick={() => setConfirmDelete(true)}>Delete deck</button>
          : <span style={{ fontSize: '.875rem' }}>Delete this deck? <button className="btn btn-danger btn-sm" onClick={deleteDeck}>Yes, delete</button> <button className="btn btn-sm" onClick={() => setConfirmDelete(false)}>Cancel</button></span>
        }
      </div>

      <div style={{ marginBottom: '1rem' }}>
        {!confirmRegen ? (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmRegen(true)} disabled={regenerating}>
            ↻ Regenerate cards
          </button>
        ) : (
          <span style={{ fontSize: '.85rem' }}>
            Replace all cards with fresh ones? Review progress for this deck resets.{' '}
            <button className="btn btn-primary btn-sm" onClick={regenerate} disabled={regenerating}>
              {regenerating ? 'Regenerating…' : 'Yes, regenerate'}
            </button>{' '}
            <button className="btn btn-sm" onClick={() => setConfirmRegen(false)} disabled={regenerating}>Cancel</button>
          </span>
        )}
        {regenError && <p className="error-msg" style={{ marginTop: '.5rem' }}>{regenError}</p>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="session-stat">
          <div className="stat-num">{deck.total}</div>
          <div className="stat-lbl">total</div>
        </div>
        <div className="session-stat">
          <div className="stat-num" style={{ color: deck.due > 0 ? 'var(--warning)' : 'var(--success)' }}>{deck.due}</div>
          <div className="stat-lbl">due now</div>
        </div>
        <div className="session-stat">
          <div className="stat-num" style={{ color: '#2563eb' }}>{deck.new}</div>
          <div className="stat-lbl">new</div>
        </div>
      </div>

      {allDue === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', marginBottom: '1.5rem', color: 'var(--muted)' }}>
          No cards due right now — great job staying on top of this deck!
        </div>
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p className="section-title" style={{ marginBottom: '.5rem' }}>Session length</p>
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.75rem' }}>Pick how many cards to review — keeping it short is totally fine.</p>
          <div className="session-picker">
            {sessionOptions.map(opt => (
              <button
                key={opt.label}
                className={`session-pick-btn ${selectedValue === opt.value ? 'active' : ''}`}
                onClick={() => setSessionLimit(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            className="btn btn-primary"
            onClick={startReview}
            disabled={sessionOptions.length > 0 && selectedValue === null && allDue === 0}
          >
            Start review →
          </button>
        </div>
      )}

      {cards.length >= 4 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p className="section-title" style={{ marginBottom: '.25rem' }}>Match It ⚡️</p>
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.75rem' }}>Pair terms with definitions — scored on accuracy and time.</p>
          <Link
            to={`/games/match?deckId=${deckId}&deckName=${encodeURIComponent(deck?.name ?? '')}`}
            className="btn btn-ghost"
          >
            Play Match It →
          </Link>
        </div>
      )}

      <p className="section-title">All cards <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({cards.length})</span></p>
      {cards.length === 0 && <p className="empty">No cards in this deck.</p>}
      <div>
        {cards.map(card => (
          <div key={card.id} className="card-row">
            {editingCard === card.id ? (
              <div style={{ flex: 1 }}>
                <div className="form-group" style={{ marginBottom: '.5rem' }}>
                  <label style={{ fontSize: '.75rem' }}>Front</label>
                  <input value={editFields.front} onChange={e => setEditFields(f => ({ ...f, front: e.target.value }))} />
                </div>
                <div className="form-group" style={{ marginBottom: '.5rem' }}>
                  <label style={{ fontSize: '.75rem' }}>Back</label>
                  <textarea value={editFields.back} onChange={e => setEditFields(f => ({ ...f, back: e.target.value }))} style={{ minHeight: 60 }} />
                </div>
                <div className="form-group" style={{ marginBottom: '.75rem' }}>
                  <label style={{ fontSize: '.75rem' }}>Topic</label>
                  <input value={editFields.topic} onChange={e => setEditFields(f => ({ ...f, topic: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: '.5rem' }}>
                  <button className="btn btn-primary btn-sm" onClick={() => saveEdit(card.id)}>Save</button>
                  <button className="btn btn-sm" onClick={() => setEditingCard(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="card-row-content">
                  <div className="card-row-front">{card.front}</div>
                  <span className="card-topic-tag">{card.topic}</span>
                </div>
                <button className="edit-btn" style={{ opacity: 1 }} title="Edit" onClick={() => startEdit(card)}>✏️</button>
                <button className="btn btn-danger btn-sm" onClick={() => deleteCard(card.id)}>×</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
