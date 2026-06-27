import { useState, useEffect } from 'react';
import { onNeedRefresh, applyUpdate } from '../pwa.js';

// Shows a non-intrusive banner when a new app version is ready, instead of
// reloading mid-session. The user chooses when to refresh.
export default function UpdatePrompt() {
  const [ready, setReady] = useState(false);
  useEffect(() => onNeedRefresh(() => setReady(true)), []);

  if (!ready) return null;
  return (
    <div className="update-prompt">
      <span>A new version of Recall is ready.</span>
      <span style={{ display: 'flex', gap: '.4rem', flexShrink: 0 }}>
        <button className="btn btn-primary btn-sm" onClick={applyUpdate}>Refresh</button>
        <button className="btn btn-sm" onClick={() => setReady(false)}>Later</button>
      </span>
    </div>
  );
}
