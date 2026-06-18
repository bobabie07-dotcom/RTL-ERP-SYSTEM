import React from 'react';

/**
 * RTL Poultry Farming ERP — Avatar
 * Circular user avatar. Renders an image if `src` given, else initials on a
 * tinted background. Optional name + role caption (top-bar account block).
 */
export function Avatar({ src, name = '', role, size = 36, showText = false, style = {} }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const circle = (
    <span style={{
      width: size,
      height: size,
      flex: '0 0 auto',
      borderRadius: '50%',
      overflow: 'hidden',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: src ? 'var(--gray-100)' : 'var(--green-50)',
      color: 'var(--green-600)',
      fontFamily: 'var(--font-body)',
      fontWeight: 600,
      fontSize: Math.round(size * 0.4),
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </span>
  );

  if (!showText) return circle;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, ...style }}>
      {circle}
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-strong)' }}>{name}</span>
        {role ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{role}</span> : null}
      </span>
    </span>
  );
}
