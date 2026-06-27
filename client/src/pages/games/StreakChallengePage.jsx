import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const BATCH = 20; // fetch more than needed; served one at a time

export default function StreakChallengePage() {
  const [searchParams] = useSearchParams();
  const unitId   = searchParams.get('unitId');

  const seenIds = useRef(new Set()); // question IDs already shown this session — no repeats
  const [phase, setPhase]       = useState('loading');
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]           = useState(0);
  const [streak, setStreak]     = useState(0);
  const [best, setBest]         = useState(0);
  const [total, setTotal]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [gameResults, setGameResults] = useState([]); // {questionId, correct}[]

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: BATCH });
    if (unitId) params.set('unitId', unitId);
    api.get(`/games/questions?${params}`)
      .then(qs => {
        if (!qs.length) { setPhase('error'); return; }
        seenIds.current = new Set();
        setQuestions(qs);
        setIdx(0);
        setStreak(0);
        setBest(0);
        setTotal(0);
        setSelected(null);
        setTransitioning(false);
        setGameResults([]);
        setPhase('playing');
      })
      .catch(() => setPhase('error'));
  }, [unitId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (phase !== 'done' || !gameResults.length) return;
    api.post('/games/results', { results: gameResults, source: 'streak' }).catch(() => {});
  }, [phase]);

  const answer = useCallback((opt) => {
    if (transitioning || selected !== null) return;
    const q = questions[idx];
    // options are "A) ...", "B) ..." etc.; correct_answer is just the letter.
    const correct = opt[0] === q.correct_answer;
    seenIds.current.add(q.id);
    setSelected(opt);
    setTotal(t => t + 1);
    setGameResults(prev => [...prev, { questionId: q.id, correct }]);

    setTimeout(() => {
      if (!correct) {
        setPhase('done');
        return;
      }
      const newStreak = streak + 1;
      setStreak(newStreak);
      setBest(b => Math.max(b, newStreak));
      // Skip any already-seen questions left in the current batch.
      let next = idx + 1;
      while (next < questions.length && seenIds.current.has(questions[next].id)) next++;
      if (next >= questions.length) {
        // refetch more questions seamlessly, dropping ones already seen this session
        setTransitioning(true);
        const params = new URLSearchParams({ limit: BATCH });
        if (unitId) params.set('unitId', unitId);
        api.get(`/games/questions?${params}`).then(qs => {
          const fresh = qs.filter(x => !seenIds.current.has(x.id));
          if (!fresh.length) { setPhase('done'); return; } // exhausted the pool — end on a high note
          setQuestions(fresh);
          setIdx(0);
          setSelected(null);
          setTransitioning(false);
        }).catch(() => setPhase('done'));
      } else {
        setIdx(next);
        setSelected(null);
        setTransitioning(false);
      }
    }, 700);
  }, [idx, questions, streak, transitioning, selected, unitId]);

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Loading…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🔥</p>
        <p><strong>No questions yet</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 280, margin: '.5rem auto 0' }}>
          Streak Challenge needs at least one completed MCQ quiz. Generate a quiz with &quot;Multiple choice&quot; enabled first.
        </p>
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link to={unitId ? `/units/${unitId}` : '/'} className="btn btn-ghost btn-sm">← Back</Link>
          {unitId && <Link to={`/units/${unitId}`} className="btn btn-primary btn-sm">Go generate a quiz →</Link>}
        </div>
      </div>
    </div>
  );

  if (phase === 'done') {
    const msg = streak === 0 && total === 1 ? 'Tough start — try again!'
      : best >= 15 ? `Incredible — ${best} in a row! 🏆`
      : best >= 10 ? `On fire! ${best} correct 🔥`
      : best >= 5  ? `Nice chain — ${best} in a row 💪`
      : `Chain of ${best} — keep at it 📚`;
    return (
      <div className="page game-page game-page--centered">
        <div className="streak-result">
          <div className="streak-result-icon">🔥</div>
          <h1 className="streak-result-num">{best}</h1>
          <p className="streak-result-label">longest streak</p>
          <p className="streak-result-msg">{msg}</p>
          <p className="streak-result-total">{total} answered total</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
            <Link to={unitId ? `/units/${unitId}` : '/'} className="btn btn-ghost btn-sm">← Back</Link>
            <button className="btn btn-primary btn-sm" onClick={load}>Try again</button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[idx];
  const options = q.options ?? [];

  return (
    <div className="page game-page">
      <div className="game-hud">
        <span className="game-hud-counter" style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Q {total + 1}</span>
        <div className="streak-badge-large">🔥 {streak}</div>
      </div>

      <div className="game-topic">{q.topic}</div>
      <h2 className="game-prompt">{q.prompt}</h2>

      <div className="game-options">
        {options.map((opt, i) => {
          let cls = 'game-option';
          if (selected !== null) {
            if (opt[0] === q.correct_answer) cls += ' game-option--correct';
            else if (opt === selected) cls += ' game-option--wrong';
          }
          return (
            <button key={i} className={cls} disabled={selected !== null} onClick={() => answer(opt)}>
              <span className="game-option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      <p className="streak-hint">One wrong answer ends the round</p>
    </div>
  );
}
