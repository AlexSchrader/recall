import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Confetti from '../components/Confetti.jsx';

// Daily Mix — the "I have 5 minutes" session. Interleaves due flashcards with
// multiple-choice questions drawn from your quizzes, so a single tap gives a
// blended review across everything. Reuses the flashcard-review and games
// backends; MCQ answers feed mastery via /games/results (source 'daily_mix').

const CARD_LIMIT = 12;
const MCQ_LIMIT = 12;
const MAX_ITEMS = 20;

function interleave(cards, mcqs) {
  const out = [];
  let ci = 0, mi = 0;
  // Alternate, starting with a question so it doesn't feel like plain review.
  while ((ci < cards.length || mi < mcqs.length) && out.length < MAX_ITEMS) {
    if (mi < mcqs.length) out.push({ kind: 'mcq', data: mcqs[mi++] });
    if (out.length >= MAX_ITEMS) break;
    if (ci < cards.length) out.push({ kind: 'card', data: cards[ci++] });
  }
  return out;
}

export default function DailyMixPage() {
  const { refreshUser } = useAuth();

  const [phase, setPhase] = useState('loading'); // loading | empty | playing | done
  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selected, setSelected] = useState(null);
  const transitioning = useRef(false);

  const [cardsDone, setCardsDone] = useState(0);
  const [mcqCorrect, setMcqCorrect] = useState(0);
  const [mcqTotal, setMcqTotal] = useState(0);
  const mcqResults = useRef([]); // {questionId, correct}[]

  useEffect(() => {
    Promise.all([
      api.get(`/flashcards/due?limit=${CARD_LIMIT}`).catch(() => []),
      api.get(`/games/questions?limit=${MCQ_LIMIT}`).catch(() => []),
    ]).then(([cards, mcqs]) => {
      const q = interleave(cards ?? [], mcqs ?? []);
      if (!q.length) { setPhase('empty'); return; }
      setQueue(q);
      setPhase('playing');
    }).catch(() => setPhase('empty'));
  }, []);

  const finish = useCallback(() => {
    setPhase('done');
    if (mcqResults.current.length) {
      api.post('/games/results', { results: mcqResults.current, source: 'daily_mix' }).catch(() => {});
    }
    refreshUser().catch(() => {});
  }, [refreshUser]);

  const advance = useCallback(() => {
    const next = idx + 1;
    if (next >= queue.length) { finish(); return; }
    setIdx(next); setFlipped(false); setSelected(null); transitioning.current = false;
  }, [idx, queue.length, finish]);

  const rateCard = async (rating) => {
    if (transitioning.current) return;
    transitioning.current = true;
    const card = queue[idx].data;
    api.post(`/flashcards/cards/${card.id}/review`, { rating }).catch(() => {});
    setCardsDone(n => n + 1);
    advance();
  };

  const answerMcq = (opt) => {
    if (transitioning.current || selected !== null) return;
    const q = queue[idx].data;
    const correct = opt[0] === q.correct_answer;
    transitioning.current = true;
    setSelected(opt);
    setMcqTotal(n => n + 1);
    if (correct) setMcqCorrect(n => n + 1);
    mcqResults.current.push({ questionId: q.id, correct });
    setTimeout(advance, 650);
  };

  // Keyboard: Space flips a card; 1–4 rate a card / pick an MCQ option.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (phase !== 'playing') return;
    const item = queue[idx];
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (item.kind === 'card') {
        if (e.code === 'Space') { e.preventDefault(); if (!flipped) setFlipped(true); }
        else if (flipped && ['1', '2', '3', '4'].includes(e.key)) {
          rateCard(['again', 'hard', 'good', 'easy'][Number(e.key) - 1]);
        }
      } else if (item.kind === 'mcq' && selected === null) {
        const opts = item.data.options ?? [];
        const n = Number(e.key);
        if (n >= 1 && n <= opts.length) answerMcq(opts[n - 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, idx, flipped, selected, queue]);

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Building your mix…</p></div>;

  if (phase === 'empty') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🧩</p>
        <p><strong>Nothing to mix yet</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
          Daily Mix blends due flashcards with quiz questions. Generate a quiz or a flashcard deck, then come back.
        </p>
        <Link to="/" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Home</Link>
      </div>
    </div>
  );

  if (phase === 'done') {
    const pct = mcqTotal ? Math.round((mcqCorrect / mcqTotal) * 100) : null;
    return (
      <>
        <Confetti />
        <div className="session-complete">
          <div className="complete-icon">🎉</div>
          <h2>Daily Mix done!</h2>
          <p className="complete-msg">Nice — a little bit of everything keeps it all fresh.</p>
          <div className="session-stats">
            <div className="session-stat">
              <div className="stat-num" style={{ color: 'var(--primary)' }}>{cardsDone}</div>
              <div className="stat-lbl">cards</div>
            </div>
            <div className="session-stat">
              <div className="stat-num" style={{ color: 'var(--success)' }}>{mcqCorrect}/{mcqTotal}</div>
              <div className="stat-lbl">questions</div>
            </div>
            {pct != null && (
              <div className="session-stat">
                <div className="stat-num">{pct}%</div>
                <div className="stat-lbl">accuracy</div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-ghost">Back home</Link>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Another round</button>
          </div>
        </div>
      </>
    );
  }

  const item = queue[idx];
  const progress = idx / queue.length;

  return (
    <div className="page game-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{idx + 1} / {queue.length}</span>
        <div className="fc-progress" style={{ flex: 1 }}>
          <div className="fc-progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="daily-mix-tag">{item.kind === 'card' ? '🃏 Card' : '❓ Quiz'}</span>
      </div>

      {item.kind === 'card' ? (
        <>
          <div className="fc-scene" onClick={() => !flipped && setFlipped(true)}>
            <div className={`fc-card ${flipped ? 'flipped' : ''}`}>
              <div className="fc-face fc-front">
                <span className="fc-topic">{item.data.topic}</span>
                <div className="fc-text">{item.data.front}</div>
                {!flipped && <div className="fc-hint">Tap or press Space to reveal</div>}
              </div>
              <div className="fc-face fc-back">
                <span className="fc-topic">{item.data.topic}</span>
                <div className="fc-text">{item.data.back}</div>
              </div>
            </div>
          </div>
          {flipped && (
            <div className="fc-rating-row">
              {[
                { rating: 'again', label: 'Again', cls: 'rating-again' },
                { rating: 'hard', label: 'Hard', cls: 'rating-hard' },
                { rating: 'good', label: 'Good', cls: 'rating-good' },
                { rating: 'easy', label: 'Easy', cls: 'rating-easy' },
              ].map(({ rating, label, cls }) => (
                <button key={rating} className={`rating-btn ${cls}`} onClick={() => rateCard(rating)}>{label}</button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="game-topic">{item.data.topic}</div>
          <h2 className="game-prompt">{item.data.prompt}</h2>
          <div className="game-options">
            {(item.data.options ?? []).map((opt, i) => {
              let cls = 'game-option';
              if (selected !== null) {
                if (opt[0] === item.data.correct_answer) cls += ' game-option--correct';
                else if (opt === selected) cls += ' game-option--wrong';
              }
              return (
                <button key={i} className={cls} disabled={selected !== null} onClick={() => answerMcq(opt)}>
                  <span className="game-option-letter">{String.fromCharCode(65 + i)}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
