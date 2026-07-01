import React from 'react';
import { useFarm } from '../../context/FarmContext';

function PrinterIcon() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

export function PrintButton({ title = 'Report' }) {
  function handlePrint() {
    const prev = document.title;
    document.title = title;
    window.print();
    // Restore after a tick so the dialog sees the new title
    setTimeout(() => { document.title = prev; }, 500);
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="no-print"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 14px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-card)',
        color: 'var(--text-body)',
        fontSize: 13, fontWeight: 600,
        fontFamily: 'var(--font-body)',
        cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--gray-50)';
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'var(--surface-card)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      <PrinterIcon />
      Print / PDF
    </button>
  );
}

export function PrintPageHeader({ title }) {
  const { farms, farmId } = useFarm();
  const farmName = farms.find(f => f.id === farmId)?.name || 'RTL Poultry Farming';
  const dateStr  = new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="print-only" style={{ display: 'none', marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: '2px solid #16a34a',
        paddingBottom: 14, marginBottom: 16,
      }}>
        <img src="/logo-mark.png" alt="RTL Poultry" style={{ height: 52, objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', letterSpacing: '-0.01em' }}>
            RTL Poultry Farming ERP
          </div>
          <div style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>{farmName}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>Generated: {dateStr}</div>
        </div>
      </div>
    </div>
  );
}
