import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/data/StatCard';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { LineChart, DonutChart, BarChart } from '../charts';
import { batchesApi, dashboardApi, feedApi, salesApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { getBatchAgeStatus } from '../utils/mortality';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

const STATUS_LABEL = { active: 'Active', harvest_soon: 'Harvest Soon', harvested: 'Harvested', terminated: 'Terminated' };
const STATUS_TONE  = { active: 'success', harvest_soon: 'warning', harvested: 'neutral', terminated: 'danger' };

const EXPENSE_COLORS = ['var(--viz-feed)', 'var(--viz-labor)', 'var(--info)', 'var(--warning)', 'var(--viz-utilities)', 'var(--danger)'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { farmId, farms } = useFarm();

  const selectedFarm = farms.find(f => f.id === farmId);
  const isLayer      = selectedFarm?.farm_type === 'layer';

  const [kpi,      setKpi]      = useState(null);
  const [batches,  setBatches]  = useState([]);
  const [weekly,   setWeekly]   = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    setLoading(true);
    const kpiCall = isLayer ? dashboardApi.layerKpis(farmId) : dashboardApi.kpis(farmId);
    Promise.all([
      kpiCall,
      batchesApi.list({ farm_id: farmId, status: 'active' }),
      feedApi.weekly(farmId),
      salesApi.expenses({ farm_id: farmId }),
      salesApi.summary(farmId),
    ]).then(([k, b, w, exp, sum]) => {
      setKpi(k);
      setBatches(b);
      setWeekly(w);

      // Group expenses by category for donut chart
      const grouped = {};
      (exp || []).forEach((e) => {
        grouped[e.category] = (grouped[e.category] || 0) + parseFloat(e.amount);
      });
      const total = Object.values(grouped).reduce((a, b) => a + b, 0) || 1;
      setExpenses(
        Object.entries(grouped).map(([label, val], i) => ({
          label: label.charAt(0).toUpperCase() + label.slice(1),
          value: Math.round((val / total) * 100),
          color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
        }))
      );
      setSummary(sum);
    }).catch(e => setLoadError(e.message || 'Failed to load dashboard data.')).finally(() => setLoading(false));
  }, [farmId]);

  const tableRows = batches.map((b) => {
    const ageStatus = getBatchAgeStatus(b.age_days, b.cycle_length_days);
    return {
      batch:  b.batch_no,
      id:     b.id,
      house:  b.house,
      birds:  (b.current_count || 0).toLocaleString(),
      age:    ageStatus.isUpcoming ? ageStatus.label : `Day ${b.age_days}`,
      mort:   ageStatus.isUpcoming ? '—' : `${(b.mortality_pct || 0).toFixed(2)}%`,
      fcr:    b.fcr > 0 ? (b.fcr).toFixed(2) : '—',
      status: STATUS_LABEL[b.status] || b.status,
    };
  });

  const barData   = weekly.map((w) => ({ value: w.total_kg ?? 0, label2: (w.total_kg ?? 0).toLocaleString(), color: 'var(--viz-feed)' }));
  const barLabels = weekly.map((w) => w.house);

  const totalExpenses = expenses.reduce((s, e) => s + e.value, 0);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}
      <PrintPageHeader title="Dashboard" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Welcome back!</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Here's what's happening on your farms today.</p>
        </div>
        <PrintButton title="Dashboard" />
      </div>

      {isLayer ? (
        <>
          {/* ── Layer: Row 1 — Birds ── */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <StatCard label="Active Birds"       value={loading ? '—' : (kpi?.total_live_birds || 0).toLocaleString()} icon={<I.birds w={22} />} />
            <StatCard label="Initial Birds"      value={loading ? '—' : (kpi?.initial_birds || 0).toLocaleString()} icon={<I.population w={22} />} caption="placed" />
            <StatCard label="Livability %"       value={loading ? '—' : `${(kpi?.livability_pct || 0).toFixed(2)}%`} tone="green" icon={<I.percent w={22} />} />
            <StatCard label="Mortality %"        value={loading ? '—' : `${(kpi?.mortality_pct || 0).toFixed(2)}%`} tone="red" icon={<I.mortality w={22} />} caption={`${(kpi?.mortality_count || 0).toLocaleString()} birds`} />
            <StatCard label="Culling %"          value={loading ? '—' : `${(kpi?.culling_pct || 0).toFixed(2)}%`} tone="amber" icon={<I.harvest w={22} />} caption={`${(kpi?.culling_count || 0).toLocaleString()} birds`} />
          </div>

          {/* ── Layer: Row 2 — Today's Production ── */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <StatCard label="Today's Eggs"       value={loading ? '—' : (kpi?.today_eggs || 0).toLocaleString()} icon={<I.percent w={22} />} />
            <StatCard label="Saleable Eggs"      value={loading ? '—' : (kpi?.today_saleable || 0).toLocaleString()} tone="green" icon={<I.box w={22} />} />
            <StatCard label="Today's Trays"      value={loading ? '—' : (kpi?.today_trays || 0).toLocaleString()} icon={<I.inventory w={22} />} caption="÷ 30 eggs" />
            <StatCard label="Hen-Day %"          value={loading ? '—' : `${(kpi?.hen_day_pct || 0).toFixed(2)}%`} tone="blue" icon={<I.trendUp w={22} />} caption="today" />
            <StatCard label="Hen-Housed %"       value={loading ? '—' : `${(kpi?.hen_housed_pct || 0).toFixed(2)}%`} tone="blue" icon={<I.trendUp w={22} />} caption="vs initial" />
          </div>

          {/* ── Layer: Row 3 — Feed / Water / Quality ── */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <StatCard label="Feed Consumed"      value={loading ? '—' : kpi?.feed_consumed_kg != null ? `${kpi.feed_consumed_kg.toFixed(1)} kg` : 'N/A'} icon={<I.feed w={22} />} caption="today" />
            <StatCard label="Feed / Bird"        value={loading ? '—' : kpi?.feed_per_bird != null ? `${kpi.feed_per_bird.toFixed(3)} kg` : 'N/A'} icon={<I.feed w={22} />} />
            <StatCard label="Water Consumed"     value={loading ? '—' : kpi?.water_consumed_l != null ? `${kpi.water_consumed_l.toFixed(0)} L` : 'N/A'} icon={<I.scale w={22} />} caption="today" />
            <StatCard label="Water / Bird"       value={loading ? '—' : kpi?.water_per_bird != null ? `${kpi.water_per_bird.toFixed(3)} L` : 'N/A'} icon={<I.scale w={22} />} />
            <StatCard label="Defect Rate (7d)"   value={loading ? '—' : `${(kpi?.defect_rate || 0).toFixed(2)}%`} tone={kpi?.defect_rate > 3 ? 'red' : 'green'} icon={<I.alertTri w={22} />} />
          </div>

          {/* ── Layer: Row 4 — Inventory / Sales / Trends ── */}
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <StatCard label="Egg Inventory"      value={loading ? '—' : (kpi?.total_egg_inventory || 0).toLocaleString()} icon={<I.inventory w={22} />} caption="eggs in stock" />
            <StatCard label="Month Revenue"      value={loading ? '—' : `₱${(kpi?.month_sales_amount || 0).toLocaleString()}`} tone="blue" icon={<I.trendUp w={22} />} />
            <StatCard label="Today's Sales"      value={loading ? '—' : `₱${(kpi?.today_sales_revenue || 0).toLocaleString()}`} tone="blue" icon={<I.sales w={22} />} />
            <StatCard label="7d Avg Production"  value={loading ? '—' : `${(kpi?.avg_7d_eggs || 0).toLocaleString()} eggs`} icon={<I.reports w={22} />} caption="daily avg" />
            <StatCard label="30d Avg Production" value={loading ? '—' : `${(kpi?.avg_30d_eggs || 0).toLocaleString()} eggs`} icon={<I.reports w={22} />} caption="daily avg" />
          </div>

          {/* ── Layer: Grade & Defect Distribution ── */}
          {kpi?.grade_distribution && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card title="Grade Distribution (all-time)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(kpi.grade_distribution).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ width: 60, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k}</span>
                      <div style={{ flex: 1, background: 'var(--border-subtle)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${v.pct}%`, background: 'var(--success)', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ width: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.count.toLocaleString()}</span>
                      <span style={{ width: 46, textAlign: 'right', color: 'var(--text-muted)' }}>{v.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card title="Defect Breakdown (last 7 days)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(kpi.defect_distribution || {}).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                      <span style={{ width: 80, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{k.replace('_', ' ')}</span>
                      <div style={{ flex: 1, background: 'var(--border-subtle)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(v.pct * 10, 100)}%`, background: 'var(--danger)', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ width: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{v.count.toLocaleString()}</span>
                      <span style={{ width: 46, textAlign: 'right', color: 'var(--text-muted)' }}>{v.pct}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            <StatCard label="Total Birds"              value={loading ? '—' : (kpi?.total_birds || 0).toLocaleString()} icon={<I.birds w={22} />} />
            <StatCard label="Mortality Rate (7d)"      value={loading ? '—' : `${(kpi?.mortality_rate_7d || 0).toFixed(2)}%`} tone="red" icon={<I.mortality w={22} />} />
            <StatCard label="Cumulative Mortality"     value={loading ? '—' : `${(kpi?.cumulative_mortality_rate || 0).toFixed(2)}%`} tone="red" icon={<I.percent w={22} />} caption="active batches" />
            <StatCard label="Feed Days Remaining"      value={loading ? '—' : (kpi?.feed_stock_days != null ? `${kpi.feed_stock_days}d` : 'N/A')} tone="amber" icon={<I.feed w={22} />} caption="lowest stock type" />
            <StatCard label="Revenue"                  value={loading ? '—' : `₱${((summary?.total_revenue || 0)).toLocaleString()}`} tone="blue" icon={<I.trendUp w={22} />} />
          </div>

          <div className="chart-split" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
            <Card title="Active Batches — Mortality % (current snapshot)">
              <LineChart
                data={batches.map((b) => parseFloat((b.mortality_pct || 0).toFixed(2)))}
                color="var(--viz-mortality)"
                labels={batches.map((b) => b.batch_no)}
              />
            </Card>
            <Card title="Expense Breakdown">
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ position: 'relative', flex: '0 0 auto' }}>
                  <DonutChart segments={expenses} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-strong)' }}>₱{(summary?.total_revenue || 0).toLocaleString()}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>total rev.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, flex: 1 }}>
                  {expenses.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No expense data yet.</span>}
                  {expenses.map((e) => (
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

          <Card title="Feed Consumption by House — last 7 days (kg)">
            <BarChart data={barData} labels={barLabels} />
          </Card>

          <Card
            title="Active Batches"
            action={
              <Button variant="secondary" size="sm" icon={<I.chevronRight w={15} />} onClick={() => navigate('/batches')}>
                View All
              </Button>
            }
          >
            <DataTable
              columns={[
                { key: 'batch', header: 'Batch No.', strong: true, render: (r) => (
                  <a href="#" onClick={(e) => { e.preventDefault(); navigate('/batches/' + r.id); }} style={{ fontWeight: 600, color: 'var(--text-brand)' }}>{r.batch}</a>
                )},
                { key: 'house',  header: 'House' },
                { key: 'birds',  header: 'Birds',  align: 'right', numeric: true },
                { key: 'age',    header: 'Age',    align: 'right' },
                { key: 'mort',   header: 'Mortality %', align: 'right', numeric: true },
                { key: 'fcr',    header: 'FCR',    align: 'right', numeric: true },
                { key: 'status', header: 'Status', render: (r) => (
                  <Badge tone={STATUS_TONE[batches.find(b => b.id === r.id)?.status] || 'success'} dot>{r.status}</Badge>
                )},
              ]}
              rows={tableRows}
              rowKey="id"
            />
          </Card>
        </>
      )}
    </div>
  );
}

function ErrBanner({ message }) {
  return (
    <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: 'var(--danger)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
      <span>⚠</span>
      <span style={{ flex: 1 }}>{message}</span>
      <span style={{ textDecoration: 'underline', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => window.location.reload()}>Retry</span>
    </div>
  );
}
