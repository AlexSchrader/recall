import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard', 'mixed'];
const QCOUNT_OPTIONS = [5, 10, 15, 20, 25, 30];
const TYPE_OPTIONS = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'multi', label: 'Multiple answer' },
  { value: 'true_false', label: 'True / False' },
  { value: 'cloze', label: 'Fill in the blank' },
  { value: 'short', label: 'Short answer' },
];

export default function SettingsPage() {
  const { user, setUser } = useAuth();

  // ── Stats ──
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/me/stats').then(setStats).catch(() => {});
  }, []);

  // ── Study preferences ──
  const [prefs, setPrefs] = useState({ questionCount: 10, difficulty: 'mixed', types: ['mcq'], reviewMix: 0.2 });
  const [prefsSaved, setPrefsSaved] = useState(false);
  useEffect(() => {
    api.get('/preferences').then(p => {
      if (p && Object.keys(p).length) setPrefs(prev => ({ ...prev, ...p }));
    }).catch(() => {});
  }, []);

  const togglePrefType = (t) => {
    setPrefs(p => ({
      ...p,
      types: p.types?.includes(t)
        ? (p.types.length > 1 ? p.types.filter(x => x !== t) : p.types)
        : [...(p.types ?? []), t],
    }));
  };

  const savePrefs = async () => {
    await api.put('/preferences', prefs);
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2000);
  };

  // ── Voice preview ──
  const [previewingVoice, setPreviewingVoice] = useState(null);
  const previewAudioRef = useRef(null);

  const playVoicePreview = async (voiceValue) => {
    previewAudioRef.current?.pause();
    if (previewingVoice === voiceValue) { setPreviewingVoice(null); return; }
    setPreviewingVoice(voiceValue);
    try {
      const res = await fetch(`/api/voice/preview?voice=${voiceValue}`, { credentials: 'include' });
      if (!res.ok) { setPreviewingVoice(null); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      previewAudioRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => { setPreviewingVoice(null); URL.revokeObjectURL(url); };
    } catch { setPreviewingVoice(null); }
  };

  // ── Appearance ──
  const [isDark, setIsDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  const toggleTheme = () => {
    const next = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('theme', next);
    setIsDark(!isDark);
  };

  // ── Display name ──
  const [newName, setNewName] = useState(user?.display_name ?? '');
  const [nameHint, setNameHint] = useState(null); // {ok, msg}
  const [nameBusy, setNameBusy] = useState(false);
  const [nameSuccess, setNameSuccess] = useState('');
  const debouncedName = useDebounce(newName.trim(), 400);

  useEffect(() => {
    if (!debouncedName || debouncedName === user?.display_name) { setNameHint(null); return; }
    api.get(`/me/check-name?displayName=${encodeURIComponent(debouncedName)}`)
      .then(({ available }) => setNameHint(available
        ? { ok: true,  msg: `"${debouncedName}" is available` }
        : { ok: false, msg: `"${debouncedName}" is taken` }))
      .catch(() => setNameHint(null));
  }, [debouncedName, user?.display_name]);

  const saveName = async (e) => {
    e.preventDefault();
    setNameBusy(true);
    setNameSuccess('');
    try {
      const updated = await api.patch('/me/display-name', { displayName: newName.trim() });
      setUser(updated);
      setNameHint(null);
      setNameSuccess('Display name updated.');
    } catch (err) {
      setNameHint({ ok: false, msg: err.message });
    } finally {
      setNameBusy(false);
    }
  };

  // ── Email ──
  const [newEmail, setNewEmail] = useState(user?.email ?? '');
  const [emailErr, setEmailErr] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  const saveEmail = async (e) => {
    e.preventDefault();
    setEmailBusy(true);
    setEmailErr('');
    setEmailSuccess('');
    try {
      const updated = await api.patch('/me/email', { email: newEmail.trim() });
      setUser(updated);
      setEmailSuccess('Email updated.');
    } catch (err) {
      setEmailErr(err.message);
    } finally {
      setEmailBusy(false);
    }
  };

  // ── Password ──
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passErr, setPassErr] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [passBusy, setPassBusy] = useState(false);

  const savePassword = async (e) => {
    e.preventDefault();
    setPassErr('');
    setPassSuccess('');
    if (newPass !== confirmPass) { setPassErr('New passphrases do not match.'); return; }
    if (newPass.length < 6) { setPassErr('New passphrase must be at least 6 characters.'); return; }
    setPassBusy(true);
    try {
      await api.patch('/me/password', { currentPassphrase: currentPass, newPassphrase: newPass });
      setCurrentPass(''); setNewPass(''); setConfirmPass('');
      setPassSuccess('Passphrase changed.');
    } catch (err) {
      setPassErr(err.message);
    } finally {
      setPassBusy(false);
    }
  };

  // ── Quizzes ──
  const [quizzes, setQuizzes] = useState(null);
  const [quizErr, setQuizErr] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    api.get(`/users/${user.id}/quizzes?limit=100`)
      .then(setQuizzes)
      .catch(() => setQuizErr('Could not load quizzes.'));
  }, [user.id]);

  const deleteQuiz = async (id) => {
    if (!confirm('Delete this quiz? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/quizzes/${id}`);
      setQuizzes(q => q.filter(x => x.id !== id));
    } catch {
      alert('Could not delete quiz.');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Delete account ──
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteErr, setDeleteErr] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString() : '—';
  const fmtScore = (s) => s != null ? `${Math.round(s * 100)}%` : '—';

  return (
    <div className="settings-page">
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Settings</h1>

      {/* ── Stats ── */}
      {!stats && (
        <div className="skeleton-grid" style={{ marginTop: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-stat">
              <div className="skeleton" style={{ width: 44, height: 26 }} />
              <div className="skeleton" style={{ width: 72, height: 11 }} />
            </div>
          ))}
        </div>
      )}
      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{stats.quizzesCompleted}</div>
            <div className="stat-label">Quizzes done</div>
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
            <div className="stat-num">{stats.streak} 🔥</div>
            <div className="stat-label">Current streak</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{stats.bestStreak}</div>
            <div className="stat-label">Best streak</div>
          </div>
        </div>
      )}

      {/* ── Appearance ── */}
      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="theme-toggle">
          <label className="toggle-switch" htmlFor="theme-toggle">
            <input id="theme-toggle" type="checkbox" checked={isDark} onChange={toggleTheme} />
            <span className="toggle-slider" />
          </label>
          <span className="theme-toggle-label">{isDark ? 'Dark mode' : 'Light mode'}</span>
        </div>
      </section>

      {/* ── Profile ── */}
      <section className="settings-section">
        <h2>Profile</h2>
        <form onSubmit={saveName}>
          <div className="form-group">
            <label>Display name</label>
            <div className="settings-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input value={newName} onChange={e => { setNewName(e.target.value); setNameSuccess(''); }} required />
                {nameHint && (
                  <p className={`name-hint ${nameHint.ok ? 'name-hint--ok' : 'name-hint--bad'}`}>{nameHint.msg}</p>
                )}
                {nameSuccess && <p className="success-msg">{nameSuccess}</p>}
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={nameBusy || (!nameHint?.ok && newName.trim() !== user?.display_name)}
                style={{ flexShrink: 0 }}
              >
                {nameBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>

        <hr style={{ margin: '1.25rem 0' }} />

        <form onSubmit={saveEmail}>
          <div className="form-group">
            <label>Email <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.8rem' }}>(used for password reset)</span></label>
            <div className="settings-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input type="email" value={newEmail} onChange={e => { setNewEmail(e.target.value); setEmailSuccess(''); setEmailErr(''); }} required />
                {emailErr && <p className="error-msg">{emailErr}</p>}
                {emailSuccess && <p className="success-msg">{emailSuccess}</p>}
              </div>
              <button type="submit" className="btn btn-primary btn-sm" disabled={emailBusy} style={{ flexShrink: 0 }}>
                {emailBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ── Security ── */}
      <section className="settings-section">
        <h2>Security</h2>
        <form onSubmit={savePassword}>
          <div className="form-group">
            <label>Current passphrase</label>
            <input type="password" autoComplete="current-password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New passphrase</label>
            <input type="password" autoComplete="new-password" value={newPass} onChange={e => setNewPass(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm new passphrase</label>
            <input type="password" autoComplete="new-password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
          </div>
          {passErr && <p className="error-msg">{passErr}</p>}
          {passSuccess && <p className="success-msg">{passSuccess}</p>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={passBusy}>
            {passBusy ? 'Saving…' : 'Change passphrase'}
          </button>
        </form>
      </section>

      {/* ── Study Preferences ── */}
      <section className="settings-section">
        <h2>Study Preferences</h2>
        <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          These defaults pre-fill the quiz generator on every unit.
        </p>
        <div className="form-group">
          <label>Default question count</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem', maxWidth: 240 }}>
            {QCOUNT_OPTIONS.map(n => (
              <button
                key={n}
                type="button"
                className={`btn btn-sm ${prefs.questionCount === n ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPrefs(p => ({ ...p, questionCount: n }))}
              >{n}</button>
            ))}
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '.75rem' }}>
          <label>Default difficulty</label>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {DIFFICULTY_OPTIONS.map(d => (
              <button
                key={d}
                type="button"
                className={`btn btn-sm ${prefs.difficulty === d ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setPrefs(p => ({ ...p, difficulty: d }))}
              >{d}</button>
            ))}
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '.75rem' }}>
          <label>Default question types</label>
          <div className="type-checks">
            {TYPE_OPTIONS.map(t => (
              <div key={t.value} className="type-check-row">
                <span>{t.label}</span>
                <label className="toggle-switch">
                  <input type="checkbox" checked={prefs.types?.includes(t.value) ?? false} onChange={() => togglePrefType(t.value)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            ))}
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '.75rem' }}>
          <label>Default review mix — {Math.round((prefs.reviewMix ?? 0.2) * 100)}% of questions target your weak topics</label>
          <input
            type="range"
            min="0" max="0.5" step="0.1"
            value={prefs.reviewMix ?? 0.2}
            onChange={e => setPrefs(p => ({ ...p, reviewMix: Number(e.target.value) }))}
            style={{ width: '100%', maxWidth: 300 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--muted)', maxWidth: 300 }}>
            <span>All new</span><span>50% review</span>
          </div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ marginTop: '.5rem' }} onClick={savePrefs}>
          {prefsSaved ? 'Saved!' : 'Save preferences'}
        </button>
      </section>

      {/* ── My Quizzes ── */}
      <section className="settings-section">
        <h2>My Quizzes</h2>
        {quizErr && <p className="error-msg">{quizErr}</p>}
        {quizzes === null && !quizErr && <p className="empty" style={{ padding: '.5rem 0' }}>Loading…</p>}
        {quizzes?.length === 0 && <p className="empty" style={{ padding: '.5rem 0' }}>No quizzes yet.</p>}
        {quizzes?.length > 0 && (
          <div className="quiz-delete-list">
            {quizzes.map(q => (
              <div key={q.id} className="quiz-delete-row">
                <div className="qdl">
                  <div className="qdl-title">{q.title}</div>
                  <div className="qdl-meta">
                    {fmtDate(q.created_at)}
                    {q.score != null && ` · ${fmtScore(q.score)}`}
                    {` · ${q.status}`}
                  </div>
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  disabled={deletingId === q.id}
                  onClick={() => deleteQuiz(q.id)}
                >
                  {deletingId === q.id ? '…' : 'Delete'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Studying ── */}
      <section className="settings-section">
        <h2>Studying</h2>
        <div className="settings-row">
          <div>
            <strong>Rappel voice auto-play</strong>
            <p style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: '.1rem' }}>
              When enabled, Rappel speaks each reply automatically. You can also toggle this per-session using the 🔊 button in chat.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={!!prefs.voiceAutoPlay}
              onChange={() => {
                const next = !prefs.voiceAutoPlay;
                setPrefs(p => ({ ...p, voiceAutoPlay: next }));
                api.put('/preferences', { voiceAutoPlay: next }).catch(() => {});
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <strong>Rappel voice</strong>
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.25rem 0 .6rem' }}>
            Choose whose voice you hear when Rappel speaks.
          </p>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            {[{ value: 'mathieu', label: 'Mathieu' }, { value: 'juliette', label: 'Juliette' }].map(v => (
              <button
                key={v.value}
                type="button"
                className={`btn btn-sm ${(prefs.rappelVoice ?? 'mathieu') === v.value ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setPrefs(p => ({ ...p, rappelVoice: v.value }));
                  api.put('/preferences', { rappelVoice: v.value }).catch(() => {});
                  playVoicePreview(v.value);
                }}
              >
                {previewingVoice === v.value ? '🔊 ' : ''}{v.label}
              </button>
            ))}
            <span style={{ fontSize: '.75rem', color: 'var(--muted)', alignSelf: 'center' }}>
              {previewingVoice ? 'Playing preview…' : 'Click to hear a preview'}
            </span>
          </div>
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <strong>Export your data</strong>
          <p style={{ fontSize: '.8rem', color: 'var(--muted)', margin: '.25rem 0 .6rem' }}>
            Download a JSON file of all your quiz history, topic mastery, and flashcard review data.
          </p>
          <a
            href="/api/me/export"
            className="btn btn-ghost btn-sm"
            download="recall-export.json"
          >
            Download export
          </a>
        </div>
      </section>

      {/* ── Support ── */}
      <section className="settings-section">
        <h2>Support</h2>
        <p style={{ fontSize: '.9rem', marginBottom: '.75rem' }}>
          Found a bug or have a suggestion? Send it directly from the app — you can even attach a screenshot.
        </p>
        <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link to="/feedback" className="btn btn-primary btn-sm">Send feedback</Link>
          <a href="mailto:recallstudyapp.support@gmail.com" style={{ fontSize: '.8rem', color: 'var(--muted)' }}>
            or email us directly
          </a>
        </div>
      </section>

      {/* ── Danger zone ── */}
      <section className="settings-section danger-zone">
        <h2>Danger zone</h2>
        <p style={{ fontSize: '.875rem', marginBottom: '1rem', color: 'var(--muted)' }}>
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <div className="form-group">
          <label>Type <strong>{user?.display_name}</strong> to confirm</label>
          <input value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteErr(''); }} placeholder={user?.display_name} />
        </div>
        {deleteErr && <p className="error-msg">{deleteErr}</p>}
        <button
          className="btn btn-danger btn-sm"
          disabled={deleteInput !== user?.display_name || deletingAccount}
          onClick={async () => {
            setDeletingAccount(true);
            try {
              await api.delete('/me');
              window.location.href = '/login';
            } catch (err) {
              setDeleteErr(err.message || 'Could not delete account.');
              setDeletingAccount(false);
            }
          }}
        >
          {deletingAccount ? 'Deleting…' : 'Delete my account'}
        </button>
      </section>
    </div>
  );
}
