import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { daysUntilExam, examCountdownLabel } from '../examCountdown.js';

function MasteryBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="mastery-bar-wrap" title={`${pct}% mastery`}>
      <div className="mastery-bar-bg">
        <div className="mastery-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="mastery-bar-pct" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/me/progress').then(setData).catch(console.error);
    api.get('/me/stats').then(setStats).catch(console.error);
  }, []);

  const askRappelAbout = async (topic) => {
    const msg = `I keep struggling with "${topic}". Can you help me understand it better?`;
    try {
      const thread = await api.post('/chat/threads', { title: topic });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(msg)}`);
    } catch (e) { console.error(e); }
  };

  const explainItToMe = async (topic) => {
    const msg = `I want to understand "${topic}" better using the Feynman technique. Ask me to explain it in my own simple words — like I'm teaching it to someone who's never heard of it. Then tell me what I got right, what I missed, and fill in any gaps.`;
    try {
      const thread = await api.post('/chat/threads', { title: `Explain: ${topic}` });
      navigate(`/chat/${thread.id}?init=${encodeURIComponent(msg)}`);
    } catch (e) { console.error(e); }
  };

  const [unitMap, setUnitMap]       = useState({});
  const [focusPick, setFocusPick]   = useState(null);
  const [focusBusy, setFocusBusy]   = useState(null); // null | unitId
  const [focusErr, setFocusErr]     = useState('');

  const openFocusPicker = async (courseId) => {
    setFocusErr('');
    if (!unitMap[courseId]) {
      try {
        const units = await api.get(`/courses/${courseId}/units`);
        setUnitMap(prev => ({ ...prev, [courseId]: units }));
      } catch { return; }
    }
    setFocusPick(focusPick === courseId ? null : courseId);
  };

  const fireFocusQuiz = async (courseId, unitId, unitName) => {
    setFocusBusy(unitId);
    setFocusErr('');
    try {
      const result = await api.post('/quizzes/generate', {
        courseId,
        unitIds: [unitId],
        title: `Focus: ${unitName}`,
        questionCount: 10,
        reviewMix: 1,
        types: ['mcq', 'short'],
        difficulty: 'mixed',
      });
      navigate(`/quizzes/${result.quizId}`);
    } catch (e) {
      setFocusErr(e.message);
      setFocusBusy(null);
    }
  };

  if (!data && !stats) {
    return (
      <div className="progress-page">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Progress</h1>
        <div className="skeleton-grid">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-stat">
              <div className="skeleton" style={{ width: 48, height: 28 }} />
              <div className="skeleton" style={{ width: 80, height: 12 }} />
            </div>
          ))}
        </div>
        <div className="skeleton-page">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton" style={{ width: `${60 + i * 10}%`, height: 14 }} />
              <div className="skeleton" style={{ width: '100%', height: 10 }} />
              <div className="skeleton" style={{ width: '85%', height: 10 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="progress-page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Progress</h1>

      {/* ── Stats ── */}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{stats.quizzesCompleted}</div>
            <div className="stat-label">Quizzes completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.questionsAnswered}</div>
            <div className="stat-label">Questions answered</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.cardsReviewed}</div>
            <div className="stat-label">Cards reviewed</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.streak}</div>
            <div className="stat-label">Current streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.bestStreak}</div>
            <div className="stat-label">Best streak</div>
          </div>
        </div>
      )}

      {/* ── Exam soon nudge (soonest upcoming exam within 14 days) ── */}
      {(() => {
        const upcoming = (data?.progress ?? [])
          .map(p => ({ course: p.course, days: daysUntilExam(p.course?.exam_date) }))
          .filter(x => x.days !== null && x.days >= 0 && x.days <= 14)
          .sort((a, b) => a.days - b.days)[0];
        if (!upcoming) return null;
        return (
          <div className="exam-nudge">
            <span>
              <strong>{examCountdownLabel(upcoming.course.exam_date)}</strong> for {upcoming.course.name} — focus your weakest topics now.
            </span>
            <Link to={`/courses/${upcoming.course.id}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
              Open course
            </Link>
          </div>
        );
      })()}

      {/* ── Weak questions ── */}
      {data?.weakQuestions?.length > 0 && (
        <section className="progress-section">
          <h2 className="section-title">Commonly missed questions</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
            These are the questions you&apos;ve gotten wrong most often. Rappel can walk you through any of them.
          </p>
          <div className="weak-q-list">
            {data.weakQuestions.map(q => (
              <div key={q.id} className="weak-q-row">
                <div className="weak-q-body">
                  <p className="weak-q-prompt">{q.prompt}</p>
                  <p className="weak-q-meta">Topic: {q.topic} · Missed {q.miss_count}×</p>
                  {q.correct_answer && (
                    <p className="weak-q-answer">Answer: {q.correct_answer}</p>
                  )}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ flexShrink: 0 }}
                  onClick={() => askRappelAbout(q.topic)}
                >
                  Ask Rappel
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Mastery by course ── */}
      {data?.progress?.map(({ course, topics }) => (
        topics.length > 0 && (
          <section key={course.id} className="progress-section">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '.5rem' }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <Link to={`/courses/${course.id}`}>{course.name}</Link>
              </h2>
              {topics.some(t => t.mastery < 0.7) && (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openFocusPicker(course.id)}
                  disabled={focusBusy !== null}
                >
                  Focus Quiz ▾
                </button>
              )}
            </div>

            {/* Unit picker for focus quiz */}
            {focusPick === course.id && (
              <div className="focus-picker">
                <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.4rem' }}>Pick a unit to drill weak topics from:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                  {(unitMap[course.id] ?? []).map(u => (
                    <button
                      key={u.id}
                      className="btn btn-ghost btn-sm"
                      disabled={focusBusy !== null}
                      onClick={() => fireFocusQuiz(course.id, u.id, u.name)}
                    >
                      {focusBusy === u.id ? 'Generating…' : u.name}
                    </button>
                  ))}
                  {(unitMap[course.id] ?? []).length === 0 && (
                    <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>No units found.</span>
                  )}
                </div>
                {focusErr && <p className="error-msg" style={{ marginTop: '.5rem', fontSize: '.85rem' }}>{focusErr}</p>}
              </div>
            )}
            <div className="mastery-list">
              {topics.map(t => (
                <div key={t.topic} className="mastery-row">
                  <div className="mastery-info">
                    <span className="mastery-topic">{t.topic}</span>
                    <MasteryBar value={t.mastery} />
                  </div>
                  <div className="mastery-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => explainItToMe(t.topic)}
                      title="Practice explaining this topic (Feynman method)"
                    >
                      Explain it
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => askRappelAbout(t.topic)}
                      title="Ask Rappel about this topic"
                    >
                      Ask Rappel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      ))}

      {data?.progress?.length === 0 && (
        <div className="onboarding" style={{ marginTop: '1.5rem' }}>
          <h2 className="onboarding-title">Nothing tracked yet</h2>
          <p className="onboarding-sub">
            Mastery scores appear here after you take a quiz or review flashcards.
            Go to any course, open a unit, and generate your first quiz to get started.
          </p>
          <Link to="/" className="btn btn-primary onboarding-cta">Go to my courses</Link>
        </div>
      )}

      {/* Per-course empty state — has courses but no activity in this one */}
      {data?.progress?.filter(({ topics }) => topics.length === 0).length > 0 &&
       data?.progress?.some(({ topics }) => topics.length > 0) === false && null}
    </div>
  );
}
