// Service-worker registration + update flow. We use registerType: 'prompt', so a
// new SW waits and we ask the user to refresh rather than reloading mid-session.
import { registerSW } from 'virtual:pwa-register';

let applyUpdateFn = null;
const subs = new Set();

export function initPWA() {
  applyUpdateFn = registerSW({
    immediate: true,
    onNeedRefresh() {
      subs.forEach(cb => cb());
    },
    onRegisteredSW(_url, reg) {
      // Re-check for a fresh service worker hourly while the app stays open.
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
}

// Subscribe to "an update is ready" — returns an unsubscribe fn.
export function onNeedRefresh(cb) {
  subs.add(cb);
  return () => subs.delete(cb);
}

// Activate the waiting SW and reload (only when the user opts in).
export function applyUpdate() {
  applyUpdateFn?.(true);
}
