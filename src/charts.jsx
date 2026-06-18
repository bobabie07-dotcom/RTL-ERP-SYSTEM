import React from 'react';

/* RTL Poultry Farming ERP — lightweight inline-SVG charts for the UI kit.
   Cosmetic recreations (not a charting lib). Named exports. */

export function LineChart({ data, color = 'var(--green-500)', height = 180, labels = [], yTicks = [], dotted = false }) {
  const w = 560, h = height, padL = 36, padB = 26, padT = 10, padR = 8;
  const max = Math.max(...data) * 1.15 || 1;
  const min = 0;
  const ix = (i) => padL + (i / (data.length - 1)) * (w - padL - padR);
  const iy = (v) => padT + (1 - (v - min) / (max - min)) * (h - padT - padB);
  const pts = data.map((v, i) => `${ix(i)},${iy(v)}`).join(' ');
  const area = `${padL},${h - padB} ${pts} ${ix(data.length - 1)},${h - padB}`;
  const grid = yTicks.length ? yTicks : [0, max * 0.25, max * 0.5, max * 0.75, max];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} preserveAspectRatio="none">
      {grid.map((t, i) => {
        const y = iy(t);
        return <g key={i}>
          <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--border-subtle)" strokeWidth="1" />
          <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-body)">{Math.round(t)}</text>
        </g>;
      })}
      <polygon points={area} fill={color} opacity="0.07" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dotted ? '5 4' : 'none'} />
      {data.map((v, i) => <circle key={i} cx={ix(i)} cy={iy(v)} r="3.4" fill="#fff" stroke={color} strokeWidth="2" />)}
      {labels.map((l, i) => <text key={i} x={ix(i)} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--text-muted)" fontFamily="var(--font-body)">{l}</text>)}
    </svg>
  );
}

export function DonutChart({ segments, size = 168, thickness = 30 }) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {segments.map((s, i) => {
          const len = (s.value / total) * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-acc} />
          );
          acc += len;
          return el;
        })}
      </g>
    </svg>
  );
}

export function BarChart({ data, height = 180, labels = [], ranks = [] }) {
  const w = 560, h = height, padL = 30, padB = 40, padT = 16, padR = 8;
  const max = Math.max(...data.map(d => d.value)) * 1.18 || 1;
  const n = data.length;
  const slot = (w - padL - padR) / n;
  const bw = slot * 0.46;
  const iy = (v) => padT + (1 - v / max) * (h - padT - padB);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const x = padL + slot * i + (slot - bw) / 2;
        const y = iy(d.value);
        return <g key={i}>
          <rect x={x} y={y} width={bw} height={h - padB - y} rx="5" fill={d.color} />
          <text x={x + bw / 2} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--text-strong)" fontFamily="var(--font-display)">{d.label2}</text>
          <text x={x + bw / 2} y={h - padB + 16} textAnchor="middle" fontSize="9" fill="var(--text-secondary)" fontFamily="var(--font-body)">{labels[i]}</text>
          {ranks[i] != null ? <text x={x + bw / 2} y={h - padB + 30} textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--text-muted)" fontFamily="var(--font-body)">{ranks[i]}</text> : null}
        </g>;
      })}
    </svg>
  );
}
