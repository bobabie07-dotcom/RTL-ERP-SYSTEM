import React from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { LineChart } from '../charts';
import Icons from '../icons';

const I = Icons;

const RECORDS = [
  { date: 'May 12, 2025', batch: 'BATCH-2025-08', house: 'House A-1', count: 12, cause: 'Heat Stress', notes: 'Ventilation issue resolved', recordedBy: 'J. Cruz', severity: 'warning' },
  { date: 'May 12, 2025', batch: 'BATCH-2025-07', house: 'House B-2', count: 8, cause: 'Disease', notes: 'Newcastle suspected — vet notified', recordedBy: 'M. Reyes', severity: 'danger' },
  { date: 'May 11, 2025', batch: 'BATCH-2025-06', house: 'House C-1', count: 6, cause: 'Normal Culling', notes: 'Underweight birds culled', recordedBy: 'M. Santos', severity: 'neutral' },
  { date: 'May 11, 2025', batch: 'BATCH-2025-05', house: 'House A-2', count: 4, cause: 'Normal Culling', notes: '', recordedBy: 'J. Cruz', severity: 'neutral' },
  { date: 'May 10, 2025', batch: 'BATCH-2025-08', house: 'House A-1', count: 9, cause: 'Heat Stress', notes: 'High temp recorded: 34°C', recordedBy: 'M. Santos', severity: 'warning' },
  { date: 'May 09, 2025', batch: 'BATCH-2025-04', house: 'House B-1', count: 5, cause: 'Injury', notes: 'Piling behavior observed', recordedBy: 'M. Reyes', severity: 'warning' },
  { date: 'May 08, 2025', batch: 'BATCH-2025-07', house: 'House B-2', count: 11, cause: 'Disease', notes: 'Respiratory signs, meds started', recordedBy: 'J. Cruz', severity: 'danger' },
  { date: 'May 07, 2025', batch: 'BATCH-2025-06', house: 'House C-1', count: 3, cause: 'Normal Culling', notes: '', recordedBy: 'M. Santos', severity: 'neutral' },
];

const causeColor = { 'Heat Stress': 'warning', 'Disease': 'danger', 'Normal Culling': 'neutral', 'Injury': 'warning' };

export default function MortalityPage() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Mortality Tracker</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Monitor and analyze flock mortality across all batches.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />}>Add Record</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Mortality (7d)" value="58" tone="red" icon={<I.mortality w={22} />} delta="12" deltaDir="up" deltaGood={false} caption="vs last 7 days" />
        <StatCard label="Avg. Mortality Rate" value="4.21%" tone="red" icon={<I.percent w={22} />} delta="0.6%" deltaDir="down" deltaGood caption="vs last month" />
        <StatCard label="Active Batches" value="5" icon={<I.birds w={22} />} caption="being monitored" />
        <StatCard label="High Alerts" value="2" tone="amber" icon={<I.alertTri w={22} />} caption="batches flagged" />
      </div>

      <Card title="Mortality Trend (%) — Last 7 Days" action={<Select options={['Last 7 days', 'Last 30 days', 'This month']} />}>
        <LineChart data={[5.1, 4.8, 4.9, 4.4, 4.3, 4.5, 4.21]} color="var(--viz-mortality)" labels={['Mon','Tue','Wed','Thu','Fri','Sat','Sun']} />
      </Card>

      <Card title="Mortality Records" action={<Select options={['All Batches', 'BATCH-2025-08', 'BATCH-2025-07']} />}>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', strong: true },
            { key: 'batch', header: 'Batch' },
            { key: 'house', header: 'House' },
            { key: 'count', header: 'Count', align: 'right', numeric: true },
            { key: 'cause', header: 'Cause', render: (r) => <Badge tone={causeColor[r.cause] || 'neutral'}>{r.cause}</Badge> },
            { key: 'notes', header: 'Notes' },
            { key: 'recordedBy', header: 'Recorded By' },
          ]}
          rows={RECORDS}
          rowKey="date"
        />
      </Card>
    </div>
  );
}
