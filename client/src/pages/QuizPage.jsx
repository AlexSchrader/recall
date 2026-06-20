import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';

function McqOptions({ questionId, options, value, onChange }) {
  return (
    <div className="option-list">
      {(options ?? []).map(opt => (
        <label key={opt}>
          <input type="radio" name={`mcq-${questionId}`} value={opt[0]} checked={value === opt[0]} onChange={() => onChange(opt[0])} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function TrueFalseOptions({ questionId, value, onChange }) {
  return (
    <div className="option-list">
      {['True', 'False'].map(v => (
        <label key={v}>
          <input type="radio" name={`tf-${questionId}`} value={v} checked={value === v} onChange={() => onChange(v)} />
          {v}
        </label>
      ))}
    </div>
  );
}

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/quizzes/${quizId}`)
      .then(q => {
        if (q.status === 'completed') {
          navigate(`/quizzes/${quizId}/results`, { replace: true });
          return;
        }
        setQuiz(q);
        const init = {};
        for (const question of q.questions) init[question.id] = '';
        setAnswers(init);
      })
      .catch(() => navigate('/'));
  }, [quizId]);

  const setAnswer = (questionId, val) => setAnswers(prev => ({ ...prev, [questionId]: val }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
      const results = await api.post(`/quizzes/${quizId}/submit`, { answers: payload });
      navigate(`/quizzes/${quizId}/results`, { state: { results } });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  if (!quiz) return null;

  const parsedOptions = (opts) => {
    if (!opts) return [];
    try { return typeof opts === 'string' ? JSON.parse(opts) : opts; } catch { return []; }
  };

  return (
    <>
      <div className="page-header">
        <h1>{quiz.title}</h1>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: '.875rem', marginBottom: '1.5rem' }}>
        {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
        {' · '}model: {quiz.model}
      </p>

      <form onSubmit={submit}>
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="card question-card">
            <p className="q-meta">
              Q{i + 1} · {q.type} · {q.difficulty}
              {q.is_review ? ' · 🔁 review' : ''}
            </p>
            <p className="q-prompt">{q.prompt}</p>

            {q.type === 'mcq' && (
              <McqOptions questionId={q.id} options={parsedOptions(q.options_json)} value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />
            )}
            {q.type === 'true_false' && (
              <TrueFalseOptions questionId={q.id} value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />
            )}
            {q.type === 'short' && (
              <textarea
                placeholder="Your answer…"
                value={answers[q.id]}
                onChange={e => setAnswer(q.id, e.target.value)}
                style={{ width: '100%', marginTop: '.25rem' }}
              />
            )}
          </div>
        ))}

        {error && <p className="error-msg">{error}</p>}

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Grading…' : 'Submit answers'}
          </button>
          <Link to="/">Cancel</Link>
        </div>
      </form>
    </>
  );
}
