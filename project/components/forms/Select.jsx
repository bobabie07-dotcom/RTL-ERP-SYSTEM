import React, { useState } from 'react';

/**
 * RTL Poultry Farming ERP — Select
 * Lightweight styled dropdown wrapping a native <select> for the filter
 * controls used across the ERP (farm picker, date range, category, status).
 */
export function Select({
  label,
  options = [],
  value,
  defaultValue,
  onChange,
  disabled = false,
  id,
  style = {},
}) {
  const [focus, setFocus] = useState(false);
  const selId = id || (label ? `sel-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const opts = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, ...style }}>
      {label ? (
        <label htmlFor={selId} style={{ fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-body)' }}>{label}</label>
      ) : null}
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        height: 42,
        background: disabled ? 'var(--gray-100)' : 'var(--white)',
        border: `1px solid ${focus ? 'var(--green-500)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: focus ? '0 0 0 3px var(--ring)' : 'none',
        transition: 'border-color var(--dur-fast), box-shadow var(--dur-fast)',
      }}>
        <select
          id={selId}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-base)',
            color: 'var(--text-strong)',
            padding: '0 38px 0 14px',
            height: '100%',
            width: '100%',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 12, pointerEvents: 'none', color: 'var(--text-muted)', fontSize: 11 }}>▾</span>
      </div>
    </div>
  );
}
