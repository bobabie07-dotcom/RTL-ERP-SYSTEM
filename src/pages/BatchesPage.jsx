import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { BATCHES } from '../data/batches';
import Icons from '../icons';

const I = Icons;

const statusTone = { Active: 'success', 'Harvest Soon': 'warning', Harvested: 'neutral' };

export default function BatchesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');

  const filtered = BATCHES.filter((b) => {
    const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) || b.house.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'All Status' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Batch Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Track and manage all poultry batches across farms.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />}>Add Batch</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Batches" value="8" icon={<I.batch w={22} />} delta="2 new" deltaDir="up" caption="this month" />
        <StatCard label="Active Batches" value="5" icon={<I.birds w={22} />} delta="1" deltaDir="up" caption="vs last month" />
        <StatCard label="Harvest Soon" value="1" tone="warning" icon={<I.harvest w={22} />} caption="within 7 days" />
        <StatCard label="Total Birds" value="48,250" tone="blue" icon={<I.population w={22} />} delta="5.6%" deltaDir="up" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Input placeholder="Search batch or house..." icon={<I.search />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select options={['All Status', 'Active', 'Harvest Soon', 'Harvested']} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          <Select options={['All Farms', 'RTL Main Farm', 'RTL North Farm']} />
        </div>
        <DataTable
          columns={[
            { key: 'id', header: 'Batch No.', strong: true, render: (r) => (
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/batches/' + r.id); }} style={{ fontWeight: 600, color: 'var(--text-brand)' }}>{r.id}</a>
            ) },
            { key: 'house', header: 'House' },
            { key: 'farm', header: 'Farm' },
            { key: 'breed', header: 'Breed' },
            { key: 'placed', header: 'Date Placed' },
            { key: 'birds', header: 'Birds', align: 'right', numeric: true },
            { key: 'age', header: 'Age', align: 'right' },
            { key: 'mort', header: 'Mortality %', align: 'right', numeric: true },
            { key: 'fcr', header: 'FCR', align: 'right', numeric: true },
            { key: 'avgWt', header: 'Avg. Weight', align: 'right' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] || 'neutral'} dot>{r.status}</Badge> },
          ]}
          rows={filtered}
          rowKey="id"
        />
      </Card>
    </div>
  );
}
