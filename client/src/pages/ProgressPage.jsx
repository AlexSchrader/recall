import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { daysUntilExam, examCountdownLabel } from '../examCountdown.js';

function masteryColor(pct) {
  return pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
}

// Trend over the last 7 days, in percentage points. Hidden when flat or when
// there's no history to compare against yet.
function TrendArrow({ delta }) {
  if (delta == null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span
      className={`mastery-trend ${up ? 'mastery-trend--up' : 'mastery-trend--down'}`}
      title={`${up ? 'Up' : 'Down'} ${Math.abs(delta)} points in the last 7 days`}
    >
      {up ? '▲' : '▼'} {Math.abs(delta)}%
    </span>
  );
}

function MasteryBar({ value }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div className="mastery-bar-wrap" title={`${pct}% mastery`}>
      <div className="mastery-bar-bg">
        <div className="mastery-bar-fill" style={{ width: `${pct}%`, background: masteryColor(pct) }} />
      </div>
    </div>
  );
}

const WEEKS = 12;
const MS_DAY = 86_400_000;

function ActivityHeatmap({ activity }) {
  const counts = Object.fromEntries((activity ?? []).map(a => [a.day, a.count]));
  const now = new Date();
  const todayMid = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dow = new Date(todayMid).getUTCDay(); // 0=Sun
  const startMs = todayMid - ((WEEKS - 1) * 7 + dow) * MS_DAY;

  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const ms = startMs + i * MS_DAY;
    const key = new Date(ms).toISOString().slice(0, 10);
    cells.push({ key, count: counts[key] ?? 0, future: ms > todayMid });
  }
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const level = c => c === 0 ? 0 : c < 5 ? 1 : c < 15 ? 2 : c < 30 ? 3 : 4;
  const activeDays = cells.filter(c => !c.future && c.count > 0).length;

  return (
    <section className="progress-section">
      <h2 className="section-title">Study activity</h2>
      <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginBottom: '.6rem' }}>
        {activeDays} active day{activeDays !== 1 ? 's' : ''} in the last 12 weeks
      </p>
      <div className="heatmap">
        {weeks.map((week, wi) => (
          <div key={wi} className="heatmap-week">
            {week.map(cell => (
              <div
                key={cell.key}
                className={`heatmap-cell heatmap-l${cell.future ? 0 : level(cell.count)}`}
                style={cell.future ? { visibility: 'hidden' } : undefined}
                title={`${cell.count} answered · ${cell.key}`}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

// Achievements derived from existing stats + mastery — no extra tracking.
const ACHIEVEMENTS = [
  { id: 'first',     emoji: '🎯', title: 'First Steps',  desc: 'Complete your first quiz',     goal: 1,    metric: m => m.quizzesCompleted },
  { id: 'bookworm',  emoji: '📚', title: 'Bookworm',     desc: 'Complete 10 quizzes',           goal: 10,   metric: m => m.quizzesCompleted },
  { id: 'scholar',   emoji: '🎓', title: 'Scholar',      desc: 'Complete 50 quizzes',           goal: 50,   metric: m => m.quizzesCompleted },
  { id: 'century',   emoji: '💯', title: 'Century',      desc: 'Answer 100 questions',          goal: 100,  metric: m => m.questionsAnswered },
  { id: 'marathon',  emoji: '🏃', title: 'Marathoner',   desc: 'Answer 1,000 questions',        goal: 1000, metric: m => m.questionsAnswered },
  { id: 'week',      emoji: '🔥', title: 'Week Warrior',  desc: 'Reach a 7-day streak',          goal: 7,    metric: m => m.bestStreak },
  { id: 'month',     emoji: '⚡', title: 'Unstoppable',   desc: 'Reach a 30-day streak',         goal: 30,   metric: m => m.bestStreak },
  { id: 'cards',     emoji: '🃏', title: 'Card Shark',    desc: 'Review 100 flashcards',         goal: 100,  metric: m => m.cardsReviewed },
  { id: 'master1',   emoji: '🧠', title: 'Topic Master',  desc: 'Master a topic (80%+)',         goal: 1,    metric: m => m.masteredCount },
  { id: 'polymath',  emoji: '👑', title: 'Polymath',      desc: 'Master 10 topics',              goal: 10,   metric: m => m.masteredCount },
];

function Achievements({ metrics }) {
  const earned = ACHIEVEMENTS.filter(a => a.metric(metrics) >= a.goal).length;
  return (
    <section className="progress-section">
      <h2 className="section-title">Achievements <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({earned}/{ACHIEVEMENTS.length})</span></h2>
      <div className="badge-grid">
        {ACHIEVEMENTS.map(a => {
          const cur = a.metric(metrics);
          const done = cur >= a.goal;
          return (
            <div key={a.id} className={`badge-tile ${done ? 'badge-tile--earned' : ''}`} title={a.desc}>
              <span className="badge-emoji">{a.emoji}</span>
              <span className="badge-title">{a.title}</span>
              <span className="badge-desc">{done ? '✓ Earned' : `${Math.min(cur, a.goal)} / ${a.goal}`}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function ProgressPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);

  useEffect(() => {
    api.get('/me/progress').then(setData).catch(console.error);
    api.get('/me/stats').then(setStats).catch(console.error);
    api.get('/me/activity?days=84').then(setActivity).catch(() => {});
  }, []);

  const askRappelAbout = async (topic) => {
    const msg = `I keep struggling with "${topic}". Can you help me understand it better?`;
    try {
      const thread = await api.post('/chat/threads', { title: topic });
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

      {activity && <ActivityHeatmap activity={activity.activity} />}

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
              {topics.map(t => {
                const pct = Math.round((t.mastery ?? 0) * 100);
                return (
                <div key={t.topic} className="mastery-row">
                  <div className="mastery-info">
                    <span className="mastery-topic">{t.topic}</span>
                    <MasteryBar value={t.mastery} />
                    <span
                      className="mastery-pct-badge"
                      style={{ color: masteryColor(pct), borderColor: masteryColor(pct) }}
                      title={`${pct}% mastery`}
                    >{pct}%</span>
                    <TrendArrow delta={t.trend} />
                  </div>
                  <div className="mastery-actions">
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => askRappelAbout(t.topic)}
                      title="Ask Rappel about this topic"
                    >
                      Ask Rappel
                    </button>
                  </div>
                </div>
                );
              })}
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

      {stats && (
        <Achievements metrics={{
          quizzesCompleted: stats.quizzesCompleted,
          questionsAnswered: stats.questionsAnswered,
          cardsReviewed: stats.cardsReviewed,
          bestStreak: stats.bestStreak,
          masteredCount: (data?.progress ?? []).flatMap(p => p.topics ?? []).filter(t => (t.mastery ?? 0) >= 0.8).length,
        }} />
      )}
    </div>
  );
}
