import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api.js';

const QUESTION_TIME = 15;
const TOTAL = 10;

export default function SpeedRoundPage() {
  const [searchParams] = useSearchParams();
  const unitId   = searchParams.get('unitId');
  const unitName = searchParams.get('unitName') ?? 'this unit';

  const [phase, setPhase]       = useState('loading'); // loading | error | countdown | playing | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]           = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [answers, setAnswers]   = useState([]);   // { correct, selected, answer }[]
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const timerRef = useRef(null);

  // Load questions
  useEffect(() => {
    const params = new URLSearchParams({ limit: TOTAL });
    if (unitId) params.set('unitId', unitId);
    api.get(`/games/questions?${params}`)
      .then(qs => {
        if (!qs.length) { setPhase('error'); return; }
        setQuestions(qs);
        setPhase('countdown');
      })
      .catch(() => setPhase('error'));
  }, [unitId]);

  // Countdown 3→2→1→Go
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown === 0) { setPhase('playing'); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  const advance = useCallback((picked) => {
    if (transitioning) return;
    setTransitioning(true);
    clearInterval(timerRef.current);

    const q = questions[idx];
    // options are "A) ...", "B) ..." etc.; correct_answer is just the letter.
    const correct = picked != null && picked[0] === q.correct_answer;
    const correctOption = (q.options ?? []).find(o => o[0] === q.correct_answer) ?? q.correct_answer;
    setAnswers(prev => [...prev, { questionId: q.id, prompt: q.prompt, selected: picked, correct_answer: correctOption, correct, topic: q.topic }]);
    setSelected(picked);

    setTimeout(() => {
      const next = idx + 1;
      if (next >= questions.length) {
        setPhase('done');
      } else {
        setIdx(next);
        setSelected(null);
        setTimeLeft(QUESTION_TIME);
        setTransitioning(false);
      }
    }, 900);
  }, [idx, questions, transitioning]);

  // Submit mastery update when game finishes
  useEffect(() => {
    if (phase !== 'done' || !answers.length) return;
    api.post('/games/results', {
      results: answers.map(a => ({ questionId: a.questionId, correct: a.correct })),
    }).catch(() => {});
  }, [phase]);

  // Per-question countdown timer
  useEffect(() => {
    if (phase !== 'playing' || transitioning) return;
    setTimeLeft(QUESTION_TIME);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          advance(null); // timed out → wrong
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase, idx, transitioning]);

  const score = answers.filter(a => a.correct).length;

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Loading questions…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🏃</p>
        <p><strong>No questions yet</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 280, margin: '.5rem auto 0' }}>
          Speed Round needs at least one completed MCQ quiz. Generate a quiz with "Multiple choice" enabled first.
        </p>
        <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
          <Link to={unitId ? `/units/${unitId}` : '/'} className="btn btn-ghost btn-sm">← Back</Link>
          {unitId && <Link to={`/units/${unitId}`} className="btn btn-primary btn-sm">Go generate a quiz →</Link>}
        </div>
      </div>
    </div>
  );

  if (phase === 'countdown') return (
    <div className="page game-page game-page--centered">
      <div className="game-countdown">
        <span className="game-countdown-num">{countdown === 0 ? 'Go!' : countdown}</span>
        <p className="game-countdown-sub">Speed Round — {questions.length} questions, {QUESTION_TIME}s each</p>
      </div>
    </div>
  );

  if (phase === 'done') {
    const pct = Math.round((score / answers.length) * 100);
    const msg = pct === 100 ? 'Perfect round! 🎉' : pct >= 80 ? 'Great job! 🔥' : pct >= 60 ? 'Solid effort 💪' : 'Keep grinding 📚';
    return (
      <div className="page game-page">
        <div className="game-result-header">
          <h1 className="game-result-score">{score}<span>/{answers.length}</span></h1>
          <p className="game-result-msg">{msg}</p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1rem' }}>
            <Link to={unitId ? `/units/${unitId}` : '/'} className="btn btn-ghost btn-sm">← Back</Link>
            <button className="btn btn-primary btn-sm" onClick={() => { setPhase('loading'); setIdx(0); setAnswers([]); setCountdown(3); setSelected(null); setTransitioning(false);
              const params = new URLSearchParams({ limit: TOTAL }); if (unitId) params.set('unitId', unitId);
              api.get(`/games/questions?${params}`).then(qs => { setQuestions(qs); setPhase('countdown'); }).catch(() => setPhase('error')); }}>
              Play again
            </button>
          </div>
        </div>
        <div className="game-answer-list">
          {answers.map((a, i) => (
            <div key={i} className={`game-answer-row ${a.correct ? 'game-answer-row--correct' : 'game-answer-row--wrong'}`}>
              <span className="game-answer-icon">{a.correct ? '✓' : '✗'}</span>
              <div>
                <p className="game-answer-prompt">{a.prompt}</p>
                {!a.correct && <p className="game-answer-hint">✓ {a.correct_answer}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[idx];
  const options = q.options ?? [];
  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft > 8 ? 'var(--primary)' : timeLeft > 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="page game-page">
      <div className="game-hud">
        <span className="game-hud-counter">{idx + 1} / {questions.length}</span>
        <div className="game-timer-bar">
          <div className="game-timer-fill" style={{ width: `${timerPct}%`, background: timerColor }} />
        </div>
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
            <button
              key={i}
              className={cls}
              disabled={selected !== null}
              onClick={() => advance(opt)}
            >
              <span className="game-option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
