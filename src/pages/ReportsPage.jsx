import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { Button } from '../components/core/Button';
import { feedApi, reportsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const I = Icons;

// ── Report definitions ────────────────────────────────────────────────────────
const REPORTS = [
  { id: 'pnl',        title: 'Batch P&L',           description: 'Revenue, feed cost, expenses, and gross profit per batch.', icon: 'batch',     color: 'var(--green-500)', bg: 'var(--green-50)' },
  { id: 'feed',       title: 'Feed Efficiency',      description: 'FCR, total feed consumption, and cost analysis per batch.', icon: 'feed',      color: 'var(--warning)',   bg: 'var(--warning-bg)' },
  { id: 'feedStandard', title: 'Feed Standard Variance', description: 'Expected feed, actual releases, variance, alerts, and feed cost by batch.', icon: 'feed', color: 'var(--info)', bg: 'var(--info-bg)' },
  { id: 'mortality',  title: 'Mortality Analysis',   description: 'Mortality trends and cause breakdown for the period.', icon: 'mortality', color: 'var(--danger)',    bg: 'var(--danger-bg)' },
  { id: 'monthly',    title: 'Monthly Summary',      description: 'KPIs, revenue, feed, and mortality overview for the month.', icon: 'reports',   color: 'var(--info)',      bg: 'var(--info-bg)' },
  { id: 'inventory',  title: 'Inventory Snapshot',   description: 'Stock levels, low-stock items, and reorder recommendations.', icon: 'inventory', color: 'var(--viz-labor)', bg: 'var(--info-bg)' },
  { id: 'financial',  title: 'Financial Summary',    description: 'Revenue, expenses, gross margin, and profitability overview.', icon: 'wallet',    color: 'var(--viz-utilities)', bg: '#F1ECFD' },
  { id: 'comparison', title: 'Batch Comparison',     description: 'Side-by-side comparison of all batches: survival, FCR, feed cost, revenue, and profitability.', icon: 'batch', color: 'var(--info)', bg: 'var(--info-bg)' },
];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Date range helpers ────────────────────────────────────────────────────────
function resolveRange(range) {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;
  if (range === 'This month')    return { year: y, month: m, label: `${MONTH_NAMES[m-1]} ${y}` };
  if (range === 'Last month')    { const d = new Date(y, m-2, 1); return { year: d.getFullYear(), month: d.getMonth()+1, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` }; }
  if (range === 'Last 3 months') { const d = new Date(y, m-4, 1); return { year: d.getFullYear(), month: d.getMonth()+1, label: `Last 3 months` }; }
  if (range === 'Last 6 months') { const d = new Date(y, m-7, 1); return { year: d.getFullYear(), month: d.getMonth()+1, label: `Last 6 months` }; }
  if (range === 'This year')     return { year: y, month: null, label: `Year ${y}` };
  return { year: y, month: m, label: `${MONTH_NAMES[m-1]} ${y}` };
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function resolveFeedStandardRange(range) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start = new Date(end);
  let period = 'daily';

  if (range === 'This month') {
    start = new Date(end.getFullYear(), end.getMonth(), 1);
  } else if (range === 'Last month') {
    start = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0);
  } else if (range === 'Last 3 months') {
    start = new Date(end.getFullYear(), end.getMonth() - 3, 1);
    period = 'weekly';
  } else if (range === 'Last 6 months') {
    start = new Date(end.getFullYear(), end.getMonth() - 6, 1);
    period = 'weekly';
  } else if (range === 'This year') {
    start = new Date(end.getFullYear(), 0, 1);
    period = 'monthly';
  }

  return { start_date: toISODate(start), end_date: toISODate(end), period };
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCsv(data, filename) {
  if (!data) return;
  const rows = Array.isArray(data) ? data : [data];
  if (rows.length === 0) return;
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
    download: filename,
  });
  a.click();
}

// ── Result renderers ──────────────────────────────────────────────────────────
const TH = ({ children, right }) => (
  <th style={{ padding: '8px 12px', textAlign: right ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' }}>{children}</th>
);
const TD = ({ children, right, strong, tone }) => {
  const color = tone === 'success' ? 'var(--success)' : tone === 'danger' ? 'var(--danger)' : tone === 'warning' ? 'var(--warning)' : 'var(--text-body)';
  return (
    <td style={{ padding: '9px 12px', textAlign: right ? 'right' : 'left', fontSize: 13, color: strong ? 'var(--text-strong)' : color, fontWeight: strong ? 600 : 400, borderBottom: '1px solid var(--border-subtle)' }}>{children}</td>
  );
};

function fmt(n, prefix='₱') { return `${prefix}${parseFloat(n||0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function fmtN(n) { return parseFloat(n||0).toFixed(2); }

function BatchLink({ id, name, navigate }) {
  return (
    <span onClick={() => navigate(`/batches/${id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
      {name}
    </span>
  );
}

function PnlTable({ rows, navigate }) {
  if (!rows?.length) return <Empty />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><TH>Batch</TH><TH>House</TH><TH right>Revenue</TH><TH right>Feed Cost</TH><TH right>Other Exp.</TH><TH right>Gross Profit</TH></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <TD strong><BatchLink id={r.batch_id} name={r.batch_no} navigate={navigate} /></TD>
            <TD>{r.house}</TD>
            <TD right>{fmt(r.total_revenue)}</TD>
            <TD right>{fmt(r.feed_cost)}</TD>
            <TD right>{fmt(r.other_expenses)}</TD>
            <TD right strong tone={r.gross_profit >= 0 ? 'success' : 'danger'}>{fmt(r.gross_profit)}</TD>
          </tr>
        ))}
        <tr style={{ background: 'var(--surface-page)' }}>
          <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total</td>
          <TD right strong>{fmt(rows.reduce((s,r)=>s+parseFloat(r.total_revenue||0),0))}</TD>
          <TD right strong>{fmt(rows.reduce((s,r)=>s+parseFloat(r.feed_cost||0),0))}</TD>
          <TD right strong>{fmt(rows.reduce((s,r)=>s+parseFloat(r.other_expenses||0),0))}</TD>
          <TD right strong tone={rows.reduce((s,r)=>s+parseFloat(r.gross_profit||0),0) >= 0 ? 'success' : 'danger'}>{fmt(rows.reduce((s,r)=>s+parseFloat(r.gross_profit||0),0))}</TD>
        </tr>
      </tbody>
    </table>
  );
}

function FeedTable({ rows, navigate }) {
  if (!rows?.length) return <Empty />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><TH>Batch</TH><TH>House</TH><TH right>Total Feed (kg)</TH><TH right>Avg Weight (g)</TH><TH right>Current Birds</TH><TH right>FCR</TH></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <TD strong><BatchLink id={r.batch_id} name={r.batch_no} navigate={navigate} /></TD>
            <TD>{r.house}</TD>
            <TD right>{fmtN(r.total_feed_kg)}</TD>
            <TD right>{r.avg_weight_g ?? '—'}</TD>
            <TD right>{r.current_count?.toLocaleString() ?? '—'}</TD>
            <TD right strong tone={!r.fcr ? 'neutral' : r.fcr < 2 ? 'success' : r.fcr < 2.5 ? 'warning' : 'danger'}>{r.fcr ? fmtN(r.fcr) : '—'}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FeedStandardTable({ rows, navigate }) {
  if (!rows?.length) return <Empty />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <TH>Period</TH>
          <TH>Batch</TH>
          <TH right>Standard Feed</TH>
          <TH right>Actual Feed</TH>
          <TH right>Difference</TH>
          <TH right>Variance</TH>
          <TH right>Feed Cost</TH>
          <TH>Alert</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={`${r.batch_id}-${r.period}-${i}`}>
            <TD strong>{r.period}</TD>
            <TD><BatchLink id={r.batch_id} name={r.batch_no} navigate={navigate} /></TD>
            <TD right>{fmtN(r.standard_feed_kg)} kg</TD>
            <TD right>{fmtN(r.actual_feed_kg)} kg</TD>
            <TD right tone={parseFloat(r.difference_kg || 0) > 0 ? 'warning' : parseFloat(r.difference_kg || 0) < 0 ? 'danger' : 'success'}>
              {fmtN(r.difference_kg)} kg
            </TD>
            <TD right tone={Math.abs(parseFloat(r.variance_pct || 0)) > 10 ? 'danger' : 'success'}>
              {r.variance_pct == null ? '—' : `${fmtN(r.variance_pct)}%`}
            </TD>
            <TD right>{fmt(r.feed_cost)}</TD>
            <TD tone={r.alert ? 'warning' : 'success'}>{r.alert || 'Within standard'}</TD>
          </tr>
        ))}
        <tr style={{ background: 'var(--surface-page)' }}>
          <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total</td>
          <TD right strong>{fmtN(rows.reduce((s,r)=>s+parseFloat(r.standard_feed_kg||0),0))} kg</TD>
          <TD right strong>{fmtN(rows.reduce((s,r)=>s+parseFloat(r.actual_feed_kg||0),0))} kg</TD>
          <TD right strong>{fmtN(rows.reduce((s,r)=>s+parseFloat(r.difference_kg||0),0))} kg</TD>
          <TD right>—</TD>
          <TD right strong>{fmt(rows.reduce((s,r)=>s+parseFloat(r.feed_cost||0),0))}</TD>
          <TD>—</TD>
        </tr>
      </tbody>
    </table>
  );
}

function MortalityTable({ rows, navigate }) {
  if (!rows?.length) return <Empty />;
  const CAUSE_LABEL = { heat_stress: 'Heat Stress', disease: 'Disease', injury: 'Injury', culling: 'Culling', unknown: 'Unknown', other: 'Other' };
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><TH>Cause</TH><TH>Batch</TH><TH>House</TH><TH right>Incidents</TH><TH right>Total Deaths</TH></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            <TD strong>{CAUSE_LABEL[r.cause] || r.cause}</TD>
            <TD><BatchLink id={r.batch_id} name={r.batch_no} navigate={navigate} /></TD>
            <TD>{r.house}</TD>
            <TD right>{r.incidents}</TD>
            <TD right tone="danger">{r.total_deaths}</TD>
          </tr>
        ))}
        <tr style={{ background: 'var(--surface-page)' }}>
          <td colSpan={3} style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total</td>
          <TD right strong>{rows.reduce((s,r)=>s+parseInt(r.incidents||0),0)}</TD>
          <TD right strong tone="danger">{rows.reduce((s,r)=>s+parseInt(r.total_deaths||0),0)}</TD>
        </tr>
      </tbody>
    </table>
  );
}

function MonthlySummaryCards({ data }) {
  if (!data) return <Empty />;
  const cards = [
    { label: 'Revenue',         value: fmt(data.revenue),       tone: 'success' },
    { label: 'Other Expenses',  value: fmt(data.expenses),      tone: 'danger' },
    { label: 'Feed Cost',       value: fmt(data.feed_cost),     tone: 'danger' },
    { label: 'Gross Profit',    value: fmt(data.gross_profit),  tone: data.gross_profit >= 0 ? 'success' : 'danger' },
    { label: 'Feed Used (kg)',  value: parseFloat(data.feed_used_kg||0).toLocaleString() + ' kg', tone: 'neutral' },
    { label: 'Total Mortality', value: parseInt(data.total_mortality||0).toLocaleString() + ' birds', tone: parseInt(data.total_mortality) > 0 ? 'warning' : 'success' },
    { label: 'Period',          value: `${MONTH_NAMES[(data.month||1)-1]} ${data.year}`, tone: 'neutral' },
  ];
  const toneColor = { success: 'var(--success)', danger: 'var(--danger)', warning: 'var(--warning)', neutral: 'var(--text-strong)' };
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {cards.map(c => (
        <div key={c.label} style={{ padding: '14px 16px', background: 'var(--surface-page)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: toneColor[c.tone] }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function FinancialTable({ data }) {
  if (!data) return <Empty />;
  const rows = [
    { label: 'Total Revenue',    value: fmt(data.revenue),                     tone: 'success' },
    { label: 'Total Expenses',   value: fmt(data.expenses),                    tone: 'danger'  },
    { label: 'Feed Used (kg)',   value: `${parseFloat(data.feed_used_kg||0).toLocaleString()} kg`, tone: 'neutral' },
    { label: 'Gross Profit',     value: fmt(data.gross_profit),                tone: data.gross_profit >= 0 ? 'success' : 'danger' },
    { label: 'Total Mortalities',value: `${parseInt(data.total_mortality||0)} birds`,              tone: 'neutral' },
  ];
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><TH>Metric</TH><TH right>Value</TH></tr></thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={i}>
            <TD strong>{r.label}</TD>
            <TD right tone={r.tone}>{r.value}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InventoryTable({ rows }) {
  if (!rows?.length) return <Empty />;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><TH>Category</TH><TH right>Total Items</TH><TH right>In Stock</TH><TH right>Low Stock</TH><TH right>Out of Stock</TH></tr></thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={i}>
            <TD strong>{r.category}</TD>
            <TD right>{r.item_count}</TD>
            <TD right tone="success">{r.in_stock}</TD>
            <TD right tone="warning">{r.low_stock}</TD>
            <TD right tone={r.out_of_stock > 0 ? 'danger' : 'neutral'}>{r.out_of_stock}</TD>
          </tr>
        ))}
        <tr style={{ background: 'var(--surface-page)' }}>
          <td style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13 }}>Total</td>
          <TD right strong>{rows.reduce((s,r)=>s+parseInt(r.item_count||0),0)}</TD>
          <TD right strong tone="success">{rows.reduce((s,r)=>s+parseInt(r.in_stock||0),0)}</TD>
          <TD right strong tone="warning">{rows.reduce((s,r)=>s+parseInt(r.low_stock||0),0)}</TD>
          <TD right strong>{rows.reduce((s,r)=>s+parseInt(r.out_of_stock||0),0)}</TD>
        </tr>
      </tbody>
    </table>
  );
}

function BatchComparisonTable({ rows, navigate }) {
  if (!rows?.length) return <Empty />;
  const pColor = n => n == null ? 'inherit' : n >= 0 ? 'var(--success)' : 'var(--danger)';
  const statusTone = s => s === 'profitable' ? 'success' : s === 'at_risk' ? 'warning' : 'danger';
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <TH>Batch</TH>
          <TH>House</TH>
          <TH right>Birds</TH>
          <TH right>Deaths</TH>
          <TH right>Survival %</TH>
          <TH right>Mortality %</TH>
          <TH right>FCR</TH>
          <TH right>Feed Cost</TH>
          <TH right>Total Exp.</TH>
          <TH right>Revenue</TH>
          <TH right>Gross Profit</TH>
          <TH>Status</TH>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--surface-raised,rgba(0,0,0,.02))' }}>
            <TD strong><BatchLink id={r.batch_id} name={r.batch_no} navigate={navigate} /></TD>
            <TD>{r.house}</TD>
            <TD right>{r.initial_count?.toLocaleString() ?? '—'}</TD>
            <TD right tone={r.total_deaths > 0 ? 'danger' : 'neutral'}>{r.total_deaths ?? 0}</TD>
            <TD right>{r.survival_pct != null ? `${parseFloat(r.survival_pct).toFixed(1)}%` : '—'}</TD>
            <TD right>{r.mortality_pct != null ? `${parseFloat(r.mortality_pct).toFixed(1)}%` : '—'}</TD>
            <TD right tone={!r.fcr ? 'neutral' : r.fcr < 2 ? 'success' : r.fcr < 2.5 ? 'warning' : 'danger'}>
              {r.fcr ? parseFloat(r.fcr).toFixed(2) : '—'}
            </TD>
            <TD right>{r.feed_cost ? fmt(r.feed_cost) : '—'}</TD>
            <TD right>{r.total_expenses ? fmt(r.total_expenses) : '—'}</TD>
            <TD right tone="success">{r.revenue ? fmt(r.revenue) : '—'}</TD>
            <TD right><span style={{ fontWeight: 600, color: pColor(r.gross_profit) }}>{r.gross_profit != null ? fmt(r.gross_profit) : '—'}</span></TD>
            <TD>{r.status ? <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: `var(--${statusTone(r.status)})` }}>{r.status.replace('_', ' ')}</span> : '—'}</TD>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Empty() {
  return <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No data available for this period.</div>;
}

function renderResult(id, data, navigate) {
  if (!data) return null;
  if (data.error) return <div style={{ color: 'var(--danger)', fontSize: 13, padding: '12px 0' }}>{data.error}</div>;
  if (id === 'pnl')        return <PnlTable rows={data} navigate={navigate} />;
  if (id === 'feed')       return <FeedTable rows={data} navigate={navigate} />;
  if (id === 'feedStandard') return <FeedStandardTable rows={data} navigate={navigate} />;
  if (id === 'mortality')  return <MortalityTable rows={data} navigate={navigate} />;
  if (id === 'monthly')    return <MonthlySummaryCards data={data} />;
  if (id === 'inventory')  return <InventoryTable rows={data} />;
  if (id === 'financial')  return <FinancialTable data={data} />;
  if (id === 'comparison') return <BatchComparisonTable rows={data} navigate={navigate} />;
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
const RANGES = ['This month', 'Last month', 'Last 3 months', 'Last 6 months', 'This year'];

export default function ReportsPage() {
  const { farms, farmId } = useFarm();
  const { user } = useAuth();
  const navigate = useNavigate();
  const farmName = farms.find(f => f.id === farmId)?.name || 'Farm';
  const generatedBy = user?.full_name || user?.email || 'System User';

  const [selected, setSelected] = useState(null);
  const [range,    setRange]    = useState(RANGES[0]);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);

  const report = REPORTS.find(r => r.id === selected);

  async function generate() {
    if (!selected) return;
    setLoading(true);
    setResult(null);
    try {
      const { year, month } = resolveRange(range);
      let data;
      if (selected === 'pnl')             data = await reportsApi.batchPnl(farmId);
      else if (selected === 'feed')        data = await reportsApi.feedConsumption({ farm_id: farmId });
      else if (selected === 'feedStandard') data = await feedApi.standardReport({ farm_id: farmId, ...resolveFeedStandardRange(range) });
      else if (selected === 'mortality')   data = await reportsApi.mortalityAnalysis({ farm_id: farmId });
      else if (selected === 'monthly')     data = await reportsApi.salesPerformance(farmId, year, month);
      else if (selected === 'inventory')   data = await reportsApi.inventorySnapshot(farmId);
      else if (selected === 'financial')   data = await reportsApi.farmFinances(farmId);
      else if (selected === 'comparison')  data = await reportsApi.batchComparison(farmId);
      setResult(data);
      setGeneratedAt(new Date());
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const prev = document.title;
    document.title = report?.title || 'Report';
    document.body.dataset.printOrientation = ['comparison', 'feedStandard', 'financial'].includes(selected) ? 'landscape' : 'auto';
    window.print();
    setTimeout(() => {
      document.title = prev;
      delete document.body.dataset.printOrientation;
    }, 500);
  }

  function handleCsv() {
    if (!result || result.error) return;
    exportCsv(result, `${selected}-report-${farmName.replace(/\s+/g,'-')}.csv`);
  }

  const rangeLabel = resolveRange(range).label;
  const hasResult = result && !result.error;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Page header */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Reports & Analytics</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Select a report, choose a date range, and generate.</p>
        </div>
        {hasResult && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={handleCsv}>Download CSV</Button>
            <Button variant="primary"   size="sm" icon={<I.reports w={14} />}  onClick={handlePrint}>Print / PDF</Button>
          </div>
        )}
      </div>

      {/* Report selector */}
      <div className="rpt-select-grid no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {REPORTS.map(rc => {
          const Glyph = I[rc.icon];
          const isSelected = selected === rc.id;
          return (
            <button
              key={rc.id}
              onClick={() => { setSelected(rc.id); setResult(null); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '16px 18px', borderRadius: 'var(--radius-lg)',
                border: isSelected ? `2px solid var(--text-brand)` : '2px solid var(--border)',
                background: isSelected ? 'var(--brand-50,#f0fdf4)' : 'var(--surface-card)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 120ms',
                boxShadow: isSelected ? '0 0 0 3px rgba(22,163,74,0.12)' : 'none',
              }}
            >
              <span style={{ width: 40, height: 40, borderRadius: '50%', background: rc.bg, color: rc.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                {Glyph && <Glyph w={19} />}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? 'var(--text-brand)' : 'var(--text-strong)', marginBottom: 3 }}>{rc.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rc.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <Card className="no-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-strong)', minWidth: 120 }}>
            {report ? report.title : 'Select a report above'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Period:</label>
            <select
              value={range}
              onChange={e => setRange(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--surface-card)', color: 'var(--text-body)', cursor: 'pointer' }}
            >
              {RANGES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <Button variant="primary" size="md" onClick={generate} disabled={!selected || loading}>
              {loading ? 'Generating…' : 'Generate Report'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report preview */}
      {(result || loading) && (
        <Card>
          {/* Printable area */}
          <div id="report-print-area">
            {/* Print header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #16a34a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src="/logo-mark.png" alt="" style={{ height: 44, objectFit: 'contain' }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: 'var(--text-strong)' }}>RTL Poultry Farming ERP</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{farmName}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>{report?.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Period: {rangeLabel}</div>
                {generatedAt && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Generated: {generatedAt.toLocaleString('en-PH')}</div>}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Generated By: {generatedBy}</div>
              </div>
            </div>

            {/* Result content */}
            {loading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Generating report…</div>
            ) : result?.error ? (
              <div style={{ padding: '16px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{result.error}</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                {renderResult(selected, result, navigate)}
              </div>
            )}

            {/* Print footer */}
            {hasResult && (
              <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)' }}>
                <span>RTL Poultry Farming ERP — Confidential</span>
                <span>{farmName} · {rangeLabel}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
