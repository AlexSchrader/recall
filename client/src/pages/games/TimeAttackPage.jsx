import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const DURATION = 60;
const BATCH = 20;

export default function TimeAttackPage() {
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get('unitId');
  const seen = useRef(new Set());
  const transitioning = useRef(false);
  const timerRef = useRef(null);

  const [phase, setPhase]       = useState('loading'); // loading | error | countdown | playing | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [score, setScore]       = useState(0);
  const [total, setTotal]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [results, setResults]   = useState([]);

  const fetchBatch = useCallback(() => {
    const params = new URLSearchParams({ limit: BATCH });
    if (unitId) params.set('unitId', unitId);
    return api.get(`/games/questions?${params}`);
  }, [unitId]);

  useEffect(() => {
    fetchBatch()
      .then(qs => { if (!qs.length) { setPhase('error'); return; } seen.current = new Set(); setQuestions(qs); setPhase('countdown'); })
      .catch(() => setPhase('error'));
  }, [fetchBatch]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) { setPhase('playing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  useEffect(() => {
    if (phase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => { if (t <= 1) { clearInterval(timerRef.current); setPhase('done'); return 0; } return t - 1; });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'done' && results.length) api.post('/games/results', { results, source: 'time_attack' }).catch(() => {}); }, [phase]);

  const answer = (opt) => {
    if (transitioning.current || selected !== null || phase !== 'playing') return;
    const q = questions[idx];
    const correct = opt[0] === q.correct_answer;
    seen.current.add(q.id);
    transitioning.current = true;
    setSelected(opt);
    setTotal(t => t + 1);
    if (correct) setScore(s => s + 1);
    setResults(prev => [...prev, { questionId: q.id, correct }]);

    setTimeout(() => {
      let next = idx + 1;
      while (next < questions.length && seen.current.has(questions[next].id)) next++;
      if (next >= questions.length) {
        fetchBatch().then(qs => {
          const fresh = qs.filter(x => !seen.current.has(x.id));
          if (!fresh.length) { setPhase('done'); return; }
          setQuestions(fresh); setIdx(0); setSelected(null); transitioning.current = false;
        }).catch(() => { setSelected(null); transitioning.current = false; });
      } else {
        setIdx(next); setSelected(null); transitioning.current = false;
      }
    }, 500);
  };

  const restart = () => {
    seen.current = new Set(); transitioning.current = false;
    setScore(0); setTotal(0); setResults([]); setIdx(0); setTimeLeft(DURATION); setSelected(null); setCountdown(3);
    setPhase('loading');
    fetchBatch().then(qs => { if (!qs.length) { setPhase('error'); return; } setQuestions(qs); setPhase('countdown'); }).catch(() => setPhase('error'));
  };

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Loading…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>⏱️</p>
        <p><strong>No questions yet</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 280, margin: '.5rem auto 0' }}>
          Time Attack needs at least one completed MCQ quiz. Generate a quiz with Multiple choice first.
        </p>
        <Link to={unitId ? `/units/${unitId}` : '/games'} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Back</Link>
      </div>
    </div>
  );

  if (phase === 'countdown') return (
    <div className="page game-page game-page--centered">
      <div className="game-countdown">
        <span className="game-countdown-num">{countdown === 0 ? 'Go!' : countdown}</span>
        <p className="game-countdown-sub">Time Attack — {DURATION} seconds, as many as you can</p>
      </div>
    </div>
  );

  if (phase === 'done') {
    const pct = total ? Math.round((score / total) * 100) : 0;
    const msg = score >= 25 ? 'Lightning fast! ⚡' : score >= 15 ? 'Great pace! 🔥' : score >= 8 ? 'Solid run 💪' : 'Keep at it 📚';
    return (
      <div className="page game-page game-page--centered">
        <div className="game-result-header">
          <h1 className="game-result-score">{score}<span> correct</span></h1>
          <p className="game-result-msg">{msg}</p>
          <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{total} answered · {pct}% accuracy</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <Link to="/games" className="btn btn-ghost btn-sm">← Games</Link>
            <button className="btn btn-primary btn-sm" onClick={restart}>Play again</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const options = q.options ?? [];
  const timerPct = (timeLeft / DURATION) * 100;
  const timerColor = timeLeft > 20 ? 'var(--primary)' : timeLeft > 8 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page game-page">
      <div className="game-hud">
        <span className="game-hud-counter">⚡ {score}</span>
        <div className="game-timer-bar"><div className="game-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} /></div>
        <span className="game-hud-time" style={{ color: timerColor }}>{timeLeft}s</span>
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
    </div>
  );
}
