import React from 'react';

/**
 * RTL Poultry Farming ERP — Badge
 * Small status pill. Tones map to semantic states; "soft" (default) uses a
 * tinted background, "solid" fills with the color, "dot" adds a leading dot.
 */
export function Badge({
  children,
  tone = 'success',
  variant = 'soft',
  dot = false,
  style = {},
}) {
  const tones = {
    success: { color: 'var(--success)', bg: 'var(--success-bg)', solid: 'var(--success)' },
    danger: { color: 'var(--danger)', bg: 'var(--danger-bg)', solid: 'var(--danger)' },
    warning: { color: 'var(--warning)', bg: 'var(--warning-bg)', solid: 'var(--warning)' },
    info: { color: 'var(--info)', bg: 'var(--info-bg)', solid: 'var(--info)' },
    neutral: { color: 'var(--gray-600)', bg: 'var(--gray-100)', solid: 'var(--gray-500)' },
  };
  const t = tones[tone] || tones.success;
  const solid = variant === 'solid';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '3px 10px',
      borderRadius: 'var(--radius-pill)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      lineHeight: 1.4,
      color: solid ? '#fff' : t.color,
      background: solid ? t.solid : t.bg,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {dot ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: solid ? '#fff' : t.solid }} /> : null}
      {children}
    </span>
  );
}
