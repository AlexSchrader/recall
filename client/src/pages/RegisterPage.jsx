import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import lockup from '../assets/brand/recall-lockup.svg';

export default function RegisterPage() {
  const { register } = useAuth();
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
      await register(displayName.trim(), passphrase);
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
        <h1>Create account</h1>
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Display name</label>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} autoFocus required />
          </div>
          <div className="form-group">
            <label>Passphrase</label>
            <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)} required />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button className="btn btn-primary" style={{ width: '100%', marginTop: '.5rem' }} disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '.875rem', textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
