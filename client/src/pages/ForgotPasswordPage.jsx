import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import lockup from '../assets/brand/recall-lockup.svg';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    await api.post('/auth/forgot-password', { email: email.trim() }).catch(() => {});
    setSent(true);
    setBusy(false);
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src={lockup} alt="Recall" className="auth-lockup" />
        <h1>Forgot password</h1>
        {sent ? (
          <>
            <p>If an account exists for <strong>{email}</strong>, a reset link is on its way.</p>
            <p style={{ marginTop: '1rem', fontSize: '.875rem', textAlign: 'center' }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </>
        ) : (
          <form onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="forgot-email">Email</label>
              <input id="forgot-email" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus required />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '.5rem' }} disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p style={{ marginTop: '1rem', fontSize: '.875rem', textAlign: 'center' }}>
              <Link to="/login">Back to sign in</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
