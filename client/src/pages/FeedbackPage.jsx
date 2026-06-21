import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const TYPES = [
  { value: 'bug',     label: 'Bug report',        hint: 'Something is broken or not working right' },
  { value: 'feature', label: 'Feature request',    hint: 'Something you wish the app could do' },
  { value: 'general', label: 'General feedback',   hint: 'Anything else on your mind' },
];

function compressImage(dataUrl, maxPx = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function FeedbackPage() {
  const navigate = useNavigate();
  const [type, setType] = useState('bug');
  const [message, setMessage] = useState('');
  const [screenshot, setScreenshot] = useState(null); // compressed data URL
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const dropRef = useRef(null);
  const fileRef = useRef(null);

  const addImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const raw = await readFileAsDataUrl(file);
    const compressed = await compressImage(raw);
    setScreenshot(compressed);
  }, []);

  // Paste from clipboard
  useEffect(() => {
    const onPaste = (e) => {
      const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'));
      if (item) addImage(item.getAsFile());
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [addImage]);

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    if (file) addImage(file);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!message.trim()) { setError('Please describe your feedback.'); return; }
    setBusy(true);
    setError('');
    try {
      await api.post('/feedback', { type, message: message.trim(), screenshot });
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="feedback-page">
        <div className="feedback-done">
          <div className="feedback-done-icon">✓</div>
          <h2>Thanks for the feedback!</h2>
          <p>We read every submission. If you reported a bug, we'll look into it.</p>
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => navigate(-1)}>
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-page">
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.25rem' }}>Send feedback</h1>

      <form onSubmit={submit} className="feedback-form">
        {/* Type */}
        <div className="form-group">
          <label>What kind of feedback?</label>
          <div className="feedback-type-row">
            {TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                className={`feedback-type-btn ${type === t.value ? 'active' : ''}`}
                onClick={() => setType(t.value)}
              >
                <span className="ftb-label">{t.label}</span>
                <span className="ftb-hint">{t.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        <div className="form-group">
          <label htmlFor="fb-msg">
            {type === 'bug'     ? 'What happened? What did you expect?' :
             type === 'feature' ? 'Describe the feature you\'d like.' :
             'What\'s on your mind?'}
          </label>
          <textarea
            id="fb-msg"
            rows={6}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={type === 'bug' ? 'Steps to reproduce: 1. … 2. … 3. …' : ''}
            maxLength={4000}
            required
          />
          <div style={{ fontSize: '.75rem', color: 'var(--muted)', textAlign: 'right', marginTop: '.2rem' }}>
            {message.length}/4000
          </div>
        </div>

        {/* Screenshot */}
        <div className="form-group">
          <label>Screenshot <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span></label>
          {screenshot ? (
            <div className="screenshot-preview">
              <img src={screenshot} alt="Screenshot preview" />
              <button type="button" className="screenshot-remove" onClick={() => setScreenshot(null)}>✕ Remove</button>
            </div>
          ) : (
            <div
              ref={dropRef}
              className="screenshot-drop"
              onDrop={onDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
            >
              <span>Tap to upload, drag & drop, or paste (Ctrl+V)</span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) addImage(e.target.files[0]); }}
              />
            </div>
          )}
        </div>

        {error && <p className="error-msg">{error}</p>}

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Sending…' : 'Send feedback'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
