import React from 'react';

export function EmptyState({ title = 'No results found', body = 'Try adjusting your search or filters.', icon }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      {icon && (
        <span style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--gray-100)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </span>
      )}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>{title}</div>
        <div style={{ marginTop: 4, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{body}</div>
      </div>
    </div>
  );
}
