import React from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { BarChart } from '../charts';
import Icons from '../icons';

const I = Icons;

const FEED_LOGS = [];

export default function FeedPage() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Feed Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Monitor feed consumption, FCR, and stock levels.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />}>Issue Feed</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Feed Stock (kg)" value="0" icon={<I.feed w={22} />} delta="3 tons" deltaDir="down" deltaGood={false} caption="used this week" />
        <StatCard label="Today's Consumption (kg)" value="0" tone="amber" icon={<I.box w={22} />} delta="4.2%" deltaDir="up" deltaGood={false} />
        <StatCard label="Average FCR" value="0" tone="blue" icon={<I.scale w={22} />} delta="0.02" deltaDir="down" deltaGood caption="vs target 1.70" />
        <StatCard label="Low Stock Alerts" value="0" tone="red" icon={<I.alertTri w={22} />} caption="feed types" />
      </div>

      <Card title="Feed Consumption by House (kg)" action={<Select options={['This week', 'Last week', 'This month']} />}>
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

      <Card title="Feed Issue Log" action={<Select options={['All Batches', 'BATCH-2025-08', 'BATCH-2025-07', 'BATCH-2025-06']} />}>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', strong: true },
            { key: 'batch', header: 'Batch' },
            { key: 'house', header: 'House' },
            { key: 'feedType', header: 'Feed Type' },
            { key: 'qty', header: 'Qty (kg)', align: 'right', numeric: true },
            { key: 'fcr', header: 'FCR', align: 'right', numeric: true },
            { key: 'recordedBy', header: 'Recorded By' },
          ]}
          rows={FEED_LOGS}
          rowKey="date"
        />
      </Card>
    </div>
  );
}
