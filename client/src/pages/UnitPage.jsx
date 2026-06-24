import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api, uploadDocument } from '../api.js';

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard', 'mixed'];
const TYPE_OPTIONS = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'multi', label: 'Multiple answer' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short', label: 'Short answer' },
];

function StatusPill({ status }) {
  return <span className={`status status-${status}`}>{status}</span>;
}

export default function UnitPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [unit, setUnit] = useState(null);
  const [course, setCourse] = useState(null);
  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Quiz config
  const [questionCount, setQuestionCount] = useState(10);
  const [difficulty, setDifficulty] = useState('mixed');
  const [types, setTypes] = useState(['mcq']);
  const [reviewMix, setReviewMix] = useState(0.2);
  const [quizTitle, setQuizTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  useEffect(() => {
    api.get('/preferences').then(p => {
      if (p?.questionCount) setQuestionCount(p.questionCount);
      if (p?.difficulty) setDifficulty(p.difficulty);
      if (p?.types?.length) setTypes(p.types);
      if (p?.reviewMix !== undefined) setReviewMix(p.reviewMix);
    }).catch(() => {});

    api.get(`/units/${unitId}`)
      .then(u => {
        setUnit(u);
        setQuizTitle(`${u.name} quiz`);
        return api.get(`/courses/${u.course_id}`);
      })
      .then(setCourse)
      .catch(() => navigate('/'));

    api.get(`/units/${unitId}/documents`).then(setDocs).catch(console.error);
  }, [unitId]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const doc = await uploadDocument(unitId, file);
      setDocs(prev => [...prev, doc]);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const deleteDoc = async (docId) => {
    await api.delete(`/documents/${docId}`);
    setDocs(prev => prev.filter(d => d.id !== docId));
  };

  const toggleType = (t) => {
    setTypes(prev => prev.includes(t) ? (prev.length > 1 ? prev.filter(x => x !== t) : prev) : [...prev, t]);
  };

  const generateQuiz = async (e) => {
    e.preventDefault();
    if (!course) return;
    setGenerating(true);
    setGenError('');
    try {
      const result = await api.post('/quizzes/generate', {
        courseId: course.id,
        unitIds: [unitId],
        title: quizTitle,
        questionCount: Number(questionCount),
        reviewMix: Number(reviewMix),
        types,
        difficulty,
      });
      navigate(`/quizzes/${result.quizId}`);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!unit || !course) return null;

  const parsedDocs = docs.filter(d => d.parse_status === 'parsed');

  return (
    <>
      <p className="breadcrumb">
        <Link to="/">Home</Link> › <Link to={`/courses/${course.id}`}>{course.name}</Link>
      </p>
      <div className="page-header">
        <h1>{unit.name}</h1>
      </div>

      {/* Documents */}
      <p className="section-title">Documents</p>
      {docs.length === 0
        ? <p className="empty">No documents yet. Upload one below.</p>
        : (
          <ul className="item-list" style={{ marginBottom: '1rem' }}>
            {docs.map(d => (
              <li key={d.id} className="item-row" style={{ cursor: 'default' }}>
                <span className="label" style={{ fontSize: '.875rem' }}>{d.filename}</span>
                <StatusPill status={d.parse_status} />
                <button className="btn btn-danger btn-sm" onClick={() => deleteDoc(d.id)}>×</button>
              </li>
            ))}
          </ul>
        )
      }

      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.5rem' }}>
        <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
          {uploading ? 'Uploading…' : '↑ Upload document'}
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md,image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadError && <span className="error-msg">{uploadError}</span>}
      </div>

      <hr />

      {/* Flashcards */}
      <p className="section-title">Flashcards</p>
      <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
        Generate a flashcard deck from your documents and review with spaced repetition.
      </p>
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link to={`/units/${unitId}/flashcards`} className="btn btn-ghost">Flashcards →</Link>
        <Link to={`/units/${unitId}/study-guide`} className="btn btn-ghost">Study Guide →</Link>
      </div>

      <hr />

      {/* Mini-games */}
      <p className="section-title">Quick games</p>
      <p style={{ fontSize: '.875rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
        Practice with questions from your existing quizzes.
      </p>
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link
          to={`/games/speed-round?unitId=${unitId}&unitName=${encodeURIComponent(unit?.name ?? '')}`}
          className="btn btn-ghost"
        >🏃 Speed Round</Link>
        <Link
          to={`/games/streak?unitId=${unitId}`}
          className="btn btn-ghost"
        >🔥 Streak Challenge</Link>
      </div>

      <hr />

      {/* Generate quiz */}
      <p className="section-title">Generate quiz</p>
      {parsedDocs.length === 0
        ? (
          <p className="empty" style={{ marginBottom: 0 }}>
            {docs.length === 0
              ? 'Upload at least one document to generate a quiz.'
              : 'No documents parsed successfully. Try re-uploading or use a different format (PDF, DOCX, TXT, MD, or image).'}
          </p>
        )
        : (
          <form onSubmit={generateQuiz} className="card">
            <div className="form-group">
              <label>Quiz title</label>
              <input value={quizTitle} onChange={e => setQuizTitle(e.target.value)} required />
            </div>
            <div className="row" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label>Questions</label>
                <input type="number" min="1" max="30" value={questionCount} onChange={e => setQuestionCount(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  {DIFFICULTY_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Review mix ({Math.round(reviewMix * 100)}%)</label>
                <input type="range" min="0" max="0.5" step="0.1" value={reviewMix} onChange={e => setReviewMix(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Question types</label>
              <div className="type-checks">
                {TYPE_OPTIONS.map(t => (
                  <div key={t.value} className="type-check-row">
                    <span>{t.label}</span>
                    <label className="toggle-switch">
                      <input type="checkbox" checked={types.includes(t.value)} onChange={() => toggleType(t.value)} />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
            {genError && <p className="error-msg">{genError}</p>}
            <button className="btn btn-primary" disabled={generating}>
              {generating ? 'Generating…' : '⚡ Generate quiz'}
            </button>
          </form>
        )
      }
    </>
  );
}
