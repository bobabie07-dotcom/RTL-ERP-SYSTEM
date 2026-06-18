import React from 'react';

/**
 * RTL Poultry Farming ERP — StatCard
 * The signature KPI tile: label + big value on the left, a 48px tinted circle
 * with a line icon on the right, and a signed trend delta below.
 * `tone` colors the icon circle; `trendGood` decides delta color independent
 * of arrow direction (mortality going down is good).
 */
export function StatCard({
  label,
  value,
  icon = null,
  tone = 'green',
  delta,
  deltaDir = 'up',
  deltaGood,
  caption = 'vs last month',
  style = {},
}) {
  const tones = {
    green: { fg: 'var(--green-500)', bg: 'var(--green-50)' },
    red: { fg: 'var(--danger)', bg: 'var(--danger-bg)' },
    amber: { fg: 'var(--warning)', bg: 'var(--warning-bg)' },
    blue: { fg: 'var(--info)', bg: 'var(--info-bg)' },
    purple: { fg: 'var(--viz-utilities)', bg: '#F1ECFD' },
  };
  const t = tones[tone] || tones.green;
  // If deltaGood not specified, "up" is good by default.
  const good = deltaGood == null ? deltaDir === 'up' : deltaGood;
  const deltaColor = good ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      padding: 'var(--space-6)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
        {icon ? (
          <span style={{
            width: 48, height: 48, flex: '0 0 auto', borderRadius: '50%',
            background: t.bg, color: t.fg,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ display: 'inline-flex', width: 22, height: 22 }}>{icon}</span>
          </span>
        ) : null}
      </div>
      <div style={{
        marginTop: 10,
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-3xl)',
        fontWeight: 700,
        color: 'var(--text-strong)',
        fontVariantNumeric: 'tabular-nums',
        lineHeight: 1.1,
      }}>{value}</div>
      {delta != null ? (
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)' }}>
          <span style={{ color: deltaColor, fontWeight: 700 }}>{deltaDir === 'up' ? '↑' : '↓'} {delta}</span>
          <span style={{ color: 'var(--text-muted)' }}>{caption}</span>
        </div>
      ) : null}
    </div>
  );
}
