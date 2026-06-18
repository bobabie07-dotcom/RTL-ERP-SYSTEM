import React, { useState } from 'react';

/**
 * RTL Poultry Farming ERP — Input
 * Labeled text field with optional leading icon, trailing node (e.g. a
 * password reveal), and error state. Border greens + soft ring on focus.
 */
export function Input({
  label,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  onChange,
  icon = null,
  trailing = null,
  error,
  disabled = false,
  id,
  style = {},
  ...rest
}) {
  const [focus, setFocus] = useState(false);
  const inputId = id || (label ? `in-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const borderColor = error ? 'var(--danger)' : focus ? 'var(--green-500)' : 'var(--border)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, width: '100%', ...style }}>
      {label ? (
        <label htmlFor={inputId} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-body)' }}>{label}</label>
      ) : null}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 46,
        padding: '0 14px',
        background: disabled ? 'var(--gray-100)' : 'var(--white)',
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus && !error ? '0 0 0 3px var(--ring)' : 'none',
        transition: 'border-color var(--dur-fast) var(--ease-std), box-shadow var(--dur-fast) var(--ease-std)',
      }}>
        {icon ? <span style={{ display: 'inline-flex', width: 18, height: 18, color: 'var(--text-muted)', flex: '0 0 auto' }}>{icon}</span> : null}
        <input
          id={inputId}
          type={type}
          placeholder={placeholder}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-strong)',
            width: '100%',
          }}
          {...rest}
        />
        {trailing ? <span style={{ display: 'inline-flex', alignItems: 'center', color: 'var(--text-muted)', flex: '0 0 auto' }}>{trailing}</span> : null}
      </div>
      {error ? <span style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-xs)', color: 'var(--danger)' }}>{error}</span> : null}
    </div>
  );
}
