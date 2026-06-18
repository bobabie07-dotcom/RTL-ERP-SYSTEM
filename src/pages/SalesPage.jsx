import React from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import Icons from '../icons';

const I = Icons;

const SALES = [
  { id: 'SO-2025-018', date: 'May 12, 2025', batch: 'BATCH-2025-06', buyer: 'Metro Poultry Buyers', qty: '2,400', pricePerKg: '₱140.00', total: '₱336,000', status: 'Completed' },
  { id: 'SO-2025-017', date: 'May 10, 2025', batch: 'BATCH-2025-05', buyer: 'Reyes Meat Shop', qty: '1,800', pricePerKg: '₱138.00', total: '₱248,400', status: 'Completed' },
  { id: 'SO-2025-016', date: 'May 08, 2025', batch: 'BATCH-2025-04', buyer: 'LGU Public Market', qty: '3,200', pricePerKg: '₱142.00', total: '₱454,400', status: 'Completed' },
  { id: 'SO-2025-015', date: 'May 06, 2025', batch: 'BATCH-2025-03', buyer: 'Foodservice Corp.', qty: '5,600', pricePerKg: '₱135.00', total: '₱756,000', status: 'Delivered' },
  { id: 'SO-2025-014', date: 'May 03, 2025', batch: 'BATCH-2025-06', buyer: 'Mercado Poultry', qty: '1,200', pricePerKg: '₱140.00', total: '₱168,000', status: 'Pending' },
  { id: 'SO-2025-013', date: 'Apr 30, 2025', batch: 'BATCH-2025-02', buyer: 'Juan Dela Cruz', qty: '800', pricePerKg: '₱136.00', total: '₱108,800', status: 'Completed' },
  { id: 'SO-2025-012', date: 'Apr 28, 2025', batch: 'BATCH-2025-02', buyer: 'Metro Poultry Buyers', qty: '4,100', pricePerKg: '₱138.00', total: '₱565,800', status: 'Delivered' },
  { id: 'SO-2025-011', date: 'Apr 25, 2025', batch: 'BATCH-2025-01', buyer: 'Reyes Meat Shop', qty: '2,600', pricePerKg: '₱134.00', total: '₱348,400', status: 'Completed' },
];

const statusTone = { Completed: 'success', Delivered: 'info', Pending: 'warning', Cancelled: 'danger' };

export default function SalesPage() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Sales & Procurement</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Track poultry sales, buyers, and revenue.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" icon={<I.procurement w={16} />}>New Purchase</Button>
          <Button variant="primary" size="md" icon={<I.plus w={16} />}>New Sale</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Revenue (₱)" value="₱6.78M" tone="blue" icon={<I.trendUp w={22} />} delta="12.4%" deltaDir="up" />
        <StatCard label="Total Sold (kg)" value="48,250" icon={<I.sales w={22} />} delta="8.2%" deltaDir="up" caption="this month" />
        <StatCard label="Avg. Price/kg" value="₱138.50" tone="amber" icon={<I.wallet w={22} />} delta="2.1%" deltaDir="up" />
        <StatCard label="Pending Deliveries" value="1" tone="red" icon={<I.alertTri w={22} />} caption="orders" />
      </div>

      <Card title="Sales Orders" action={<Select options={['All Time', 'This Month', 'Last Month']} />}>
        <DataTable
          columns={[
            { key: 'id', header: 'Order No.', strong: true },
            { key: 'date', header: 'Date' },
            { key: 'batch', header: 'Batch' },
            { key: 'buyer', header: 'Buyer' },
            { key: 'qty', header: 'Qty (kg)', align: 'right', numeric: true },
            { key: 'pricePerKg', header: 'Price/kg', align: 'right', numeric: true },
            { key: 'total', header: 'Total (₱)', align: 'right', numeric: true },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] || 'neutral'} dot>{r.status}</Badge> },
          ]}
          rows={SALES}
          rowKey="id"
        />
      </Card>
    </div>
  );
}
