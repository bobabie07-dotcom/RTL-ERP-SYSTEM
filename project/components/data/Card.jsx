import React from 'react';

/**
 * RTL Poultry Farming ERP — Card
 * The workspace surface: white, 14px radius, hairline border + soft shadow.
 * Optional title row with a right-aligned `action` node (e.g. a Select or
 * "View All" link).
 */
export function Card({ title, subtitle, action, children, padding = 24, style = {}, bodyStyle = {} }) {
  return (
    <section style={{
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-card)',
      overflow: 'hidden',
      ...style,
    }}>
      {(title || action) ? (
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: `${padding - 6}px ${padding}px`,
          borderBottom: '1px solid var(--border-subtle)',
        }}>
          <div>
            {title ? <h3 style={{ font: 'var(--type-h2)', fontSize: 'var(--text-lg)', color: 'var(--text-strong)' }}>{title}</h3> : null}
            {subtitle ? <p style={{ margin: '3px 0 0', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{subtitle}</p> : null}
          </div>
          {action ? <div style={{ flex: '0 0 auto' }}>{action}</div> : null}
        </header>
      ) : null}
      <div style={{ padding, ...bodyStyle }}>{children}</div>
    </section>
  );
}
