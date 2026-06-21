import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';

const STEPS = 3;

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [voice, setVoice] = useState('mathieu');
  const [busy, setBusy] = useState(false);
  const { prefs, setPrefs } = useAuth();
  const navigate = useNavigate();

  const finish = async () => {
    setBusy(true);
    try {
      const updated = { ...(prefs ?? {}), rappelVoice: voice, onboardingDone: true };
      await api.put('/preferences', updated);
      setPrefs(updated);
    } catch { /* non-fatal */ }
    navigate('/', { replace: true });
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
            <button className="btn btn-primary ob-cta" onClick={() => setStep(3)}>Meet your tutor →</button>
          </div>
        )}

        {step === 3 && (
          <div className="ob-step">
            <h2 className="ob-title">Meet Rappel</h2>
            <p className="ob-sub">Your AI tutor — patient, encouraging, and always there to help you study. Choose a voice:</p>
            <div className="ob-voices">
              <button
                type="button"
                className={`ob-voice-card${voice === 'mathieu' ? ' ob-voice-card--active' : ''}`}
                onClick={() => setVoice('mathieu')}
              >
                <span className="ob-voice-avatar">M</span>
                <strong>Mathieu</strong>
                <span className="ob-voice-desc">Warm &amp; grounded</span>
              </button>
              <button
                type="button"
                className={`ob-voice-card${voice === 'juliette' ? ' ob-voice-card--active' : ''}`}
                onClick={() => setVoice('juliette')}
              >
                <span className="ob-voice-avatar ob-voice-avatar--f">J</span>
                <strong>Juliette</strong>
                <span className="ob-voice-desc">Bright &amp; encouraging</span>
              </button>
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
