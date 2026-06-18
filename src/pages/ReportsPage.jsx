import React from 'react';
import { Card } from '../components/data/Card';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import Icons from '../icons';

const I = Icons;

const reportCards = [
  {
    id: 'monthly',
    title: 'Monthly Summary',
    description: 'Overview of all farm operations, KPIs, and performance metrics for the selected month.',
    icon: 'reports',
    color: 'var(--info)',
    bg: 'var(--info-bg)',
  },
  {
    id: 'batch',
    title: 'Batch Performance',
    description: 'Detailed analysis of batch productivity including FCR, mortality rate, and weight gain curves.',
    icon: 'batch',
    color: 'var(--green-500)',
    bg: 'var(--green-50)',
  },
  {
    id: 'feed',
    title: 'Feed Efficiency Report',
    description: 'Feed consumption trends, conversion ratios, and cost analysis across all batches.',
    icon: 'feed',
    color: 'var(--warning)',
    bg: 'var(--warning-bg)',
  },
  {
    id: 'mortality',
    title: 'Mortality Analysis',
    description: 'Mortality trends, causes breakdown, and benchmarking against industry standards.',
    icon: 'mortality',
    color: 'var(--danger)',
    bg: 'var(--danger-bg)',
  },
  {
    id: 'financial',
    title: 'Financial Summary',
    description: 'Revenue, cost of production, gross margin, and profitability per batch and per farm.',
    icon: 'wallet',
    color: 'var(--viz-utilities)',
    bg: '#F1ECFD',
  },
  {
    id: 'inventory',
    title: 'Inventory Report',
    description: 'Current stock levels, consumption rates, and reorder recommendations for all items.',
    icon: 'inventory',
    color: 'var(--viz-labor)',
    bg: 'var(--info-bg)',
  },
];

export default function ReportsPage() {
  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Reports & Analytics</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Generate and download detailed reports for your farm operations.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {reportCards.map((rc) => {
          const Glyph = I[rc.icon];
          return (
            <Card key={rc.id} style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                  <span style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: rc.bg, color: rc.color,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flex: '0 0 auto',
                  }}>
                    {Glyph && <Glyph w={22} />}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>{rc.title}</h3>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 16px', lineHeight: 1.6 }}>{rc.description}</p>
                <Select
                  label="Date Range"
                  options={['This month', 'Last month', 'Last 3 months', 'Last 6 months', 'This year']}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <Button variant="primary" size="sm" fullWidth>Generate Report</Button>
                  <Button variant="secondary" size="sm" icon={<I.download w={14} />}>Download</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
