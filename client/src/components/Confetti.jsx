import { useMemo } from 'react';

const CONFETTI_COLORS = ['#4f46e5', '#16a34a', '#d97706', '#dc2626', '#0ea5e9', '#ec4899', '#8b5cf6'];

// Lightweight celebratory confetti burst. Pure CSS animation; no deps.
export default function Confetti({ count = 40 }) {
  const pieces = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: (Math.random() * 1.2).toFixed(2),
      rotStart: Math.floor(Math.random() * 360),
      rotEnd: Math.floor(Math.random() * 720),
      w: 8 + Math.floor(Math.random() * 8),
    })), [count]);

  return (
    <div className="confetti-wrap" aria-hidden>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}vw`,
            background: p.color,
            animationDelay: `${p.delay}s`,
            width: p.w,
            height: p.w * 1.5,
            '--rot-start': `${p.rotStart}deg`,
            '--rot-end': `${p.rotEnd}deg`,
          }}
        />
      ))}
    </div>
  );
}
