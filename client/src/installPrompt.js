// Lightweight install helpers for the "Add to Home Screen" guide.
// Captures the (Chromium-only) beforeinstallprompt event early so a one-tap
// install button can be offered when the browser supports it; everything else
// falls back to manual per-platform steps, which always work.

let deferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    listeners.forEach(l => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach(l => l());
  });
}

export function hasInstallPrompt() {
  return deferredPrompt !== null;
}

export function onInstallChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Fire the native install prompt. Returns true if the user accepted.
export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach(l => l());
  return outcome === 'accepted';
}

// True when the app is already running as an installed PWA.
export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true; // iOS Safari
}

export function getPlatform() {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}
