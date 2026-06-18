import React from 'react';

/**
 * RTL Poultry Farming ERP — Checkbox
 * Square checkbox with green checked fill (e.g. "Remember me", row select).
 */
export function Checkbox({ label, checked = false, onChange, disabled = false, id, style = {} }) {
  const cbId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label
      htmlFor={cbId}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 9,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        fontFamily: 'var(--font-body)',
        fontSize: 'var(--text-base)',
        color: 'var(--text-body)',
        ...style,
      }}
    >
      <span style={{
        width: 18,
        height: 18,
        flex: '0 0 auto',
        borderRadius: 5,
        border: `1.5px solid ${checked ? 'var(--green-500)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--green-500)' : 'var(--white)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background var(--dur-fast), border-color var(--dur-fast)',
      }}>
        {checked ? (
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2L4.8 8.5L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <input
        id={cbId}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
      {label}
    </label>
  );
}
