import React from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import Icons from '../icons';

const I = Icons;

const SALES = [];

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
        <StatCard label="Total Revenue (₱)" value="₱0" tone="blue" icon={<I.trendUp w={22} />} delta="12.4%" deltaDir="up" />
        <StatCard label="Total Sold (kg)" value="0" icon={<I.sales w={22} />} delta="8.2%" deltaDir="up" caption="this month" />
        <StatCard label="Avg. Price/kg" value="₱0" tone="amber" icon={<I.wallet w={22} />} delta="2.1%" deltaDir="up" />
        <StatCard label="Pending Deliveries" value="0" tone="red" icon={<I.alertTri w={22} />} caption="orders" />
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
