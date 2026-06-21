import { useState, useEffect } from 'react';
import { api } from '../api.js';

const FEATURE_LABELS = {
  quiz_gen:        'Quiz gen',
  flashcard_gen:   'Flashcard gen',
  study_guide_gen: 'Study guide gen',
  grading:         'Grading',
  chat:            'Rappel chat',
};

function fmt$( n ) { return n < 0.01 ? '<$0.01' : `$${n.toFixed(4)}`; }
function fmtK( n ) { return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n); }

export default function AdminPage() {
  const [data, setData]     = useState(null);
  const [error, setError]   = useState('');
  const [month, setMonth]   = useState(new Date().toISOString().slice(0, 7));
  const [view, setView]     = useState('monthly'); // 'monthly' | 'detail' | 'users'

  useEffect(() => {
    setError('');
    api.get(`/admin/usage?month=${month}`)
      .then(setData)
      .catch(e => setError(e.message));
  }, [month]);

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
        {[['monthly', 'Monthly by user'], ['detail', 'Daily detail'], ['users', 'All users']].map(([k, l]) => (
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

      {/* All users */}
      {view === 'users' && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr><th>Display name</th><th>Tier</th><th>Joined</th></tr>
            </thead>
            <tbody>
              {data.allUsers.map(u => (
                <tr key={u.id}>
                  <td>{u.display_name}</td>
                  <td><span className={`badge badge-${u.tier}`}>{u.tier}</span></td>
                  <td style={{ color: 'var(--muted)', fontSize: '.85rem' }}>{u.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
