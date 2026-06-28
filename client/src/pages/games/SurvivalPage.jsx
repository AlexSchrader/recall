import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const BATCH = 20;
const START_HEARTS = 3;
const LEVEL_EVERY = 5;          // correct answers per level
const START_TIME = 15;          // seconds for level 1
const MIN_TIME = 5;             // floor — never tighter than this
const STEP = 2;                 // seconds shaved off per level

const timeForLevel = (lvl) => Math.max(MIN_TIME, START_TIME - (lvl - 1) * STEP);

export default function SurvivalPage() {
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get('unitId');
  const seen = useRef(new Set());
  const transitioning = useRef(false);
  const tickRef = useRef(null);

  const [phase, setPhase]       = useState('loading'); // loading | error | playing | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]           = useState(0);
  const [hearts, setHearts]     = useState(START_HEARTS);
  const [score, setScore]       = useState(0);
  const [total, setTotal]       = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults]   = useState([]);
  const [timedOut, setTimedOut] = useState(false);
  const [bestLevel, setBestLevel] = useState(1);

  const level = Math.floor(score / LEVEL_EVERY) + 1;
  const limit = timeForLevel(level);
  const [qTime, setQTime] = useState(START_TIME);

  const fetchBatch = useCallback(() => {
    const params = new URLSearchParams({ limit: BATCH });
    if (unitId) params.set('unitId', unitId);
    return api.get(`/games/questions?${params}`);
  }, [unitId]);

  const start = useCallback(() => {
    seen.current = new Set(); transitioning.current = false;
    setHearts(START_HEARTS); setScore(0); setTotal(0); setResults([]); setIdx(0);
    setSelected(null); setTimedOut(false); setBestLevel(1); setQTime(START_TIME);
    setPhase('loading');
    fetchBatch()
      .then(qs => { if (!qs.length) { setPhase('error'); return; } setQuestions(qs); setPhase('playing'); })
      .catch(() => setPhase('error'));
  }, [fetchBatch]);

  useEffect(() => { start(); }, [start]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (phase === 'done' && results.length) api.post('/games/results', { results, source: 'survival' }).catch(() => {}); }, [phase]);

  // advance to the next unseen question (or end), after a brief reveal
  const advance = useCallback((heartsLeft) => {
    setTimeout(() => {
      if (heartsLeft <= 0) { setPhase('done'); return; }
      setIdx(prevIdx => {
        let next = prevIdx + 1;
        while (next < questions.length && seen.current.has(questions[next].id)) next++;
        if (next >= questions.length) {
          fetchBatch().then(qs => {
            const fresh = qs.filter(x => !seen.current.has(x.id));
            if (!fresh.length) { setPhase('done'); return; }
            setQuestions(fresh); setIdx(0); setSelected(null); setTimedOut(false);
            setQTime(timeForLevel(level)); transitioning.current = false;
          }).catch(() => setPhase('done'));
          return prevIdx;
        }
        setSelected(null); setTimedOut(false); setQTime(timeForLevel(level));
        transitioning.current = false;
        return next;
      });
    }, 700);
  }, [questions, fetchBatch, level]);

  const resolve = useCallback((opt) => {
    const q = questions[idx];
    if (!q) return;
    const correct = opt !== null && opt[0] === q.correct_answer;
    seen.current.add(q.id);
    transitioning.current = true;
    setSelected(opt);
    setTotal(t => t + 1);
    setResults(prev => [...prev, { questionId: q.id, correct }]);
    const heartsLeft = correct ? hearts : hearts - 1;
    if (correct) {
      setScore(s => { const ns = s + 1; setBestLevel(b => Math.max(b, Math.floor(ns / LEVEL_EVERY) + 1)); return ns; });
    } else {
      setHearts(heartsLeft);
    }
    advance(heartsLeft);
  }, [questions, idx, hearts, advance]);

  const answer = (opt) => {
    if (transitioning.current || selected !== null || phase !== 'playing') return;
    resolve(opt);
  };

  // per-question countdown — running out costs a heart
  useEffect(() => {
    if (phase !== 'playing' || selected !== null || transitioning.current) return;
    tickRef.current = setInterval(() => {
      setQTime(t => {
        if (t <= 1) {
          clearInterval(tickRef.current);
          setTimedOut(true);
          resolve(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, [phase, selected, idx, resolve]);

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Loading…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>❤️</p>
        <p><strong>No questions yet</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 280, margin: '.5rem auto 0' }}>
          Survival needs at least one completed MCQ quiz. Generate a quiz with Multiple choice first.
        </p>
        <Link to={unitId ? `/units/${unitId}` : '/games'} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Back</Link>
      </div>
    </div>
  );

  if (phase === 'done') {
    const msg = score >= 20 ? 'Incredible endurance! 🏆' : score >= 10 ? 'Strong run! 🔥' : score >= 5 ? 'Not bad 💪' : 'Shake it off — try again 📚';
    return (
      <div className="page game-page game-page--centered">
        <div className="game-result-header">
          <div style={{ fontSize: '2.5rem', marginBottom: '.25rem' }}>🖤</div>
          <h1 className="game-result-score">{score}<span> survived</span></h1>
          <p className="game-result-msg">{msg}</p>
          <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Reached level {bestLevel} · {total} answered</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            <Link to="/games" className="btn btn-ghost btn-sm">← Games</Link>
            <button className="btn btn-primary btn-sm" onClick={start}>Play again</button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const options = q.options ?? [];
  const timerPct = Math.min(100, (qTime / limit) * 100);
  const timerColor = qTime > limit * 0.5 ? 'var(--primary)' : qTime > limit * 0.25 ? '#f59e0b' : '#ef4444';
  const toNext = LEVEL_EVERY - (score % LEVEL_EVERY);

  return (
    <div className="page game-page">
      <div className="game-hud">
        <span className="game-hud-counter">⚡ {score}</span>
        <span className="game-hud-level">Lv {level}</span>
        <span className="boss-hearts">{'❤️'.repeat(hearts)}{'🖤'.repeat(START_HEARTS - hearts)}</span>
      </div>

      <div className="game-timer-bar" style={{ marginBottom: '1rem' }}>
        <div className="game-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
      </div>

      <div className="game-topic">{q.topic}</div>
      <h2 className="game-prompt">{q.prompt}</h2>

      <div className="game-options">
        {options.map((opt, i) => {
          let cls = 'game-option';
          if (selected !== null || timedOut) {
            if (opt[0] === q.correct_answer) cls += ' game-option--correct';
            else if (opt === selected) cls += ' game-option--wrong';
          }
          return (
            <button key={i} className={cls} disabled={selected !== null || timedOut} onClick={() => answer(opt)}>
              <span className="game-option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>

      <p className="streak-hint">
        {timedOut ? '⏱️ Out of time — heart lost!' : `${limit}s per question · ${toNext} more to level ${level + 1} (faster clock)`}
      </p>
    </div>
  );
}
