import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function QuizResultPage() {
  const { quizId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [results, setResults] = useState(state?.results ?? null);
  const [creatingThread, setCreatingThread] = useState(false);
  const [retaking, setRetaking] = useState(false);
  const [retakeErr, setRetakeErr] = useState('');

  useEffect(() => {
    api.get(`/quizzes/${quizId}`).then(setQuiz).catch(() => navigate('/'));
  }, [quizId]);

  if (!quiz) return null;

  const score = results?.score ?? quiz.score ?? 0;
  const pct = Math.round(score * 100);
  const scoreColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)';

  const unitIds = (() => { try { return JSON.parse(quiz.source_unit_ids); } catch { return []; } })();
  const firstUnitId = unitIds[0] ?? null;

  const missedTopics = results?.results
    ? [...new Set(results.results.filter(r => !r.isCorrect).map(r => r.topic))].slice(0, 5)
    : [];

  const retake = async () => {
    setRetaking(true);
    setRetakeErr('');
    try {
      const cfg = JSON.parse(quiz.config_json ?? '{}');
      const { quizId: newId } = await api.post('/quizzes/generate', {
        courseId:      cfg.courseId,
        unitIds:       cfg.unitIds,
        title:         quiz.title.replace(/ \(retake\)$/, '') + ' (retake)',
        questionCount: cfg.questionCount ?? 10,
        reviewMix:     cfg.reviewMix ?? 0,
        types:         cfg.types ?? ['mcq'],
        difficulty:    cfg.difficulty ?? 'mixed',
      });
      navigate(`/quizzes/${newId}`);
    } catch (err) {
      setRetakeErr(err.message ?? 'Could not generate retake. Try again.');
      setRetaking(false);
    }
  };

  const startRappelPlan = async () => {
    setCreatingThread(true);
    try {
      const topicList = missedTopics.length
        ? missedTopics.map(t => `• ${t}`).join('\n')
        : '• (see quiz above)';
      const initMsg = `I just finished the "${quiz.title}" quiz and scored ${pct}%. I struggled with these topics:\n${topicList}\n\nCan you make me a short study plan to review what I missed? Prioritise the hardest concepts first.`;
      const thread = await api.post('/chat/threads', { title: `Study plan: ${quiz.title}` });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(initMsg)}`);
    } catch {
      setCreatingThread(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1>{quiz.title}</h1>
      </div>

      <div className="card score-banner" style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: 'var(--muted)', marginBottom: '.25rem' }}>Your score</p>
        <p className="score-pct" style={{ color: scoreColor }}>{pct}%</p>
        {results && (
          <p style={{ color: 'var(--muted)', marginTop: '.25rem' }}>
            {results.correct} correct
            {results.partial > 0 && ` · ${results.partial} partial`}
            {' · '}{results.total} total
          </p>
        )}
      </div>

      {pct < 60 && (
        <div className="recovery-banner">
          <span>Tricky material — let Rappel walk you through what to study next.</span>
          <div style={{ display: 'flex', gap: '.5rem', marginTop: '.6rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={startRappelPlan}
              disabled={creatingThread}
            >
              {creatingThread ? 'Opening Rappel…' : 'Get a study plan →'}
            </button>
            {firstUnitId && (
              <>
                <Link to={`/units/${firstUnitId}/study-guide`} className="btn btn-ghost btn-sm">Study guide</Link>
                <Link to={`/units/${firstUnitId}/flashcards`} className="btn btn-ghost btn-sm">Flashcards</Link>
              </>
            )}
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
                <span className={`badge ${r.isCorrect ? 'badge-ok' : r.isPartial ? 'badge-partial' : 'badge-bad'}`}>
                  {r.isCorrect ? '✓ Correct' : r.isPartial ? '~ Partial' : '✗ Incorrect'}
                </span>
              </div>
              {!r.isCorrect && (
                <div style={{ fontSize: '.875rem', marginTop: '.5rem', color: 'var(--muted)' }}>
                  <p>Your answer: <strong>{r.givenAnswer || '(blank)'}</strong></p>
                  <p style={{ marginTop: '.25rem' }}>
                    Model answer: <strong style={{ color: 'var(--text)' }}>{r.modelAnswer ?? r.correctAnswer}</strong>
                  </p>
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

      {retakeErr && <p className="error-msg" style={{ marginTop: '1rem' }}>{retakeErr}</p>}
      <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={retake} disabled={retaking}>
          {retaking ? 'Generating…' : '↺ Retake'}
        </button>
        {firstUnitId && <Link to={`/units/${firstUnitId}`} className="btn btn-ghost">Back to unit</Link>}
        <Link to="/" className="btn btn-ghost">Home</Link>
      </div>
    </>
  );
}
