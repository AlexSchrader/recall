// Reusable circular progress ring (SVG). Used by the daily-goal ring and the
// exam-readiness ring. Color comes from the caller so it can reflect state.
export default function ProgressRing({
  value,               // 0..1
  size = 64,
  stroke = 6,
  color = 'var(--primary)',
  track = 'var(--border)',
  label,               // big text in the middle (e.g. "68%")
  sublabel,            // small text under the label
}) {
  const pct = Math.max(0, Math.min(1, value ?? 0));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="ring-svg">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          className="ring-fill"
        />
      </svg>
      {(label != null || sublabel != null) && (
        <div className="ring-center">
          {label != null && <span className="ring-label">{label}</span>}
          {sublabel != null && <span className="ring-sublabel">{sublabel}</span>}
        </div>
      )}
    </div>
  );
}
