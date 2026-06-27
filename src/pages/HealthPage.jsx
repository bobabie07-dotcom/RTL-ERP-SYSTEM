import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { DataTable } from '../components/data/DataTable';
import { healthApi, batchesApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE  = { scheduled: 'info', completed: 'success', missed: 'danger', skipped: 'neutral' };
const STATUS_LABEL = { scheduled: 'Scheduled', completed: 'Done', missed: 'Missed', skipped: 'Skipped' };
const ROUTE_LABEL  = { water: 'Water', injection: 'Injection', spray: 'Spray', eye_drop: 'Eye Drop', oral: 'Oral' };

export default function HealthPage() {
  const { farmId } = useFarm();
  const navigate   = useNavigate();

  const [upcoming,    setUpcoming]    = useState([]);
  const [vaccinations, setVaccinations] = useState([]);
  const [batches,     setBatches]     = useState([]);
  const [medications, setMedications] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('upcoming');

  useEffect(() => {
    if (!farmId) return;
    setLoading(true);
    Promise.all([
      healthApi.upcomingVaccinations(farmId).catch(() => []),
      healthApi.vaccinations({}).catch(() => []),
      batchesApi.list({ farm_id: farmId }).catch(() => []),
      healthApi.medications().catch(() => []),
    ]).then(([up, vacc, batc, meds]) => {
      setUpcoming(up || []);
      setVaccinations(vacc || []);
      setBatches(batc || []);
      setMedications(meds || []);
    }).finally(() => setLoading(false));
  }, [farmId]);

  const batchById = Object.fromEntries(batches.map(b => [b.id, b]));
  const medById   = Object.fromEntries(medications.map(m => [m.id, m]));

  const tabs = [
    { key: 'upcoming',      label: 'Upcoming Vaccinations' },
    { key: 'all',           label: 'All Vaccinations' },
  ];

  const upcomingDue   = upcoming.filter(r => r.days_until <= 3);
  const upcomingWeek  = upcoming.filter(r => r.days_until > 3 && r.days_until <= 7);
  const upcomingRest  = upcoming.filter(r => r.days_until > 7);

  const allVaccRows = vaccinations.map(v => {
    const batch = batchById[v.batch_id];
    const med   = medById[v.vaccine_id];
    return {
      ...v,
      batch_no:  batch?.batch_no || `Batch #${v.batch_id}`,
      vaccine:   med?.name || `Med #${v.vaccine_id}`,
    };
  }).sort((a, b) => new Date(b.scheduled_date) - new Date(a.scheduled_date));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Animal Health</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Vaccination schedules and health events across all batches.
        </p>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {[
          { label: 'Due Today / Tomorrow', value: upcomingDue.length,  tone: upcomingDue.length > 0 ? 'var(--danger)' : 'var(--success)' },
          { label: 'Due This Week',        value: upcomingWeek.length, tone: upcomingWeek.length > 0 ? 'var(--warning)' : 'var(--success)' },
          { label: 'Upcoming (7d+)',       value: upcomingRest.length, tone: 'var(--text-secondary)' },
          { label: 'Total Vaccinations',   value: vaccinations.length, tone: 'var(--text-strong)' },
        ].map(c => (
          <div key={c.label} style={{ padding: '14px 16px', background: 'var(--surface-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: c.tone }}>{loading ? '—' : c.value}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 16 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
              color: activeTab === t.key ? 'var(--text-brand)' : 'var(--text-secondary)',
              borderBottom: activeTab === t.key ? '2px solid var(--text-brand)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 120ms',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading health data…</div>
        ) : activeTab === 'upcoming' ? (
          upcoming.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No upcoming vaccinations scheduled.
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'batch_no', header: 'Batch', render: r => {
                  const batch = batches.find(b => b.batch_no === r.batch_no);
                  return batch
                    ? <span onClick={() => navigate(`/batches/${batch.id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>{r.batch_no}</span>
                    : r.batch_no;
                }},
                { key: 'house',          header: 'House' },
                { key: 'vaccine',        header: 'Vaccine',    strong: true },
                { key: 'route',          header: 'Route',      render: r => ROUTE_LABEL[r.route] || r.route },
                { key: 'scheduled_date', header: 'Scheduled' },
                { key: 'days_until',     header: 'Days Away',  align: 'right', render: r => (
                  <Badge tone={r.days_until <= 0 ? 'danger' : r.days_until <= 3 ? 'warning' : 'info'} dot>
                    {r.days_until <= 0 ? 'Overdue' : `${r.days_until}d`}
                  </Badge>
                )},
              ]}
              rows={upcoming}
              rowKey="id"
            />
          )
        ) : (
          allVaccRows.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No vaccination records found for this farm.
            </div>
          ) : (
            <DataTable
              columns={[
                { key: 'batch_no', header: 'Batch', render: r => {
                  const batch = batches.find(b => b.batch_no === r.batch_no);
                  return batch
                    ? <span onClick={() => navigate(`/batches/${batch.id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>{r.batch_no}</span>
                    : r.batch_no;
                }},
                { key: 'vaccine',        header: 'Vaccine',   strong: true },
                { key: 'route',          header: 'Route',     render: r => ROUTE_LABEL[r.route] || r.route },
                { key: 'scheduled_date', header: 'Scheduled' },
                { key: 'completed_date', header: 'Completed', render: r => r.completed_date || '—' },
                { key: 'dose_per_bird',  header: 'Dose',      render: r => r.dose_per_bird || '—' },
                { key: 'status',         header: 'Status',    render: r => (
                  <Badge tone={STATUS_TONE[r.status] || 'neutral'}>{STATUS_LABEL[r.status] || r.status}</Badge>
                )},
              ]}
              rows={allVaccRows}
              rowKey="id"
            />
          )
        )}
      </Card>

      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
        To manage vaccinations in detail, open a specific batch from{' '}
        <span onClick={() => navigate('/batches')} style={{ color: 'var(--text-brand)', cursor: 'pointer', textDecoration: 'underline' }}>Batch Management</span>.
      </div>
    </div>
  );
}
