import React from 'react';

/**
 * RTL Poultry Farming ERP — Tag
 * Neutral, low-emphasis label/chip (categories, counts). Optional onRemove
 * renders a dismiss ✕. Quieter than Badge — no semantic color by default.
 */
export function Tag({ children, color = 'neutral', onRemove, style = {} }) {
  const colors = {
    neutral: { color: 'var(--gray-700)', bg: 'var(--gray-100)' },
    green: { color: 'var(--green-700)', bg: 'var(--green-50)' },
  };
  const c = colors[color] || colors.neutral;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 'var(--radius-sm)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-xs)',
      fontWeight: 500,
      color: c.color,
      background: c.bg,
      ...style,
    }}>
      {children}
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1, fontSize: 13, opacity: 0.7 }}
        >✕</button>
      ) : null}
    </span>
  );
}
