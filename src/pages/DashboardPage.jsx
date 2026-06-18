import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/data/StatCard';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { LineChart, DonutChart, BarChart } from '../charts';
import Icons from '../icons';

const I = Icons;

export default function DashboardPage() {
  const navigate = useNavigate();

  const expense = [];
  const batches = [];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Welcome back, Admin!</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Here's what's happening on your farms today.</p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Birds" value="0" icon={<I.birds w={22} />} />
        <StatCard label="Mortality Rate" value="0%" tone="red" icon={<I.mortality w={22} />} />
        <StatCard label="Feed Consumed (kg)" value="0" tone="amber" icon={<I.feed w={22} />} />
        <StatCard label="Revenue (₱)" value="₱0" tone="blue" icon={<I.trendUp w={22} />} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Mortality Trend (%)" action={<Select options={['Last 7 days', 'Last 30 days']} />}>
          <LineChart data={[0, 0, 0, 0, 0, 0, 0]} color="var(--viz-mortality)" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} />
        </Card>
        <Card title="Expense Breakdown">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <DonutChart segments={expense} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-strong)' }}>₱0</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>this month</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
              {expense.map((e) => (
                <div key={e.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: e.color, flex: '0 0 auto' }} />
                  <span style={{ color: 'var(--text-body)', flex: 1 }}>{e.label}</span>
                  <span style={{ color: 'var(--text-strong)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{e.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Feed consumption bars */}
      <Card title="Feed Consumption by House (kg)" action={<Select options={['This week']} />}>
        <BarChart data={[]} labels={[]} />
      </Card>

      {/* Active batches table */}
      <Card
        title="Active Batches"
        action={
          <Button variant="secondary" size="sm" icon={<I.chevronRight w={15} />} onClick={() => navigate('/batches')}>
            View All Batches
          </Button>
        }
      >
        <DataTable
          columns={[
            { key: 'batch', header: 'Batch No.', strong: true, render: (r) => (
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); navigate('/batches/' + r.batch); }}
                style={{ fontWeight: 600 }}
              >{r.batch}</a>
            ) },
            { key: 'house', header: 'House' },
            { key: 'birds', header: 'Birds', align: 'right', numeric: true },
            { key: 'age', header: 'Age', align: 'right' },
            { key: 'mort', header: 'Mortality %', align: 'right', numeric: true },
            { key: 'fcr', header: 'FCR', align: 'right', numeric: true },
            { key: 'status', header: 'Status', render: (r) => (
              <Badge tone={r.status === 'Harvest Soon' ? 'warning' : 'success'} dot>{r.status}</Badge>
            ) },
          ]}
          rows={batches}
          rowKey="batch"
        />
      </Card>
    </div>
  );
}
