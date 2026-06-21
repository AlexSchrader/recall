import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import lockup from '../assets/brand/recall-lockup.svg';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(displayName.trim(), passphrase);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <img src={lockup} alt="Recall" className="auth-lockup" />
        <h1>Sign in</h1>
        <form onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="login-name">Display name</label>
            <input id="login-name" name="displayName" autoComplete="username" value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus required />
          </div>
          <div className="form-group">
            <label htmlFor="login-pass">Passphrase</label>
            <input id="login-pass" name="password" type="password" autoComplete="current-password" value={passphrase} onChange={e => setPassphrase(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '.5rem' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p style={{ marginTop: '.75rem', fontSize: '.875rem', textAlign: 'center' }}>
          <Link to="/forgot-password">Forgot password?</Link>
        </p>
        <p style={{ marginTop: '.25rem', fontSize: '.875rem', textAlign: 'center' }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
