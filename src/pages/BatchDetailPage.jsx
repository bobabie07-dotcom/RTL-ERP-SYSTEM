import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StatCard } from '../components/data/StatCard';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { ProgressRing } from '../components/data/ProgressRing';
import { LineChart } from '../charts';
import { getBatch } from '../data/batches';
import Icons from '../icons';

const I = Icons;

const HEALTH_LOGS = {
  'BATCH-2025-08': [
    { date: 'May 12', type: 'Vaccination', detail: 'Newcastle Disease (B1)', by: 'Dr. Santos', status: 'Done' },
    { date: 'May 09', type: 'Medication', detail: 'Vitamin supplement in water', by: 'J. Cruz', status: 'Done' },
    { date: 'May 05', type: 'Weighing', detail: 'Avg. weight 1.18 kg', by: 'M. Reyes', status: 'Done' },
    { date: 'May 14', type: 'Vaccination', detail: 'Infectious Bronchitis', by: 'Scheduled', status: 'Upcoming' },
  ],
  'BATCH-2025-07': [
    { date: 'May 11', type: 'Medication', detail: 'Respiratory treatment started', by: 'Dr. Santos', status: 'Done' },
    { date: 'May 08', type: 'Weighing', detail: 'Avg. weight 1.54 kg', by: 'M. Reyes', status: 'Done' },
    { date: 'May 06', type: 'Vaccination', detail: 'Newcastle Disease (B1)', by: 'Dr. Santos', status: 'Done' },
    { date: 'May 15', type: 'Vaccination', detail: 'Gumboro Disease', by: 'Scheduled', status: 'Upcoming' },
  ],
  'BATCH-2025-06': [
    { date: 'May 10', type: 'Weighing', detail: 'Avg. weight 2.05 kg', by: 'J. Cruz', status: 'Done' },
    { date: 'May 07', type: 'Vaccination', detail: 'Infectious Bronchitis', by: 'Dr. Santos', status: 'Done' },
    { date: 'May 03', type: 'Medication', detail: 'Vitamin E + Selenium', by: 'M. Santos', status: 'Done' },
  ],
};

const DEFAULT_LOG = [
  { date: 'May 12', type: 'Vaccination', detail: 'Newcastle Disease (B1)', by: 'Dr. Santos', status: 'Done' },
  { date: 'May 09', type: 'Medication', detail: 'Vitamin supplement in water', by: 'J. Cruz', status: 'Done' },
  { date: 'May 14', type: 'Vaccination', detail: 'Infectious Bronchitis', by: 'Scheduled', status: 'Upcoming' },
];

const typeColor = { Vaccination: 'info', Medication: 'warning', Weighing: 'neutral' };
const statusTone = { Done: 'success', Upcoming: 'neutral' };

export default function BatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const batch = getBatch(id);
  const logs = HEALTH_LOGS[batch.id] || DEFAULT_LOG;
  const progress = Math.round((batch.dayOfCycle / batch.cycleLength) * 100);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button variant="ghost" size="sm" icon={<I.chevronRight w={15} style={{ transform: 'rotate(180deg)' }} />} onClick={() => navigate('/batches')}>Back</Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>{batch.id}</h2>
              <Badge tone={batch.status === 'Harvest Soon' ? 'warning' : batch.status === 'Harvested' ? 'neutral' : 'success'} dot>{batch.status}</Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{batch.house} · {batch.farm} · started {batch.placed}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" icon={<I.syringe w={16} />}>Add Record</Button>
          {batch.status !== 'Harvested' && <Button variant="primary" size="md" icon={<I.harvest w={16} />}>Mark Harvest</Button>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Current Birds" value={batch.birds} icon={<I.birds w={22} />} delta="430 lost" deltaDir="down" deltaGood={false} caption="since placement" />
        <StatCard label="Avg. Weight (kg)" value={batch.avgWt === '—' ? 'N/A' : batch.avgWt.replace(' kg', '')} tone="blue" icon={<I.scale w={22} />} delta="0.08" deltaDir="up" caption="vs last week" />
        <StatCard label="FCR" value={batch.fcr} tone="amber" icon={<I.feed w={22} />} delta="0.03" deltaDir="down" deltaGood caption="vs target" />
        <StatCard label="Survival Rate" value={batch.survivalRate} icon={<I.percent w={22} />} delta="0.4%" deltaDir="up" caption="vs last week" />
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Average Weight Gain (kg)">
          <LineChart data={[0.05, 0.18, 0.34, 0.55, 0.82, 1.12, parseFloat(batch.avgWt) || 1.42]} color="var(--info)" labels={['W1','W2','W3','W4','W5','W6','W7']} />
        </Card>
        <Card title="Batch Progress" bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 24px' }}>
          <ProgressRing value={progress} label={`of ${batch.cycleLength}-day cycle`} size={120} />
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            Day <b style={{ color: 'var(--text-strong)' }}>{batch.dayOfCycle}</b> of {batch.cycleLength} · est. harvest <b style={{ color: 'var(--text-strong)' }}>{batch.estHarvest}</b>
          </div>
        </Card>
      </div>

      {/* Health log */}
      <Card title="Health & Activity Log" action={<Button variant="secondary" size="sm" icon={<I.plus w={15} />}>Add Record</Button>}>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', strong: true },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={typeColor[r.type] || 'neutral'}>{r.type}</Badge> },
            { key: 'detail', header: 'Detail' },
            { key: 'by', header: 'Recorded By' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone[r.status] || 'neutral'} dot>{r.status}</Badge> },
          ]}
          rows={logs}
          rowKey="date"
        />
      </Card>
    </div>
  );
}
