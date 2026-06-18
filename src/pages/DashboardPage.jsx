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

  const expense = [
    { label: 'Feed', value: 58, color: 'var(--viz-feed)' },
    { label: 'Labor', value: 18, color: 'var(--viz-labor)' },
    { label: 'Medicine', value: 11, color: 'var(--viz-medicine)' },
    { label: 'Utilities', value: 8, color: 'var(--viz-utilities)' },
    { label: 'Others', value: 5, color: 'var(--viz-others)' },
  ];

  const batches = [
    { batch: 'BATCH-2025-08', house: 'House A-1', birds: '12,400', age: '28 days', mort: '3.45%', fcr: '1.62', status: 'Active' },
    { batch: 'BATCH-2025-07', house: 'House B-2', birds: '11,850', age: '34 days', mort: '4.12%', fcr: '1.65', status: 'Active' },
    { batch: 'BATCH-2025-06', house: 'House C-1', birds: '10,200', age: '41 days', mort: '4.28%', fcr: '1.70', status: 'Harvest Soon' },
    { batch: 'BATCH-2025-05', house: 'House A-2', birds: '13,800', age: '19 days', mort: '2.91%', fcr: '1.58', status: 'Active' },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Welcome back, Admin!</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Here's what's happening on your farms today.</p>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Birds" value="48,250" icon={<I.birds w={22} />} delta="5.6%" deltaDir="up" />
        <StatCard label="Mortality Rate" value="4.21%" tone="red" icon={<I.mortality w={22} />} delta="0.6%" deltaDir="down" deltaGood />
        <StatCard label="Feed Consumed (kg)" value="9,840" tone="amber" icon={<I.feed w={22} />} delta="3.2%" deltaDir="up" deltaGood={false} />
        <StatCard label="Revenue (₱)" value="₱6.78M" tone="blue" icon={<I.trendUp w={22} />} delta="12.4%" deltaDir="up" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Mortality Trend (%)" action={<Select options={['Last 7 days', 'Last 30 days']} />}>
          <LineChart data={[5.1, 4.8, 4.9, 4.4, 4.3, 4.5, 4.21]} color="var(--viz-mortality)" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} />
        </Card>
        <Card title="Expense Breakdown">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', flex: '0 0 auto' }}>
              <DonutChart segments={expense} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-strong)' }}>₱2.4M</span>
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
        <BarChart
          data={[
            { value: 1840, label2: '1,840', color: 'var(--viz-feed)' },
            { value: 1620, label2: '1,620', color: 'var(--viz-feed)' },
            { value: 1390, label2: '1,390', color: 'var(--viz-feed)' },
            { value: 2010, label2: '2,010', color: 'var(--green-400)' },
            { value: 1280, label2: '1,280', color: 'var(--viz-feed)' },
            { value: 1700, label2: '1,700', color: 'var(--viz-feed)' },
          ]}
          labels={['House A-1', 'House B-2', 'House C-1', 'House A-2', 'House B-1', 'House C-2']}
        />
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
