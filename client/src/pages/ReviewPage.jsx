import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const CONFETTI_COLORS = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0ea5e9', '#ec4899', '#8b5cf6'];

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (Math.random() * 1.2).toFixed(2),
      rotStart: Math.floor(Math.random() * 360),
      rotEnd: Math.floor(Math.random() * 720),
      w: 8 + Math.floor(Math.random() * 8),
    })), []);

  return (
    <div className="confetti-wrap" aria-hidden>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}vw`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            width: p.w,
            height: p.w * 1.5,
            '--rot-start': `${p.rotStart}deg`,
            '--rot-end': `${p.rotEnd}deg`,
          }}
        />
      ))}
    </div>
  );
}

function intervalLabel(card, rating) {
  const ease = card.ease ?? 2.5;
  const reps = card.repetitions ?? 0;
  const interval = card.interval_days ?? 0;
  let days;
  switch (rating) {
    case 'again': days = 0; break;
    case 'hard': days = Math.max(1, Math.round((interval || 1) * 1.2)); break;
    case 'good':
      if (reps === 0) days = 1;
      else if (reps === 1) days = 6;
      else days = Math.round(interval * ease);
      break;
    case 'easy':
      if (reps === 0) days = 1;
      else if (reps === 1) days = 6;
      else days = Math.round(interval * ease);
      days = Math.round(days * 1.3);
      break;
  }
  if (days === 0) return '<1m';
  if (days === 1) return '1d';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

function motivationalMessage(results) {
  const total = results.length;
  if (total === 0) return '';
  const good = results.filter(r => r === 'good' || r === 'easy').length;
  const pct = good / total;
  if (pct >= 0.9) return "Crushing it! Your brain is locking these in.";
  if (pct >= 0.7) return "Great session! You're making real progress.";
  if (pct >= 0.5) return "Good effort — the tricky ones are working their way in.";
  return "Tough session, but that's how it works. Keep going and Rappel can help explain any that didn't click.";
}

export default function ReviewPage({ daily = false }) {
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  // In daily mode there's no single deck — review pulls due cards from every
  // deck, and "back" returns home rather than to a deck page.
  const backTo = daily ? '/' : `/flashcards/decks/${deckId}`;

  const [deck, setDeck] = useState(null);
  const [cards, setCards] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]); // array of rating strings in order
  const [sessionComplete, setSessionComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [askingRappel, setAskingRappel] = useState(false);

  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 30;

  useEffect(() => {
    const load = daily
      ? api.get(`/flashcards/due?limit=${limit}`).then(c => { setDeck({ name: 'Daily Review' }); setCards(c); })
      : Promise.all([
          api.get(`/flashcards/decks/${deckId}`),
          api.get(`/flashcards/decks/${deckId}/due?limit=${limit}`),
        ]).then(([d, c]) => { setDeck(d); setCards(c); });
    load.catch(() => navigate('/')).finally(() => setLoading(false));
  }, [deckId, daily]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (sessionComplete || loading) return;
      if (e.code === 'Space') { e.preventDefault(); if (!flipped) setFlipped(true); }
      if (flipped) {
        if (e.key === '1') rate('again');
        if (e.key === '2') rate('hard');
        if (e.key === '3') rate('good');
        if (e.key === '4') rate('easy');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [flipped, sessionComplete, loading, currentIdx]);

  const rate = async (rating) => {
    const card = cards[currentIdx];
    try {
      await api.post(`/flashcards/cards/${card.id}/review`, { rating });
    } catch {
      // continue even if review fails; don't block user
    }
    const newResults = [...results, rating];
    setResults(newResults);
    const next = currentIdx + 1;
    if (next >= cards.length) {
      setSessionComplete(true);
      refreshUser().catch(() => {});
    } else {
      setCurrentIdx(next);
      setFlipped(false);
    }
  };

  const askRappel = async (weakCards) => {
    setAskingRappel(true);
    const cardList = weakCards.map(c => `• ${c.front}`).join('\n');
    const prompt = weakCards.length > 0
      ? `I just reviewed flashcards for "${deck.name}" and struggled with these:\n${cardList}\n\nCan you explain these concepts clearly for me?`
      : `I just finished reviewing my "${deck.name}" flashcards. Can you quiz me or expand on anything from this topic?`;
    try {
      const thread = await api.post('/chat/threads', { title: `${deck.name} — help needed` });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(prompt)}`);
    } catch {
      navigate('/chat');
    }
  };

  if (loading) return null;

  if (cards.length === 0) {
    return (
      <>
        <p className="breadcrumb"><Link to={backTo}>← {daily ? 'Home' : deck?.name}</Link></p>
        <div className="session-complete">
          <div className="complete-icon">✅</div>
          <h2>All caught up!</h2>
          <p className="complete-msg">No cards are due right now. Come back later — your brain needs time to consolidate.</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => navigate(backTo)}>{daily ? 'Back home' : 'Back to deck'}</button>
            <button className="btn btn-primary" onClick={() => askRappel([])}>Chat with Rappel</button>
          </div>
        </div>
      </>
    );
  }

  if (sessionComplete) {
    const counts = {
      again: results.filter(r => r === 'again').length,
      hard: results.filter(r => r === 'hard').length,
      good: results.filter(r => r === 'good').length,
      easy: results.filter(r => r === 'easy').length,
    };
    const weakCards = cards.filter((_, i) => results[i] === 'again' || results[i] === 'hard');
    const msg = motivationalMessage(results);

    return (
      <>
        <Confetti />
        <div className="session-complete">
          <div className="complete-icon">🎉</div>
          <h2>Session complete!</h2>
          <p className="complete-msg">{msg}</p>
          <div className="session-stats">
            {counts.again > 0 && (
              <div className="session-stat">
                <div className="stat-num" style={{ color: 'var(--danger)' }}>{counts.again}</div>
                <div className="stat-lbl">Again</div>
              </div>
            )}
            {counts.hard > 0 && (
              <div className="session-stat">
                <div className="stat-num" style={{ color: 'var(--warning)' }}>{counts.hard}</div>
                <div className="stat-lbl">Hard</div>
              </div>
            )}
            {counts.good > 0 && (
              <div className="session-stat">
                <div className="stat-num" style={{ color: 'var(--primary)' }}>{counts.good}</div>
                <div className="stat-lbl">Good</div>
              </div>
            )}
            {counts.easy > 0 && (
              <div className="session-stat">
                <div className="stat-num" style={{ color: 'var(--success)' }}>{counts.easy}</div>
                <div className="stat-lbl">Easy</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => navigate(backTo)}>{daily ? 'Back home' : 'Back to deck'}</button>
            {weakCards.length > 0 && (
              <button className="btn btn-primary" onClick={() => askRappel(weakCards)} disabled={askingRappel}>
                {askingRappel ? 'Opening…' : `Ask Rappel about ${weakCards.length} tricky card${weakCards.length !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const card = cards[currentIdx];
  const progress = currentIdx / cards.length;

  return (
    <>
      <p className="breadcrumb"><Link to={backTo}>← {daily ? 'Home' : deck?.name}</Link></p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.25rem' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{currentIdx + 1} / {cards.length}</span>
        <div className="fc-progress" style={{ flex: 1 }}>
          <div className="fc-progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      <div className="fc-scene" onClick={() => !flipped && setFlipped(true)}>
        <div className={`fc-card ${flipped ? 'flipped' : ''}`}>
          <div className="fc-face fc-front">
            <span className="fc-topic">{card.topic}</span>
            <div className="fc-text">{card.front}</div>
            {!flipped && <div className="fc-hint">Tap or press Space to reveal</div>}
          </div>
          <div className="fc-face fc-back">
            <span className="fc-topic">{card.topic}</span>
            <div className="fc-text">{card.back}</div>
          </div>
        </div>
      </div>

      {flipped ? (
        <>
          <div className="fc-rating-row">
            {[
              { rating: 'again', label: 'Again', cls: 'rating-again', key: '1' },
              { rating: 'hard', label: 'Hard', cls: 'rating-hard', key: '2' },
              { rating: 'good', label: 'Good', cls: 'rating-good', key: '3' },
              { rating: 'easy', label: 'Easy', cls: 'rating-easy', key: '4' },
            ].map(({ rating, label, cls, key }) => (
              <button key={rating} className={`rating-btn ${cls}`} onClick={() => rate(rating)}>
                {label}
                <span className="interval-lbl">{intervalLabel(card, rating)}</span>
                <span className="interval-lbl" style={{ color: 'var(--border)', fontSize: '.65rem' }}>[{key}]</span>
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '.75rem' }}>
            <button
              className="btn btn-ghost btn-sm fc-ask-btn"
              onClick={() => askRappel([card])}
              disabled={askingRappel}
            >
              {askingRappel ? 'Opening Rappel…' : "Don't get it? Ask Rappel →"}
            </button>
          </div>
        </>
      ) : (
        <p className="fc-flip-hint">Keyboard: Space = flip · 1/2/3/4 = rate after flipping</p>
      )}
    </>
  );
}
