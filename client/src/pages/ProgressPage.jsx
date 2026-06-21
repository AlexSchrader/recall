import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

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
  const { user } = useAuth();
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

  const focusQuiz = async (courseId, unitId, topic) => {
    try {
      const result = await api.post('/quizzes/generate', {
        courseId,
        unitIds: [unitId],
        title: `Focus: ${topic}`,
        questionCount: 10,
        reviewMix: 1,
        types: ['mcq', 'short'],
        difficulty: 'mixed',
      });
      navigate(`/quizzes/${result.quizId}`);
    } catch (e) { alert(e.message); }
  };

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

      {/* ── Weak questions ── */}
      {data?.weakQuestions?.length > 0 && (
        <section className="progress-section">
          <h2 className="section-title">Commonly missed questions</h2>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '.75rem' }}>
            These are the questions you've gotten wrong most often. Rappel can walk you through any of them.
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
            <h2 className="section-title">
              <Link to={`/courses/${course.id}`}>{course.name}</Link>
            </h2>
            <div className="mastery-list">
              {topics.map(t => (
                <div key={t.topic} className="mastery-row">
                  <div className="mastery-info">
                    <span className="mastery-topic">{t.topic}</span>
                    <MasteryBar value={t.mastery} />
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => askRappelAbout(t.topic)}
                    title="Ask Rappel about this topic"
                  >
                    Ask Rappel
                  </button>
                </div>
              ))}
            </div>
            {topics.some(t => t.mastery < 0.5) && (
              <p style={{ marginTop: '.75rem', fontSize: '.8rem', color: 'var(--muted)' }}>
                Tip: generate a quiz on a unit in this course with 100% review mix to drill your weak topics.
              </p>
            )}
          </section>
        )
      ))}

      {data?.progress?.length === 0 && (
        <div className="empty" style={{ marginTop: '2rem' }}>
          No mastery data yet. Take a quiz or review flashcards to see your progress here.
        </div>
      )}
    </div>
  );
}
