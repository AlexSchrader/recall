import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function QuizResultPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(state?.results ?? null);

  useEffect(() => {
    api.get(`/quizzes/${quizId}`).then(setQuiz).catch(() => navigate('/'));
  }, [quizId]);

  if (!quiz) return null;

  const score = results?.score ?? quiz.score ?? 0;
  const pct = Math.round(score * 100);
  const scoreColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';

  const unitIds = (() => { try { return JSON.parse(quiz.source_unit_ids); } catch { return []; } })();
  const firstUnitId = unitIds[0] ?? null;

  return (
    <>
      <div className="page-header">
        <h1>{quiz.title}</h1>
      </div>

      <div className="card score-banner" style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--muted)', marginBottom: '.25rem' }}>Your score</p>
        <p className="score-pct" style={{ color: scoreColor }}>{pct}%</p>
        {results && <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>{results.correct} / {results.total} correct</p>}
      </div>

      {pct < 60 && firstUnitId && (
        <div className="recovery-banner">
          <span>Tricky material! Reading the study guide can help things click.</span>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem', flexWrap: 'wrap' }}>
            <Link to={`/units/${firstUnitId}/study-guide`} className="btn btn-primary btn-sm">Read study guide →</Link>
            <Link to={`/units/${firstUnitId}/flashcards`} className="btn btn-ghost btn-sm">Practice flashcards →</Link>
          </div>
        </div>
      )}

      {results?.results && (
        <>
          <p className="section-title">Question breakdown</p>
          {results.results.map((r, i) => (
            <div key={r.questionId} className="card question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <p className="q-meta">Q{i + 1} · {r.topic}</p>
                <span className={`badge ${r.isCorrect ? 'badge-ok' : 'badge-bad'}`}>
                  {r.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                </span>
              </div>
              {!r.isCorrect && (
                <div style={{ fontSize: '.875rem', marginTop: '.5rem', color: 'var(--muted)' }}>
                  <p>Your answer: <strong>{r.givenAnswer || '(blank)'}</strong></p>
                  <p>Correct: <strong>{r.correctAnswer}</strong></p>
                </div>
              )}
              {r.explanation && (
                <p style={{ fontSize: '.875rem', marginTop: '.5rem', color: 'var(--text)', borderTop: '1px solid var(--border)', paddingTop: '.5rem' }}>
                  {r.explanation}
                </p>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </>
  );
}
