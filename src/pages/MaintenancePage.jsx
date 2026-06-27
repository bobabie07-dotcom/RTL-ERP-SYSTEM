import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { DataTable } from '../components/data/DataTable';
import { maintenanceApi, farmsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';

const STATUS_TONE  = { pending: 'warning', in_progress: 'info', completed: 'success', cancelled: 'neutral' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed', cancelled: 'Cancelled' };

const CATEGORY_LABEL = {
  roofing: 'Roofing', plumbing: 'Plumbing', structural: 'Structural',
  gutter: 'Gutter', electrical: 'Electrical', dismantling: 'Dismantling', other: 'Other',
};

const fmt = n => n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaintenancePage() {
  const { farmId } = useFarm();

  const [logs,      setLogs]      = useState([]);
  const [houses,    setHouses]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    Promise.all([
      maintenanceApi.list({ farm_id: farmId }),
      farmsApi.houses(farmId),
    ]).then(([l, h]) => {
      setLogs(l || []);
      setHouses(h || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [farmId]);

  const houseById = Object.fromEntries(houses.map(h => [h.id, h]));

  const rows = logs.map(l => ({
    ...l,
    house_name:     houseById[l.house_id]?.name || `House #${l.house_id}`,
    categoryLabel:  CATEGORY_LABEL[l.category] || l.category,
  }));

  const pending    = rows.filter(r => r.status === 'pending').length;
  const inProgress = rows.filter(r => r.status === 'in_progress').length;
  const totalCost  = rows.filter(r => r.status === 'completed').reduce((s, r) => s + parseFloat(r.cost || 0), 0);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Maintenance</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Maintenance logs across all poultry houses.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Pending',       value: pending,            tone: pending > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'In Progress',   value: inProgress,         tone: inProgress > 0 ? 'var(--info)' : 'var(--text-secondary)' },
          { label: 'Total Records', value: rows.length,        tone: 'var(--text-strong)' },
          { label: 'Total Cost',    value: fmt(totalCost),     tone: 'var(--danger)' },
        ].map(c => (
          <div key={c.label} style={{ padding: '14px 16px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.tone }}>{loading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      <Card title="Maintenance Logs">
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading maintenance records…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No maintenance records found.</div>
        ) : (
          <DataTable
            columns={[
              { key: 'log_date',      header: 'Date',        strong: true },
              { key: 'house_name',    header: 'House' },
              { key: 'categoryLabel', header: 'Category' },
              { key: 'description',   header: 'Description', render: r => r.description || '—' },
              { key: 'cost',          header: 'Cost',        align: 'right', render: r => fmt(r.cost) },
              { key: 'status',        header: 'Status',      render: r => (
                <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{STATUS_LABEL[r.status] || r.status}</Badge>
              )},
              { key: 'batch_allocated', header: 'Allocated', render: r => (
                <Badge tone={r.batch_allocated ? 'success' : 'neutral'}>{r.batch_allocated ? 'Yes' : 'No'}</Badge>
              )},
            ]}
            rows={rows}
            rowKey="id"
          />
        )}
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        To add or update maintenance records, go to <strong>Poultry Houses</strong> and open a house card.
      </div>
    </div>
  );
}
