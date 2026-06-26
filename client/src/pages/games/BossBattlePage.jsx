import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';

const MAX_QUESTIONS = 10;
const START_HEARTS = 3;

export default function BossBattlePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const topic    = searchParams.get('topic');
  const courseId = searchParams.get('courseId');

  // ── Picker mode (no topic selected) ──────────────────────────────────────
  if (!topic) return <BossPicker />;

  return <Battle topic={topic} courseId={courseId} navigate={navigate} />;
}

function BossPicker() {
  const [bosses, setBosses] = useState(null);

  useEffect(() => {
    api.get('/me/progress').then(data => {
      const weak = (data.progress ?? [])
        .flatMap(p => (p.topics ?? []).map(t => ({ ...t, courseId: p.course.id, courseName: p.course.name })))
        .filter(t => (t.mastery ?? 0) < 0.7)
        .sort((a, b) => (a.mastery ?? 0) - (b.mastery ?? 0));
      setBosses(weak);
    }).catch(() => setBosses([]));
  }, []);

  return (
    <div className="page">
      <div className="page-header"><h1>👾 Boss Battle</h1></div>
      <p style={{ color: 'var(--muted)', marginBottom: '1.25rem' }}>
        Pick a weak topic and fight a gauntlet of its questions. Survive with your hearts intact to defeat the boss — and watch your mastery climb.
      </p>

      {bosses === null && <p className="empty">Loading your bosses…</p>}
      {bosses?.length === 0 && (
        <div className="empty" style={{ marginTop: '2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🎉</p>
          <p><strong>No bosses right now</strong></p>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
            No topics under 70% mastery. Take a few quizzes to surface your weak spots, then come back to battle them.
          </p>
          <Link to="/games" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Games</Link>
        </div>
      )}

      {bosses?.length > 0 && (
        <div className="boss-list">
          {bosses.map(b => {
            const pct = Math.round((b.mastery ?? 0) * 100);
            return (
              <Link
                key={`${b.courseId}:${b.topic}`}
                to={`/games/boss?topic=${encodeURIComponent(b.topic)}&courseId=${b.courseId}`}
                className="boss-pick"
              >
                <span className="boss-pick-emoji">👾</span>
                <div className="boss-pick-info">
                  <span className="boss-pick-topic">{b.topic}</span>
                  <span className="boss-pick-course">{b.courseName} · {pct}% mastery</span>
                </div>
                <span className="boss-pick-go">Fight →</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Battle({ topic, courseId, navigate }) {
  const [phase, setPhase]   = useState('loading'); // loading | error | playing | won | lost
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx]       = useState(0);
  const [hearts, setHearts] = useState(START_HEARTS);
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [results, setResults] = useState([]); // {questionId, correct}[]

  useEffect(() => {
    const params = new URLSearchParams({ limit: MAX_QUESTIONS, topic });
    if (courseId) params.set('courseId', courseId);
    api.get(`/games/questions?${params}`)
      .then(qs => {
        if (!qs.length) { setPhase('error'); return; }
        setQuestions(qs);
        setPhase('playing');
      })
      .catch(() => setPhase('error'));
  }, [topic, courseId]);

  // Submit mastery once the battle ends. Fire on phase change only — depending on
  // `results` would post mid-game as answers accrue.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if ((phase === 'won' || phase === 'lost') && results.length) {
      api.post('/games/results', { results }).catch(() => {});
    }
  }, [phase]);

  const answer = useCallback((opt) => {
    if (transitioning || selected !== null) return;
    const q = questions[idx];
    const correct = opt[0] === q.correct_answer; // options are "A) ...", correct_answer is the letter
    setSelected(opt);
    setTransitioning(true);
    setResults(prev => [...prev, { questionId: q.id, correct }]);

    const heartsLeft = correct ? hearts : hearts - 1;
    if (!correct) setHearts(heartsLeft);

    setTimeout(() => {
      if (heartsLeft <= 0) { setPhase('lost'); return; }
      const next = idx + 1;
      if (next >= questions.length) { setPhase('won'); return; }
      setIdx(next);
      setSelected(null);
      setTransitioning(false);
    }, 750);
  }, [idx, questions, hearts, transitioning, selected]);

  if (phase === 'loading') return <div className="page game-page"><p className="empty">Summoning the boss…</p></div>;

  if (phase === 'error') return (
    <div className="page game-page">
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>👾</p>
        <p><strong>No questions for “{topic}”</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
          Boss Battle needs completed MCQ questions on this topic. Generate a quiz with Multiple choice covering it first.
        </p>
        <Link to="/games/boss" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Pick another boss</Link>
      </div>
    </div>
  );

  if (phase === 'won' || phase === 'lost') {
    const correct = results.filter(r => r.correct).length;
    const won = phase === 'won';
    return (
      <div className="page game-page game-page--centered">
        <div className="boss-result">
          <div style={{ fontSize: '3rem', marginBottom: '.5rem' }}>{won ? '🏆' : '💀'}</div>
          <h1 className="game-result-score" style={{ color: won ? 'var(--success)' : 'var(--danger)' }}>
            {won ? 'Boss defeated!' : 'The boss won'}
          </h1>
          <p className="game-result-msg">
            {correct}/{results.length} correct on <strong>{topic}</strong>
            {won ? ' — your mastery is climbing.' : ' — regroup and try again.'}
          </p>
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/games/boss" className="btn btn-ghost btn-sm">← Bosses</Link>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(0)}>Rematch</button>
          </div>
        </div>
      </div>
    );
  }

  // Playing
  const q = questions[idx];
  const options = q.options ?? [];
  const bossHpPct = 100 * (1 - idx / questions.length);

  return (
    <div className="page game-page">
      <div className="boss-hud">
        <div className="boss-hud-row">
          <span className="boss-name">👾 {topic}</span>
          <span className="boss-hearts">{'❤️'.repeat(hearts)}{'🖤'.repeat(START_HEARTS - hearts)}</span>
        </div>
        <div className="boss-hp-bar">
          <div className="boss-hp-fill" style={{ width: `${bossHpPct}%` }} />
        </div>
        <span className="boss-hud-counter">{idx + 1} / {questions.length}</span>
      </div>

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

      <p className="streak-hint">Lose a ❤️ for every wrong answer — survive the gauntlet to win</p>
    </div>
  );
}
