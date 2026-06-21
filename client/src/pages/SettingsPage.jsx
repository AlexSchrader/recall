import { useState, useEffect, useRef, useCallback } from 'react';
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
const QCOUNT_OPTIONS = [5, 10, 15, 20];
const TYPE_OPTIONS = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short', label: 'Short answer' },
];

export default function SettingsPage() {
  const { user, setUser, refreshUser } = useAuth();

  // ── Stats ──
  const [stats, setStats] = useState(null);
  useEffect(() => {
    api.get('/me/stats').then(setStats).catch(() => {});
  }, []);

  // ── Study preferences ──
  const [prefs, setPrefs] = useState({ questionCount: 10, difficulty: 'mixed', types: ['mcq'] });
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
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
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
          <div style={{ display: 'flex', gap: '1rem', marginTop: '.35rem' }}>
            {TYPE_OPTIONS.map(t => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', cursor: 'pointer', fontSize: '.875rem' }}>
                <input type="checkbox" checked={prefs.types?.includes(t.value) ?? false} onChange={() => togglePrefType(t.value)} />
                {t.label}
              </label>
            ))}
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

      {/* ── Support ── */}
      <section className="settings-section">
        <h2>Support</h2>
        <p style={{ fontSize: '.9rem', marginBottom: '.75rem' }}>
          Found a bug or have a feature request? Send us an email.
        </p>
        <a
          href="mailto:recallstudyapp.support@gmail.com"
          className="btn btn-ghost btn-sm"
        >
          recallstudyapp.support@gmail.com
        </a>
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
