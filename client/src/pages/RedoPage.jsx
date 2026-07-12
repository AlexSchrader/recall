import { useState, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import Confetti from '../components/Confetti.jsx';

// "Redo my mistakes" — re-drills only the questions missed on a quiz, while
// they're still fresh. Fully client-side (no generation, no grading credits):
// MCQ / true-false are re-answered with instant feedback; other types flip to
// reveal the correct answer + explanation. Questions arrive via router state
// from the result page.

function parseOptions(opts) {
  try { return typeof opts === 'string' ? JSON.parse(opts) : (opts ?? []); } catch { return []; }
}

// Only MCQ has stored options (`options_json`) to re-answer against. Every other
// type — true_false, multi, cloze, short — has null options, so it uses the
// flip-to-reveal path. (true_false previously sat here and dead-ended the queue:
// null options → zero buttons → no way to advance.)
const INTERACTIVE = new Set(['mcq']);

export default function RedoPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const questions = useMemo(() => state?.questions ?? [], [state]);

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [gradedCount, setGradedCount] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) {
    return (
      <div className="page game-page">
        <div className="empty" style={{ marginTop: '3rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '.5rem' }}>🔁</p>
          <p><strong>Nothing to redo</strong></p>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem', maxWidth: 300, margin: '.5rem auto 0' }}>
            Open a quiz result and tap “Redo my mistakes” to practice the ones you missed.
          </p>
          <Link to={`/quizzes/${quizId}/results`} className="btn btn-ghost btn-sm" style={{ marginTop: '1rem' }}>← Back to results</Link>
        </div>
      </div>
    );
  }

  const advance = () => {
    const next = idx + 1;
    if (next >= questions.length) { setDone(true); return; }
    setIdx(next); setSelected(null); setRevealed(false);
  };

  const q = questions[idx];
  const interactive = INTERACTIVE.has(q.type);
  const options = interactive ? parseOptions(q.options_json) : [];

  const answer = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    setGradedCount(n => n + 1);
    if (opt[0] === q.correct_answer) setCorrectCount(n => n + 1);
    setTimeout(advance, 750);
  };

  if (done) {
    const pct = gradedCount ? Math.round((correctCount / gradedCount) * 100) : null;
    const nailedIt = pct === 100 && gradedCount > 0;
    return (
      <>
        {nailedIt && <Confetti />}
        <div className="session-complete">
          <div className="complete-icon">{nailedIt ? '🎉' : '🔁'}</div>
          <h2>Mistakes redone!</h2>
          <p className="complete-msg">
            {nailedIt ? 'Perfect — you cleaned up every miss. That’s how it sticks.'
              : 'Nice — a second pass on the ones you missed is exactly how they stick.'}
          </p>
          {pct != null && (
            <div className="session-stats">
              <div className="session-stat">
                <div className="stat-num" style={{ color: 'var(--success)' }}>{correctCount}/{gradedCount}</div>
                <div className="stat-lbl">on retry</div>
              </div>
              <div className="session-stat">
                <div className="stat-num">{pct}%</div>
                <div className="stat-lbl">this pass</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
            <Link to={`/quizzes/${quizId}/results`} className="btn btn-ghost">← Back to results</Link>
            <Link to="/" className="btn btn-primary">Home</Link>
          </div>
        </div>
      </>
    );
  }

  const progress = idx / questions.length;

  return (
    <div className="page game-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <span style={{ fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{idx + 1} / {questions.length}</span>
        <div className="fc-progress" style={{ flex: 1 }}>
          <div className="fc-progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="redo-tag">🔁 Redo</span>
      </div>

      <div className="game-topic">{q.topic}</div>
      <h2 className="game-prompt">{q.prompt}</h2>

      {interactive ? (
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
      ) : (
        <div className="redo-reveal">
          {!revealed ? (
            <button className="btn btn-primary" onClick={() => setRevealed(true)}>Reveal answer</button>
          ) : (
            <>
              <div className="redo-answer">
                <span className="redo-answer-label">Answer</span>
                <p>{q.correct_answer}</p>
              </div>
              {q.explanation && <p className="redo-explanation">{q.explanation}</p>}
              <button className="btn btn-primary btn-sm" onClick={advance} style={{ marginTop: '.75rem' }}>
                {idx + 1 >= questions.length ? 'Finish' : 'Next →'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
