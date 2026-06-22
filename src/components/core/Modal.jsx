import React, { useEffect } from 'react';
import { Button } from './Button';

export function Modal({ open, title, onClose, onConfirm, confirmLabel = 'Save', confirmVariant = 'primary', loading = false, width = 520, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--surface-card)', borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: width,
        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: '1px solid var(--border-subtle)',
        }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>{children}</div>
        {onConfirm && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: '14px 24px', borderTop: '1px solid var(--border-subtle)' }}>
            <Button variant="secondary" size="md" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant={confirmVariant} size="md" onClick={onConfirm} disabled={loading}>{loading ? 'Saving…' : confirmLabel}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function FormRow({ label, children, required }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
      <label style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: 'var(--text-body)' }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

export function FieldInput({ value, onChange, type = 'text', placeholder, min, step, style }) {
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      min={min} step={step}
      style={{
        height: 40, padding: '0 12px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)',
        fontSize: 14, color: 'var(--text-strong)', background: 'var(--white)',
        width: '100%', boxSizing: 'border-box', outline: 'none',
        ...style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    />
  );
}

export function FieldSelect({ value, onChange, children }) {
  return (
    <select
      value={value} onChange={onChange}
      style={{
        height: 40, padding: '0 12px', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)',
        fontSize: 14, color: 'var(--text-strong)', background: 'var(--white)',
        width: '100%', boxSizing: 'border-box', outline: 'none', cursor: 'pointer',
      }}
      onFocus={e => e.target.style.borderColor = 'var(--green-500)'}
      onBlur={e => e.target.style.borderColor = 'var(--border)'}
    >
      {children}
    </select>
  );
}
