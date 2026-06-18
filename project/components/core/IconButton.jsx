import React, { useState } from 'react';

/**
 * RTL Poultry Farming ERP — IconButton
 * Square, icon-only button for top bars and table-row actions.
 * Tones: default (gray), brand (green), danger (red).
 */
export function IconButton({
  children,
  tone = 'default',
  size = 'md',
  badge = null,
  title,
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const sizes = { sm: 30, md: 36, lg: 42 };
  const dim = sizes[size] || sizes.md;

  const tones = {
    default: { color: 'var(--text-secondary)', hoverBg: 'var(--gray-100)', hoverColor: 'var(--text-strong)' },
    brand: { color: 'var(--green-500)', hoverBg: 'var(--green-50)', hoverColor: 'var(--green-600)' },
    danger: { color: 'var(--danger)', hoverBg: 'var(--danger-bg)', hoverColor: 'var(--danger)' },
  };
  const t = tones[tone] || tones.default;

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        width: dim,
        height: dim,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        cursor: 'pointer',
        color: hover ? t.hoverColor : t.color,
        background: hover ? t.hoverBg : 'transparent',
        transition: 'background var(--dur-fast) var(--ease-std), color var(--dur-fast) var(--ease-std)',
        ...style,
      }}
      {...rest}
    >
      <span style={{ display: 'inline-flex', width: Math.round(dim * 0.5), height: Math.round(dim * 0.5) }}>{children}</span>
      {badge != null ? (
        <span style={{
          position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, padding: '0 4px',
          background: 'var(--danger)', color: '#fff', borderRadius: 'var(--radius-pill)',
          fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
          fontFamily: 'var(--font-body)', border: '2px solid var(--white)',
        }}>{badge}</span>
      ) : null}
    </button>
  );
}
