import { useEffect } from 'react';

// Desktop keyboard answering for the one-at-a-time drill games: press 1–9 to
// pick the matching option. Inert while `active` is false (between questions,
// after answering, on result screens) and ignores keystrokes in text inputs.
export function useOptionKeys(active, options, onPick) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= (options?.length ?? 0)) { e.preventDefault(); onPick(options[n - 1]); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, options, onPick]);
}
