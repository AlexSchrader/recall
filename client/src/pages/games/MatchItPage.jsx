import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const PAIR_COUNT = 8;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function MatchItPage() {
  const [searchParams] = useSearchParams();
  const deckId = searchParams.get('deckId');

  // No deck in scope (launched from the Games hub) → let the player pick one.
  if (!deckId) return <MatchPicker />;
  return <MatchGame deckId={deckId} />;
}

function MatchPicker() {
  const [decks, setDecks] = useState(null);

  useEffect(() => {
    api.get('/flashcards/decks').then(setDecks).catch(() => setDecks([]));
  }, []);

  const playable = (decks ?? []).filter(d => (d.card_count ?? 0) >= 4);

  return (
    <div className="page">
      <div className="page-header"><h1>🃏 Match It</h1></div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Pair each term with its definition as fast as you can. Pick a deck to play.
      </p>

      {decks === null && <p className="empty">Loading your decks…</p>}

      {decks?.length > 0 && playable.length === 0 && (
        <div className="empty" style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🃏</p>
          <p><strong>No decks big enough yet</strong></p>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
            Match It needs a deck with at least 4 cards. Add more cards or generate a bigger deck, then come back.
          </p>
          <Link to="/games" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Games</Link>
        </div>
      )}

      {decks?.length === 0 && (
        <div className="empty" style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🃏</p>
          <p><strong>No flashcard decks yet</strong></p>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
            Open a unit and generate a flashcard deck first — then you can play Match It with it.
          </p>
          <Link to="/games" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Games</Link>
        </div>
      )}

      {playable.length > 0 && (
        <div className="boss-list">
          {playable.map(d => (
            <Link key={d.id} to={`/games/match?deckId=${d.id}`} className="boss-pick">
              <span className="boss-pick-emoji">🃏</span>
              <div className="boss-pick-info">
                <span className="boss-pick-topic">{d.name}</span>
                <span className="boss-pick-course">{d.course_name} · {d.unit_name} · {d.card_count} cards</span>
              </div>
              <span className="boss-pick-go">Play →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function MatchGame({ deckId }) {
  const [phase, setPhase]         = useState('loading'); // loading | error | playing | done
  const [fronts, setFronts]       = useState([]);  // [{id, text}] shuffled
  const [backs, setBacks]         = useState([]);  // [{id, text}] shuffled
  const [matched, setMatched]     = useState(new Set());
  const [selFront, setSelFront]   = useState(null); // selected front id
  const [wrong, setWrong]         = useState(null); // {front, back} ids during flash
  const [mistakes, setMistakes]   = useState(0);
  const [elapsed, setElapsed]     = useState(0);
  const cardsRef   = useRef([]);
  const startRef   = useRef(null);
  const timerRef   = useRef(null);

  const startGame = (allCards) => {
    const picked = shuffle(allCards).slice(0, Math.min(PAIR_COUNT, allCards.length));
    cardsRef.current = picked;
    setFronts(shuffle(picked.map(c => ({ id: c.id, text: c.front }))));
    setBacks(shuffle(picked.map(c => ({ id: c.id, text: c.back }))));
    setMatched(new Set());
    setSelFront(null);
    setWrong(null);
    setMistakes(0);
    setElapsed(0);
    startRef.current = Date.now();
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    setPhase('playing');
  };

  useEffect(() => {
    if (!deckId) { setPhase('error'); return; }
    api.get(`/flashcards/decks/${deckId}/cards`)
      .then(cards => {
        if (cards.length < 4) { setPhase('error'); return; }
        startGame(cards);
      })
      .catch(() => setPhase('error'));
    return () => clearInterval(timerRef.current);
  }, [deckId]);

  // Detect win
  useEffect(() => {
    if (phase !== 'playing' || matched.size === 0) return;
    if (matched.size === cardsRef.current.length) {
      clearInterval(timerRef.current);
      setPhase('done');
    }
  }, [matched, phase]);

  const tapFront = (id) => {
    if (matched.has(id) || wrong) return;
    setSelFront(prev => prev === id ? null : id);
  };

  const tapBack = (id) => {
    if (matched.has(id) || wrong || !selFront) return;
    if (selFront === id) {
      setMatched(prev => new Set([...prev, id]));
      setSelFront(null);
    } else {
      setMistakes(m => m + 1);
      setWrong({ front: selFront, back: id });
      setTimeout(() => { setWrong(null); setSelFront(null); }, 700);
    }
  };

  const playAgain = () => {
    api.get(`/flashcards/decks/${deckId}/cards`)
      .then(startGame)
      .catch(() => setPhase('error'));
  };

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Loading cards…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⚡️</p>
        <p><strong>Not enough cards</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 280, margin: '.5rem auto 0' }}>
          Match It needs at least 4 flashcards. Generate a deck from your documents first.
        </p>
        <Link to={deckId ? `/flashcards/decks/${deckId}` : '/'} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Back to deck</Link>
      </div>
    </div>
  );

  if (phase === 'done') {
    const msg = mistakes === 0 ? 'Perfect match! 🎉'
      : mistakes <= 2 ? 'Great job! 💪'
      : mistakes <= 5 ? 'Solid effort 👍'
      : 'Keep at it 📚';
    return (
      <div className="page game-page game-page--centered">
        <div className="match-result">
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>⚡️</div>
          <h1 className="game-result-score">{cardsRef.current.length}<span> pairs</span></h1>
          <p className="game-result-msg">{msg}</p>
          <div className="match-result-stats">
            <div>
              <div className="match-stat-num" style={{ color: mistakes === 0 ? 'var(--success)' : 'var(--danger)' }}>{mistakes}</div>
              <div className="match-stat-lbl">mistakes</div>
            </div>
            <div>
              <div className="match-stat-num">{formatTime(elapsed)}</div>
              <div className="match-stat-lbl">time</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1.25rem' }}>
            <Link to={`/flashcards/decks/${deckId}`} className="btn btn-ghost btn-sm">← Back to deck</Link>
            <button className="btn btn-primary btn-sm" onClick={playAgain}>Play again</button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  const total = cardsRef.current.length;
  const hint = selFront ? 'Now tap a definition on the right →' : 'Tap a term on the left to start';

  return (
    <div className="page game-page">
      <div className="game-hud">
        <span className="game-hud-counter">{matched.size} / {total} matched</span>
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{formatTime(elapsed)}</span>
        {mistakes > 0 && <span style={{ color: 'var(--danger)', fontSize: '.85rem' }}>{mistakes} ✗</span>}
      </div>

      <p className="match-hint">{hint}</p>

      <div className="match-grid">
        <div className="match-col">
          {fronts.map(f => {
            let cls = 'match-card';
            if (matched.has(f.id))    cls += ' match-card--matched';
            else if (selFront === f.id) cls += ' match-card--selected';
            else if (wrong?.front === f.id) cls += ' match-card--wrong';
            return (
              <button key={f.id} className={cls} onClick={() => tapFront(f.id)} disabled={matched.has(f.id)}>
                {f.text}
              </button>
            );
          })}
        </div>

        <div className="match-col">
          {backs.map(b => {
            let cls = 'match-card match-card--def';
            if (matched.has(b.id))    cls += ' match-card--matched';
            else if (wrong?.back === b.id) cls += ' match-card--wrong';
            else if (selFront && !matched.has(b.id)) cls += ' match-card--ready';
            return (
              <button key={b.id} className={cls} onClick={() => tapBack(b.id)} disabled={matched.has(b.id) || !selFront}>
                {b.text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
