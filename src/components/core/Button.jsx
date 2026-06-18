import React, { useState } from 'react';

/**
 * RTL Poultry Farming ERP — Button
 * Variants: primary (green CTA), secondary (outlined), ghost, danger.
 * Sizes: sm | md | lg. Optional leading/trailing icon nodes.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon = null,
  trailingIcon = null,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  style = {},
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(false);

  const sizes = {
    sm: { padding: '0 12px', height: 32, font: 'var(--text-sm)', gap: 6, icon: 15 },
    md: { padding: '0 18px', height: 40, font: 'var(--text-base)', gap: 8, icon: 17 },
    lg: { padding: '0 24px', height: 48, font: 'var(--text-md)', gap: 9, icon: 19 },
  };
  const s = sizes[size] || sizes.md;

  const palettes = {
    primary: {
      base: { background: 'var(--green-500)', color: 'var(--white)', border: '1px solid var(--green-500)' },
      hover: { background: 'var(--green-600)', borderColor: 'var(--green-600)' },
    },
    secondary: {
      base: { background: 'var(--white)', color: 'var(--text-strong)', border: '1px solid var(--border)' },
      hover: { background: 'var(--gray-50)', borderColor: 'var(--border-strong)' },
    },
    ghost: {
      base: { background: 'transparent', color: 'var(--text-body)', border: '1px solid transparent' },
      hover: { background: 'var(--gray-100)' },
    },
    danger: {
      base: { background: 'var(--danger)', color: 'var(--white)', border: '1px solid var(--danger)' },
      hover: { background: '#D63A3A', borderColor: '#D63A3A' },
    },
  };
  const p = palettes[variant] || palettes.primary;

  const styleObj = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s.gap,
    height: s.height,
    padding: s.padding,
    width: fullWidth ? '100%' : 'auto',
    fontFamily: 'var(--font-body)',
    fontSize: s.font,
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'background var(--dur-fast) var(--ease-std), transform var(--dur-fast) var(--ease-std)',
    transform: active && !disabled ? 'scale(0.98)' : 'none',
    whiteSpace: 'nowrap',
    ...p.base,
    ...(hover && !disabled ? p.hover : {}),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={styleObj}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      {...rest}
    >
      {icon ? <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{icon}</span> : null}
      {children}
      {trailingIcon ? <span style={{ display: 'inline-flex', width: s.icon, height: s.icon }}>{trailingIcon}</span> : null}
    </button>
  );
}
