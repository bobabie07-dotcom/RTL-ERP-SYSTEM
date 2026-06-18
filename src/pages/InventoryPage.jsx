import React, { useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import Icons from '../icons';

const I = Icons;

const ITEMS = [];

const statusTone = { 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'danger' };

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All Categories');

  const filtered = ITEMS.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'All Categories' || i.category === catFilter;
    return matchSearch && matchCat;
  });

  const lowStock = ITEMS.filter(i => i.status === 'Low Stock').length;
  const outOfStock = ITEMS.filter(i => i.status === 'Out of Stock').length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Inventory</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage feeds, medicines, and farm supplies.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />}>Add Item</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Items" value={"0"} icon={<I.box w={22} />} caption="in inventory" />
        <StatCard label="In Stock" value={"0"} icon={<I.check w={22} />} caption="items available" />
        <StatCard label="Low Stock Alerts" value={"0"} tone="amber" icon={<I.alertTri w={22} />} caption="items" />
        <StatCard label="Out of Stock" value={"0"} tone="red" icon={<I.trash w={22} />} caption="items" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Input placeholder="Search items..." icon={<I.search />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select options={['All Categories', 'Feed', 'Medicine', 'Supplies', 'Equipment']} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} />
          <Select options={['All Status', 'In Stock', 'Low Stock', 'Out of Stock']} />
        </div>
        <DataTable
          columns={[
            { key: 'name', header: 'Item Name', strong: true },
            { key: 'category', header: 'Category' },
            { key: 'qty', header: 'Quantity', align: 'right', numeric: true },
            { key: 'unit', header: 'Unit' },
            { key: 'reorder', header: 'Reorder Level', align: 'right', numeric: true },
            { key: 'lastUpdated', header: 'Last Updated' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] || 'neutral'} dot>{r.status}</Badge> },
            { key: 'actions', header: '', render: () => (
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}><I.pencil w={14} /></button>
                <button style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4, borderRadius: 6 }}><I.trash w={14} /></button>
              </div>
            ) },
          ]}
          rows={filtered}
          rowKey="id"
        />
      </Card>
    </div>
  );
}
