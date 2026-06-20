import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';
import lockup from '../assets/brand/recall-lockup.svg';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const token = searchParams.get('token') ?? '';
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (passphrase !== confirm) return setError('Passwords do not match.');
    setError('');
    setBusy(true);
    try {
      const user = await api.post('/auth/reset-password', { token, passphrase });
      setUser(user);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="error-msg">Invalid reset link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src={lockup} alt="Recall" className="auth-lockup" />
        <h1>Set new password</h1>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="reset-pass">New password</label>
            <input id="reset-pass" name="password" type="password" autoComplete="new-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} autoFocus required />
          </div>
          <div className="form-group">
            <label htmlFor="reset-confirm">Confirm password</label>
            <input id="reset-confirm" name="confirmPassword" type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '.5rem' }} disabled={busy}>
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </div>
    </div>
  );
}
