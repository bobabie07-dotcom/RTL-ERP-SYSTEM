/* RTL Poultry Farming ERP — Batch Detail screen content (inside AppShell). */
const { StatCard, Card, DataTable, Badge, Button, ProgressRing } = window.RTLPoultryFarmingERPDesignSystem_698a73;

function BatchDetailScreen({ batch, onBack }) {
  const I = window.RTLIcons;
  const { LineChart } = window.RTLCharts;
  const b = batch || { batch: 'BATCH-2025-08', house: 'House A-1', birds: '12,400' };

  const events = [
    { date: 'May 12', type: 'Vaccination', detail: 'Newcastle Disease (B1)', by: 'Dr. Santos', status: 'Done' },
    { date: 'May 09', type: 'Medication', detail: 'Vitamin supplement in water', by: 'J. Cruz', status: 'Done' },
    { date: 'May 05', type: 'Weighing', detail: 'Avg. weight 1.18 kg', by: 'M. Reyes', status: 'Done' },
    { date: 'May 14', type: 'Vaccination', detail: 'Infectious Bronchitis', by: 'Scheduled', status: 'Upcoming' },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button variant="ghost" size="sm" icon={<I.chevronRight w={15} style={{ transform: 'rotate(180deg)' }} />} onClick={onBack}>Back</Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>{b.batch}</h2>
              <Badge tone="success" dot>Active</Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>{b.house} · RTL Main Farm · started Apr 14, 2025</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" icon={<I.syringe w={16} />}>Add Record</Button>
          <Button variant="primary" size="md" icon={<I.harvest w={16} />}>Mark Harvest</Button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Current Birds" value={b.birds || '12,400'} icon={<I.birds w={22} />} delta="430 lost" deltaDir="down" deltaGood={false} caption="since placement" />
        <StatCard label="Avg. Weight (kg)" value="1.42" tone="blue" icon={<I.scale w={22} />} delta="0.08" deltaDir="up" caption="vs last week" />
        <StatCard label="FCR" value="1.62" tone="amber" icon={<I.feed w={22} />} delta="0.03" deltaDir="down" deltaGood caption="vs target" />
        <StatCard label="Survival Rate" value="96.5%" icon={<I.percent w={22} />} delta="0.4%" deltaDir="up" caption="vs last week" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Average Weight Gain (kg)">
          <LineChart data={[0.05, 0.18, 0.34, 0.55, 0.82, 1.12, 1.42]} color="var(--info)" labels={['W1','W2','W3','W4','W5','W6','W7']} />
        </Card>
        <Card title="Batch Progress" bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 24px' }}>
          <ProgressRing value={61} label="of 45-day cycle" size={120} />
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>Day <b style={{ color: 'var(--text-strong)' }}>28</b> of 45 · est. harvest <b style={{ color: 'var(--text-strong)' }}>Jun 1</b></div>
        </Card>
      </div>

      <Card title="Health & Activity Log" action={<Button variant="secondary" size="sm" icon={<I.plus w={15} />}>Add Record</Button>}>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', strong: true },
            { key: 'type', header: 'Type', render: (r) => <Badge tone={r.type === 'Vaccination' ? 'info' : r.type === 'Medication' ? 'warning' : 'neutral'}>{r.type}</Badge> },
            { key: 'detail', header: 'Detail' },
            { key: 'by', header: 'Recorded By' },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Done' ? 'success' : 'neutral'} dot>{r.status}</Badge> },
          ]}
          rows={events}
          rowKey="date"
        />
      </Card>
    </div>
  );
}

window.BatchDetailScreen = BatchDetailScreen;
