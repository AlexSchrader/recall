import { useState, useEffect } from 'react';
import { api } from '../api.js';

const FEATURE_LABELS = {
  quiz_gen:        'Quiz gen',
  flashcard_gen:   'Flashcard gen',
  study_guide_gen: 'Study guide gen',
  grading:         'Grading',
  chat:            'Rappel chat',
  tts:             'Voice (chars)',
};

function fmt$( n ) { return n < 0.01 ? '<$0.01' : `$${n.toFixed(4)}`; }
function fmtK( n ) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export default function AdminPage() {
  const [data, setData]     = useState(null);
  const [error, setError]   = useState('');
  const [month, setMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [view, setView]     = useState('monthly'); // 'monthly' | 'detail' | 'users' | 'feedback'
  const [feedback, setFeedback] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // user id pending delete
  const [locked, setLocked]   = useState(false);
  const [pin, setPin]         = useState('');
  const [pinError, setPinError] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    setError('');
    api.get(`/admin/usage?month=${month}`)
      .then(setData)
      .catch(e => {
        if (e.status === 403 && e.data?.locked) { setLocked(true); return; }
        setError(e.message);
      });
  }, [month]);

  const submitPin = async (e) => {
    e.preventDefault();
    setUnlocking(true);
    setPinError('');
    try {
      await api.post('/admin/unlock', { pin });
      setLocked(false);
      setPin('');
      // Refetch now that we're unlocked
      api.get(`/admin/usage?month=${month}`).then(setData).catch(e => setError(e.message));
    } catch {
      setPinError('Incorrect PIN.');
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (view === 'feedback' && !feedback) {
      api.get('/admin/feedback').then(setFeedback).catch(() => setFeedback([]));
    }
  }, [view]);

  if (locked) return (
    <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <form onSubmit={submitPin} style={{ width: '100%', maxWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔒</div>
        <h2 style={{ marginBottom: '1.5rem' }}>Admin PIN</h2>
        <input
          type="password"
          placeholder="Enter PIN"
          value={pin}
          onChange={e => setPin(e.target.value)}
          autoFocus
          style={{ width: '100%', marginBottom: '.75rem', textAlign: 'center', fontSize: '1.1rem', letterSpacing: '.15em' }}
        />
        {pinError && <p className="error-msg" style={{ marginBottom: '.75rem' }}>{pinError}</p>}
        <button className="btn btn-primary" style={{ width: '100%' }} disabled={unlocking || !pin}>
          {unlocking ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );

  if (error) return <div className="page" style={{ padding: '2rem' }}><p className="error-msg">{error}</p></div>;
  if (!data)  return <div className="page" style={{ padding: '2rem' }}><p style={{ color: 'var(--muted)' }}>Loading…</p></div>;

  const detailRows = view === 'detail'
    ? [...data.detail].sort((a, b) => new Date(b.day) - new Date(a.day))
    : [];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Usage &amp; cost</h1>
        <div className="admin-meta">
          <span className="admin-total">All-time est. cost: <strong>{fmt$(data.totalCostAllTime)}</strong></span>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '.3rem .5rem', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '.875rem' }}
          />
        </div>
      </div>

      {/* Tab strip */}
      <div className="admin-tabs">
        {[['monthly', 'Monthly by user'], ['detail', 'Daily detail'], ['users', 'All users'], ['feedback', 'Feedback']].map(([k, l]) => (
          <button key={k} className={`admin-tab ${view === k ? 'active' : ''}`} onClick={() => setView(k)}>{l}</button>
        ))}
      </div>

      {/* Monthly by user */}
      {view === 'monthly' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>User</th><th>Calls</th><th>Input tok</th><th>Output tok</th><th>Est. cost ({month})</th></tr>
            </thead>
            <tbody>
              {data.monthly.length === 0 && (
                <tr><td colSpan={5} style={{ color: 'var(--muted)', textAlign: 'center', padding: '1.5rem' }}>No usage logged for {month} yet.</td></tr>
              )}
              {data.monthly.map(r => (
                <tr key={r.user_id}>
                  <td>{r.display_name}</td>
                  <td>{r.calls}</td>
                  <td>{fmtK(r.input_tokens)}</td>
                  <td>{fmtK(r.output_tokens)}</td>
                  <td style={{ fontWeight: 600 }}>{fmt$(r.est_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Daily detail */}
      {view === 'detail' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Day</th><th>User</th><th>Feature</th><th>Model</th><th>Calls</th><th>In tok</th><th>Out tok</th><th>Est. cost</th></tr>
            </thead>
            <tbody>
              {detailRows.length === 0 && (
                <tr><td colSpan={8} style={{ color: 'var(--muted)', textAlign: 'center', padding: '1.5rem' }}>No usage data yet.</td></tr>
              )}
              {detailRows.map((r, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: 'nowrap' }}>{r.day}</td>
                  <td>{r.display_name}</td>
                  <td>{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                  <td style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{r.model}</td>
                  <td>{r.calls}</td>
                  <td>{fmtK(r.input_tokens)}</td>
                  <td>{fmtK(r.output_tokens)}</td>
                  <td>{fmt$(r.est_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Feedback */}
      {view === 'feedback' && (
        <div>
          {!feedback && <p style={{ color: 'var(--muted)', padding: '1.5rem 0' }}>Loading…</p>}
          {feedback?.length === 0 && <p style={{ color: 'var(--muted)', padding: '1.5rem 0' }}>No feedback submitted yet.</p>}
          {feedback?.map(f => {
            const label = f.type === 'bug' ? 'bug' : f.type === 'feature' ? 'enhancement' : 'feedback';
            const title = encodeURIComponent(`[${f.type}] from ${f.display_name}`);
            const body  = encodeURIComponent(`**From:** ${f.display_name}\n**Date:** ${f.created_at?.slice(0, 10)}\n\n---\n\n${f.message}`);
            const url   = `https://github.com/AlexSchrader/recall/issues/new?title=${title}&body=${body}&labels=${label}`;
            return (
              <div key={f.id} className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '.5rem' }}>
                  <div>
                    <span className={`badge badge-${f.type === 'bug' ? 'bad' : f.type === 'feature' ? 'ok' : 'partial'}`} style={{ marginRight: '.5rem' }}>{f.type}</span>
                    <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{f.display_name} · {f.created_at?.slice(0, 10)}</span>
                  </div>
                  <a href={url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">Open as GitHub issue →</a>
                </div>
                <p style={{ fontSize: '.9rem', whiteSpace: 'pre-wrap' }}>{f.message}</p>
                {f.screenshot && (
                  <img
                    src={`data:image/jpeg;base64,${f.screenshot}`}
                    alt="screenshot"
                    style={{ maxWidth: '100%', marginTop: '.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All users */}
      {view === 'users' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Display name</th><th>Tier</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              {data.allUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td><span className={`badge badge-${u.tier}`}>{u.tier}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{u.created_at?.slice(0, 10)}</td>
                  <td>
                    {confirmDelete === u.id ? (
                      <span style={{ fontSize: '.8rem' }}>
                        Sure?{' '}
                        <button className="btn btn-danger btn-sm" onClick={async () => {
                          await api.delete(`/admin/users/${u.id}`);
                          setData(d => ({ ...d, allUsers: d.allUsers.filter(x => x.id !== u.id) }));
                          setConfirmDelete(null);
                        }}>Yes, delete</button>{' '}
                        <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="btn btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', border: '1px solid' }} onClick={() => setConfirmDelete(u.id)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
