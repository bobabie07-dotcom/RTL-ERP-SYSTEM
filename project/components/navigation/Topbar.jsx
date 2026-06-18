import React from 'react';

/**
 * RTL Poultry Farming ERP — Topbar
 * The app header: menu toggle + page title on the left; right-aligned actions
 * slot (date picker, notifications, account). Sits above the content area.
 */
export function Topbar({ title, onMenu, left = null, right = null, style = {} }) {
  return (
    <header style={{
      height: 'var(--topbar-h)',
      flex: '0 0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      padding: '0 24px',
      background: 'var(--surface-card)',
      borderBottom: '1px solid var(--border)',
      ...style,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {onMenu ? (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Toggle menu"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-body)', display: 'inline-flex', padding: 4 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
        ) : null}
        {title ? <h1 style={{ font: 'var(--type-h1)', fontSize: 'var(--text-xl)', color: 'var(--text-strong)' }}>{title}</h1> : null}
        {left}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>{right}</div>
    </header>
  );
}
