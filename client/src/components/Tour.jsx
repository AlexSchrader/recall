import { useState, useLayoutEffect, useEffect, useCallback } from 'react';

// A guided spotlight tour: dims the screen, rings a real UI element (found by a
// `data-tour` selector), and explains it in a coachmark. Steps without a
// selector render a centered card (welcome / done).
export default function Tour({ steps, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[i];

  const measure = useCallback(() => {
    if (!step?.selector) { setRect(null); return; }
    const el = document.querySelector(step.selector);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  useLayoutEffect(() => { measure(); }, [measure]);

  // Keep the spotlight glued to the element through scroll/resize.
  useEffect(() => {
    const h = () => measure();
    window.addEventListener('resize', h);
    window.addEventListener('scroll', h, true);
    const t = setTimeout(measure, 320); // re-measure after scrollIntoView settles
    return () => { window.removeEventListener('resize', h); window.removeEventListener('scroll', h, true); clearTimeout(t); };
  }, [measure]);

  const finish = () => { try { localStorage.setItem('tourSeen', '1'); } catch { /* ignore */ } onClose(); };
  const next = () => (i < steps.length - 1 ? setI(i + 1) : finish());
  const back = () => setI(n => Math.max(0, n - 1));

  const PAD = 6;
  const spotlight = rect && {
    top: rect.top - PAD, left: rect.left - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2,
  };

  const COACH_W = 300;
  let coachStyle;
  if (rect) {
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - COACH_W - 12));
    coachStyle = rect.top < window.innerHeight * 0.5
      ? { top: rect.top + rect.height + 14, left }
      : { bottom: window.innerHeight - rect.top + 14, left };
  } else {
    coachStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }

  const last = i === steps.length - 1;

  return (
    <div className={`tour-overlay ${rect ? '' : 'tour-overlay--dim'}`}>
      {spotlight && <div className="tour-spotlight" style={spotlight} />}
      <div className="tour-coach" style={coachStyle}>
        <p className="tour-step-count">Step {i + 1} of {steps.length}</p>
        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button className="tour-skip" onClick={finish}>{last ? '' : 'Skip tour'}</button>
          <div style={{ display: 'flex', gap: '.4rem' }}>
            {i > 0 && <button className="btn btn-sm" onClick={back}>Back</button>}
            <button className="btn btn-primary btn-sm" onClick={next}>{last ? "Let's go!" : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
