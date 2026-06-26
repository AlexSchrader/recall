import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

// Public, no-auth quiz taker. Nothing is saved; grading is deterministic.
export default function SharedQuizPage() {
  const { token } = useParams();
  const [data, setData] = useState(undefined); // undefined = loading, null = not found
  const [answers, setAnswers] = useState({});  // questionId → value (string, or letters[] for multi)
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    api.get(`/shared/quizzes/${token}`).then(setData).catch(() => setData(null));
  }, [token]);

  if (data === undefined) return <div className="shared-wrap"><p className="empty">Loading quiz…</p></div>;

  if (data === null) return (
    <div className="shared-wrap">
      <SharedHeader />
      <div className="empty" style={{ marginTop: '3rem' }}>
        <p style={{ fontSize: '1.5rem' }}>🔍</p>
        <p><strong>Quiz not found</strong></p>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: '.5rem' }}>
          This link is invalid or sharing was turned off.
        </p>
        <Link to="/" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>Go to Recall</Link>
      </div>
    </div>
  );

  const setAnswer = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }));

  const toggleMulti = (qid, letter) => {
    setAnswers(prev => {
      const cur = prev[qid] ?? [];
      return { ...prev, [qid]: cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter] };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    const payload = data.questions.map(q => {
      const v = answers[q.id];
      const answer = Array.isArray(v) ? v.join(',') : (v ?? '');
      return { questionId: q.id, answer };
    });
    try {
      const res = await api.post(`/shared/quizzes/${token}/submit`, { answers: payload });
      setResults(res);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  // ── Results view ──────────────────────────────────────────────────────────
  if (results) {
    const pct = Math.round(results.score * 100);
    const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';
    const byId = Object.fromEntries(results.results.map(r => [r.questionId, r]));
    return (
      <div className="shared-wrap">
        <SharedHeader />
        <h1 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '1rem' }}>{data.title}</h1>
        <div className="card score-banner" style={{ marginBottom: '1.5rem' }}>
          <p style={{ color: 'var(--muted)', marginBottom: '.25rem' }}>Your score</p>
          <p className="score-pct" style={{ color }}>{pct}%</p>
          <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>
            {results.correct} correct{results.partial > 0 && ` · ${results.partial} partial`} · {results.total} total
          </p>
        </div>

        {data.questions.map((q, i) => {
          const r = byId[q.id];
          return (
            <div key={q.id} className="card question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <p className="q-meta">Q{i + 1} · {q.topic}</p>
                <span className={`badge ${r.isCorrect ? 'badge-ok' : r.isPartial ? 'badge-partial' : 'badge-bad'}`}>
                  {r.isCorrect ? '✓ Correct' : r.isPartial ? '~ Partial' : '✗ Incorrect'}
                </span>
              </div>
              <p style={{ margin: '.4rem 0' }}>{q.prompt}</p>
              {!r.isCorrect && (
                <p style={{ fontSize: '.875rem', color: 'var(--muted)' }}>
                  Answer: <strong style={{ color: 'var(--text)' }}>{r.correctAnswer}</strong>
                </p>
              )}
              {r.explanation && (
                <p style={{ fontSize: '.875rem', marginTop: '.5rem', borderTop: '1px solid var(--border)', paddingTop: '.5rem' }}>{r.explanation}</p>
              )}
            </div>
          );
        })}

        <SharedFooter />
      </div>
    );
  }

  // ── Take view ─────────────────────────────────────────────────────────────
  return (
    <div className="shared-wrap">
      <SharedHeader />
      <h1 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{data.title}</h1>
      <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginBottom: '1.5rem' }}>
        {data.questionCount} questions · nothing you do here is saved.
      </p>

      {data.questions.map((q, i) => (
        <div key={q.id} className="card question-card">
          <p className="q-meta">Q{i + 1} · {q.topic}</p>
          <p style={{ margin: '.4rem 0 .75rem' }}>{q.prompt}</p>

          {(q.type === 'mcq') && (q.options ?? []).map(opt => (
            <label key={opt} className="shared-opt">
              <input type="radio" name={q.id} checked={answers[q.id] === opt[0]} onChange={() => setAnswer(q.id, opt[0])} />
              <span>{opt}</span>
            </label>
          ))}

          {q.type === 'multi' && (q.options ?? []).map(opt => (
            <label key={opt} className="shared-opt">
              <input type="checkbox" checked={(answers[q.id] ?? []).includes(opt[0])} onChange={() => toggleMulti(q.id, opt[0])} />
              <span>{opt}</span>
            </label>
          ))}

          {q.type === 'true_false' && ['True', 'False'].map(v => (
            <label key={v} className="shared-opt">
              <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswer(q.id, v)} />
              <span>{v}</span>
            </label>
          ))}

          {(q.type === 'short' || q.type === 'cloze') && (
            <input
              className="shared-text"
              placeholder="Your answer"
              value={answers[q.id] ?? ''}
              onChange={e => setAnswer(q.id, e.target.value)}
            />
          )}
        </div>
      ))}

      <button className="btn btn-primary" style={{ marginTop: '.5rem' }} onClick={submit} disabled={submitting}>
        {submitting ? 'Checking…' : 'Submit answers'}
      </button>

      <SharedFooter />
    </div>
  );
}

function SharedHeader() {
  return (
    <div className="shared-header">
      <Link to="/" className="brand">Recall</Link>
    </div>
  );
}

function SharedFooter() {
  return (
    <p className="shared-footer">
      Made with <Link to="/">Recall</Link> — turn your own notes into quizzes. <Link to="/register">Create an account →</Link>
    </p>
  );
}
