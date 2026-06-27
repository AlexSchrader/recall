import { useState, useEffect } from 'react';
import { getPlatform, hasInstallPrompt, onInstallChange, promptInstall } from '../installPrompt.js';

// Platform-aware "Add to Home Screen" guide, shown as a modal.
export default function InstallGuide({ onClose }) {
  const [platform, setPlatform] = useState('desktop');
  const [canPrompt, setCanPrompt] = useState(hasInstallPrompt());
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
    return onInstallChange(() => setCanPrompt(hasInstallPrompt()));
  }, []);

  const doInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) setInstalled(true);
  };

  return (
    <div className="pin-overlay" onClick={onClose}>
      <div className="install-modal" onClick={e => e.stopPropagation()}>
        <button className="install-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="install-icon">📱</div>
        <h2 style={{ marginBottom: '.35rem' }}>Add Recall to your home screen</h2>
        <p style={{ color: 'var(--muted)', fontSize: '.875rem', marginBottom: '1.25rem' }}>
          Get an app icon and full-screen, app-like experience — no app store needed.
        </p>

        {installed && <p className="success-msg" style={{ marginBottom: '1rem' }}>Installed! Look for Recall on your home screen. 🎉</p>}

        {/* One-tap install when the browser supports it (Android/desktop Chrome) */}
        {canPrompt && !installed && (
          <button className="btn btn-primary" style={{ width: '100%', marginBottom: '1.25rem' }} onClick={doInstall}>
            Install Recall
          </button>
        )}

        {platform === 'ios' && (
          <ol className="install-steps">
            <li>Tap the <strong>Share</strong> button at the bottom of Safari — the square with an arrow pointing up.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top corner. Done!</li>
          </ol>
        )}

        {platform === 'android' && !canPrompt && (
          <ol className="install-steps">
            <li>Tap the <strong>⋮ menu</strong> in the top-right of Chrome.</li>
            <li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>).</li>
            <li>Confirm with <strong>Add</strong>. Done!</li>
          </ol>
        )}

        {platform === 'desktop' && !canPrompt && (
          <ol className="install-steps">
            <li>Look for the <strong>install icon</strong> (a monitor with a down-arrow, ⊕) at the right of the address bar.</li>
            <li>Or open the browser <strong>⋮ menu</strong> and choose <strong>Install Recall…</strong></li>
            <li>Confirm <strong>Install</strong>. It opens in its own window.</li>
          </ol>
        )}

        {platform === 'ios' && (
          <p style={{ fontSize: '.78rem', color: 'var(--muted)', marginTop: '1rem' }}>
            On iPhone/iPad this only works in <strong>Safari</strong> — if you opened Recall in another browser, switch to Safari first.
          </p>
        )}
      </div>
    </div>
  );
}
