import React from 'react';

/**
 * RTL Poultry Farming ERP — SidebarNav
 * The fixed dark-green app sidebar: brand lockup at top, a scrollable nav
 * list (icon + label, green active state), and an optional footer slot
 * (farm selector / brand slogan). Items: {key, label, icon}.
 */
export function SidebarNav({
  brand,
  items = [],
  active,
  onSelect,
  footer = null,
  width = 260,
  style = {},
}) {
  return (
    <nav style={{
      width,
      flex: `0 0 ${width}px`,
      height: '100%',
      background: 'var(--ink-900)',
      color: 'var(--text-on-dark)',
      display: 'flex',
      flexDirection: 'column',
      ...style,
    }}>
      {brand ? (
        <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {brand}
        </div>
      ) : null}

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onSelect && onSelect(it.key)}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '11px 14px',
                marginBottom: 2,
                border: 'none',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: 'var(--font-body)',
                fontSize: 'var(--text-base)',
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#fff' : 'rgba(232,240,235,0.78)',
                background: isActive ? 'var(--green-500)' : 'transparent',
                transition: 'background var(--dur-fast) var(--ease-std)',
              }}
            >
              <span style={{ display: 'inline-flex', width: 19, height: 19, flex: '0 0 auto', opacity: isActive ? 1 : 0.9 }}>{it.icon}</span>
              {it.label}
            </button>
          );
        })}
      </div>

      {footer ? <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>{footer}</div> : null}
    </nav>
  );
}
