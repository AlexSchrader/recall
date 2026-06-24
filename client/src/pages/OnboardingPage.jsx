import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = 4;

const VOICES = [
  { value: 'mathieu', label: 'Mathieu', desc: 'Warm & grounded', avatarClass: '' },
  { value: 'juliette', label: 'Juliette', desc: 'Bright & encouraging', avatarClass: 'ob-voice-avatar--f' },
];

// Canned sample cards for the onboarding "try it" demo. Intentionally generic
// trivia so this step costs nothing — no AI call, no upload, works offline.
// The real, personalised generation happens after onboarding when the user
// uploads their own material.
const DEMO_CARDS = [
  { topic: 'Biology', front: "What's the “powerhouse of the cell”?", back: 'The mitochondria — it produces most of the cell’s energy (ATP).' },
  { topic: 'History', front: 'In what year did World War II end?', back: '1945.' },
];

function DemoStep({ onContinue }) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const card = DEMO_CARDS[idx];
  const isLast = idx === DEMO_CARDS.length - 1;

  const rate = () => {
    if (isLast) { onContinue(); return; }
    setIdx(i => i + 1);
    setRevealed(false);
  };

  return (
    <div className="ob-step">
      <h2 className="ob-title">Try a card</h2>
      <p className="ob-sub">This is how studying feels — read the question, reveal the answer, then tell Recall how it went. Your weak cards come back sooner.</p>

      <div className="ob-demo-card" onClick={() => !revealed && setRevealed(true)}>
        <span className="ob-demo-topic">{card.topic}</span>
        <div className="ob-demo-text">{revealed ? card.back : card.front}</div>
        {!revealed && <div className="ob-demo-hint">Tap to reveal</div>}
      </div>

      <p className="ob-note">Card {idx + 1} of {DEMO_CARDS.length}</p>

      {revealed ? (
        <div className="ob-demo-rate">
          <button className="btn btn-ghost" onClick={rate}>Still fuzzy</button>
          <button className="btn btn-primary" onClick={rate}>{isLast ? 'Got it — continue →' : 'Got it!'}</button>
        </div>
      ) : (
        <button className="btn btn-primary ob-cta" onClick={() => setRevealed(true)}>Show answer</button>
      )}
    </div>
  );
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [voice, setVoice] = useState('mathieu');
  const [playing, setPlaying] = useState(null); // 'mathieu' | 'juliette' | null
  const [busy, setBusy] = useState(false);
  const { prefs, setPrefs } = useAuth();
  const navigate = useNavigate();
  const audioRef = useRef(null);

  const playPreview = async (e, v) => {
    e.stopPropagation();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playing === v) { setPlaying(null); return; }

    setPlaying(v);

    // Create Audio synchronously inside the click handler so iOS/Safari
    // doesn't block autoplay (user gesture must be on the call stack).
    const audio = new Audio();
    audioRef.current = audio;

    try {
      const res = await fetch(`/api/voice/preview?voice=${v}`, { credentials: 'include' });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`[voice/preview] HTTP ${res.status}`, text);
        setPlaying(null);
        return;
      }
      const blob = await res.blob();
      console.log('[voice/preview] blob size:', blob.size, 'type:', blob.type);
      const url = URL.createObjectURL(blob);
      audio.src = url;
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setPlaying(null); };
      audio.onerror = (err) => { console.error('[voice/preview] audio error', err); setPlaying(null); };
      const playPromise = audio.play();
      if (playPromise) playPromise.catch(err => { console.error('[voice/preview] play() rejected:', err); setPlaying(null); });
    } catch (err) {
      console.error('[voice/preview] fetch error:', err);
      setPlaying(null);
    }
  };

  const finish = async () => {
    setBusy(true);
    try {
      const updated = { ...(prefs ?? {}), rappelVoice: voice, onboardingDone: true };
      await api.put('/preferences', updated);
      setPrefs(updated);
    } catch { /* non-fatal */ }
    // Land them straight in the "create your first course" flow rather than a
    // bare home page — the activation step of onboarding is getting real
    // material in, so open that form for them.
    navigate('/?start=1', { replace: true });
  };

  return (
    <div className="ob-page">
      <div className="ob-card">
        <div className="ob-dots">
          {Array.from({ length: STEPS }).map((_, i) => (
            <span
              key={i}
              className={`ob-dot${i + 1 === step ? ' ob-dot--active' : i + 1 < step ? ' ob-dot--done' : ''}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="ob-step">
            <div className="ob-emoji">📚</div>
            <h1 className="ob-title">Welcome to Recall</h1>
            <p className="ob-sub">Your adaptive AI study companion. Upload your notes, generate quizzes, and master any subject with spaced repetition.</p>
            <button className="btn btn-primary ob-cta" onClick={() => setStep(2)}>Let's go →</button>
          </div>
        )}

        {step === 2 && (
          <div className="ob-step">
            <h2 className="ob-title">How it works</h2>
            <div className="ob-features">
              <div className="ob-feature">
                <span className="ob-feature-icon">📄</span>
                <div>
                  <strong>Upload</strong>
                  <p>Add PDFs, DOCX, images, or paste text — Recall reads your exact material.</p>
                </div>
              </div>
              <div className="ob-feature">
                <span className="ob-feature-icon">⚡</span>
                <div>
                  <strong>Generate</strong>
                  <p>AI builds quizzes, flashcards, and study guides tailored to your content.</p>
                </div>
              </div>
              <div className="ob-feature">
                <span className="ob-feature-icon">📈</span>
                <div>
                  <strong>Master</strong>
                  <p>Spaced repetition surfaces your weak spots. Study smarter, not longer.</p>
                </div>
              </div>
            </div>
            <button className="btn btn-primary ob-cta" onClick={() => setStep(3)}>Try it →</button>
          </div>
        )}

        {step === 3 && (
          <DemoStep onContinue={() => setStep(4)} />
        )}

        {step === 4 && (
          <div className="ob-step">
            <h2 className="ob-title">Meet Rappel</h2>
            <p className="ob-sub">Your AI tutor — patient, encouraging, and always there to help you study. Choose a voice:</p>
            <div className="ob-voices">
              {VOICES.map(v => (
                <div
                  key={v.value}
                  role="radio"
                  aria-checked={voice === v.value}
                  tabIndex={0}
                  className={`ob-voice-card${voice === v.value ? ' ob-voice-card--active' : ''}`}
                  onClick={() => setVoice(v.value)}
                  onKeyDown={e => e.key === 'Enter' && setVoice(v.value)}
                >
                  <span className={`ob-voice-avatar${v.avatarClass ? ` ${v.avatarClass}` : ''}`}>
                    {v.label[0]}
                  </span>
                  <strong>{v.label}</strong>
                  <span className="ob-voice-desc">{v.desc}</span>
                  <button
                    type="button"
                    className={`ob-play-btn${playing === v.value ? ' ob-play-btn--active' : ''}`}
                    onClick={(e) => playPreview(e, v.value)}
                    title={playing === v.value ? 'Stop' : 'Hear intro'}
                  >
                    {playing === v.value ? '■' : '▶'}
                  </button>
                </div>
              ))}
            </div>
            <p className="ob-note">You can change this anytime in Settings → Studying.</p>
            <button className="btn btn-primary ob-cta" disabled={busy} onClick={finish}>
              {busy ? 'Setting up…' : 'Start studying →'}
            </button>
          </div>
        )}

        {step > 1 && (
          <button className="ob-back" onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
      </div>
    </div>
  );
}
