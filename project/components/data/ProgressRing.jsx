import React from 'react';

/**
 * RTL Poultry Farming ERP — ProgressRing
 * Circular percentage indicator (batch progress, survival rate). SVG ring
 * with a green track by default; center shows the value + optional caption.
 */
export function ProgressRing({
  value = 0,
  size = 96,
  thickness = 9,
  color = 'var(--green-500)',
  track = 'var(--gray-200)',
  label,
  style = {},
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  return (
    <div style={{ position: 'relative', width: size, height: size, ...style }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={thickness} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset var(--dur-slow) var(--ease-out)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: size * 0.24, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1 }}>{pct}%</span>
        {label ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>{label}</span> : null}
      </div>
    </div>
  );
}
