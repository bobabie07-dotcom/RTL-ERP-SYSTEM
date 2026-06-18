import React from 'react';
import { EmptyState } from '../core/EmptyState';

/**
 * RTL Poultry Farming ERP — DataTable
 * Clean list table for batches, inventory, transactions. Columns describe
 * header label, key, optional align and a render(row) for custom cells
 * (badges, currency, actions). Hairline row dividers, gray-50 hover.
 */
export function DataTable({ columns = [], rows = [], rowKey = 'id', style = {} }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto', ...style }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--font-body)' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{
                textAlign: c.align || 'left',
                padding: '12px 14px',
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'none',
                borderBottom: '1px solid var(--border)',
                whiteSpace: 'nowrap',
              }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} style={{ padding: 0, border: 'none' }}>
              <EmptyState />
            </td></tr>
          ) : rows.map((row, i) => (
            <tr
              key={row[rowKey] != null ? row[rowKey] : i}
              style={{ transition: 'background var(--dur-fast)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              {columns.map((c) => (
                <td key={c.key} style={{
                  textAlign: c.align || 'left',
                  padding: '13px 14px',
                  fontSize: 'var(--text-sm)',
                  color: c.strong ? 'var(--text-strong)' : 'var(--text-body)',
                  fontWeight: c.strong ? 600 : 400,
                  borderBottom: i < rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  fontVariantNumeric: c.numeric ? 'tabular-nums' : 'normal',
                  whiteSpace: 'nowrap',
                }}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
