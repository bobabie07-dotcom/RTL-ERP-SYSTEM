import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { LineChart } from '../charts';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { mortalityApi, batchesApi, reportsApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';
import { calcFinancialLoss, calcTotalFinancialLoss, calcDetailedMortalityLoss, getAgeAtDeath } from '../utils/mortality';
import { useMarketPrice } from '../utils/useMarketPrice';

const I = Icons;

const CAUSE_TONE  = { heat_stress: 'warning', disease: 'danger', injury: 'warning', culling: 'neutral', unknown: 'neutral', other: 'neutral' };
const CAUSE_LABEL = { heat_stress: 'Heat Stress', disease: 'Disease', injury: 'Injury', culling: 'Culling', unknown: 'Unknown', other: 'Other' };
const STATUS_TONE  = { profitable: 'success', at_risk: 'warning', loss: 'danger' };
const STATUS_LABEL = { profitable: 'Profitable', at_risk: 'At Risk', loss: 'In Loss' };

const TODAY = new Date().toISOString().split('T')[0];
const BLANK = { batch_id: '', house_id: '', record_date: TODAY, count: 1, chicken_weight_kg: '', cause: 'unknown', cause_notes: '' };

const fmt = n =>
  n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const BatchLink = ({ id, name }) => {
  const navigate = useNavigate();
  return (
    <span onClick={() => navigate(`/batches/${id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>
      {name}
    </span>
  );
};

export default function MortalityPage() {
  const { farmId } = useFarm();
  const [records,  setRecords]  = useState([]);
  const [rates,    setRates]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [batches,  setBatches]  = useState([]);
  const [houses,   setHouses]   = useState([]);

  // Add modal
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(BLANK);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState('');

  // Edit modal
  const [editModal,   setEditModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [editForm,    setEditForm]    = useState(BLANK);
  const [editSaving,  setEditSaving]  = useState(false);
  const [editErr,     setEditErr]     = useState('');

  // Delete confirmation modal
  const [deleteModal,   setDeleteModal]   = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleting,      setDeleting]      = useState(false);

  const [loadError,     setLoadError]     = useState('');
  const [trendPeriod,   setTrendPeriod]   = useState('Last 7 days');
  const [batchFilter,   setBatchFilter]   = useState('All Batches');

  // Financial impact — market price sourced from Settings (localStorage)
  const [impact,        setImpact]        = useState([]);
  const [impactLoading, setImpactLoading] = useState(false);
  const [marketPrice,   persistMarketPrice] = useMarketPrice();
  const [priceInput,    setPriceInput]      = useState(String(marketPrice));
  const [classType,     setClassType]       = useState('broiler'); // 'broiler' | 'layer' | 'rtl'

  // Detailed mortality cost parameters (persisted to localStorage)
  const [costParams, setCostParams] = useState(() => {
    try { return JSON.parse(localStorage.getItem('erp_mortality_cost_params')) || { fc: '', vc: '', pf: '', pv: '', pc: '' }; }
    catch { return { fc: '', vc: '', pf: '', pv: '', pc: '' }; }
  });

  function updateCostParam(key, val) {
    const next = { ...costParams, [key]: val };
    setCostParams(next);
    try { localStorage.setItem('erp_mortality_cost_params', JSON.stringify(next)); } catch {}
  }

  // Detailed mode is active when FC, PF, and PC are all set and positive
  const hasCostParams = (
    costParams.fc !== '' && Number(costParams.fc) > 0 &&
    costParams.pf !== '' && Number(costParams.pf) > 0 &&
    costParams.pc !== '' && Number(costParams.pc) > 0
  );

  function loadData() {
    return Promise.all([
      mortalityApi.list({ limit: 50, farm_id: farmId }),
      mortalityApi.rates7d(farmId),
    ]).then(([r, rt]) => { setRecords(r || []); setRates(rt || []); });
  }

  const pricingMode = classType === 'broiler' ? 'per_kg' : 'per_bird';
  const isByBird    = classType !== 'broiler';

  function loadImpact(price, mode) {
    if (!farmId) return;
    setImpactLoading(true);
    reportsApi.mortalityImpact(farmId, price ?? marketPrice, mode ?? pricingMode)
      .then(data => setImpact(data || []))
      .catch(() => setImpact([]))
      .finally(() => setImpactLoading(false));
  }

  useEffect(() => {
    loadData().catch(e => setLoadError(e.message || 'Failed to load mortality data.')).finally(() => setLoading(false));
    batchesApi.list({ farm_id: farmId }).then(setBatches).catch(() => {});
    batchesApi.houses({ farm_id: farmId }).then(setHouses).catch(() => {});
    loadImpact(marketPrice);
  }, [farmId]);

  function applyPrice() {
    const p = parseFloat(priceInput);
    if (!isNaN(p) && p > 0) { persistMarketPrice(p); loadImpact(p, pricingMode); }
  }

  function handleClassChange(newClass) {
    setClassType(newClass);
    const mode = newClass === 'broiler' ? 'per_kg' : 'per_bird';
    loadImpact(marketPrice, mode);
  }

  // ── Add record ────────────────────────────────────────────────────────────
  function openModal() { setForm(BLANK); setFormErr(''); setModal(true); }

  async function handleSave() {
    if (!form.batch_id || !form.house_id || !form.record_date || !form.count) {
      setFormErr('Please fill in all required fields.'); return;
    }
    setSaving(true); setFormErr('');
    try {
      await mortalityApi.create({
        ...form,
        batch_id:          Number(form.batch_id),
        house_id:          Number(form.house_id),
        count:             Number(form.count),
        chicken_weight_kg: form.chicken_weight_kg ? parseFloat(form.chicken_weight_kg) : null,
      });
      await loadData();
      loadImpact(marketPrice);
      setModal(false);
    } catch (err) { setFormErr(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  // ── Edit record ───────────────────────────────────────────────────────────
  function openEdit(row) {
    setEditTarget(row);
    setEditForm({
      record_date:       row.date,
      count:             row.count,
      chicken_weight_kg: row.chicken_weight_kg ?? '',
      cause:             row.cause,
      cause_notes:       row.cause_notes === '—' ? '' : (row.cause_notes || ''),
    });
    setEditErr('');
    setEditModal(true);
  }

  async function handleEdit() {
    if (!editForm.count || !editForm.record_date) {
      setEditErr('Date and count are required.'); return;
    }
    setEditSaving(true); setEditErr('');
    try {
      await mortalityApi.update(editTarget.id, {
        record_date:       editForm.record_date,
        count:             Number(editForm.count),
        chicken_weight_kg: editForm.chicken_weight_kg ? parseFloat(editForm.chicken_weight_kg) : null,
        cause:             editForm.cause,
        cause_notes:       editForm.cause_notes || null,
      });
      await loadData();
      loadImpact(marketPrice);
      setEditModal(false);
    } catch (err) { setEditErr(err.message || 'Failed to update.'); }
    finally { setEditSaving(false); }
  }

  // ── Delete record ─────────────────────────────────────────────────────────
  function openDelete(row) { setDeleteTarget(row); setDeleteModal(true); }

  async function handleDelete() {
    setDeleting(true);
    try {
      await mortalityApi.delete(deleteTarget.id);
      await loadData();
      loadImpact(marketPrice);
      setDeleteModal(false);
    } catch (err) { setLoadError(err.message || 'Failed to delete record.'); }
    finally { setDeleting(false); }
  }

  const f  = key => e => setForm(p  => ({ ...p, [key]: e.target.value }));
  const ef = key => e => setEditForm(p => ({ ...p, [key]: e.target.value }));

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total7d   = records.reduce((s, r) => s + (r.count || 0), 0);
  const avgRate   = rates.length ? (rates.reduce((s, r) => s + (r.mortality_rate_pct || 0), 0) / rates.length) : 0;
  const highAlert = rates.filter(r => r.mortality_rate_pct > 1.5).length;

  // Per-batch detailed cost breakdown (only computed when hasCostParams)
  const breakdownByBatch = {};
  if (hasCostParams) {
    records.forEach(r => {
      const batch = batches.find(b => b.id === r.batch_id);
      if (!batch) return;
      const AD = getAgeAtDeath(r.date, batch.placed_date);
      const bl = calcDetailedMortalityLoss({
        D: r.count, AD,
        FC: costParams.fc, VC: costParams.vc || 0,
        PF: costParams.pf, PV: costParams.pv || 0, PC: costParams.pc,
      });
      if (!breakdownByBatch[r.batch_id]) {
        breakdownByBatch[r.batch_id] = {
          batch_id: r.batch_id, batch_no: r.batch, house: r.house,
          deaths: 0, feedCostLoss: 0, vitCostLoss: 0, chickLoss: 0, totalLoss: 0,
        };
      }
      const bb = breakdownByBatch[r.batch_id];
      bb.deaths       += r.count;
      bb.feedCostLoss += bl.feedCostLoss;
      bb.vitCostLoss  += bl.vitCostLoss;
      bb.chickLoss    += bl.chickLoss;
      bb.totalLoss    += bl.totalLoss;
    });
  }
  const breakdownRows = Object.values(breakdownByBatch);

  const totalFinancialLoss = hasCostParams
    ? breakdownRows.reduce((s, r) => s + r.totalLoss, 0)
    : calcTotalFinancialLoss(records, marketPrice, pricingMode);

  const trendMap = {};
  records.forEach(r => { trendMap[r.date] = (trendMap[r.date] || 0) + r.count; });
  const trendSlice  = trendPeriod === 'Last 30 days' ? -30 : -7;
  const trendDates  = Object.keys(trendMap).sort().slice(trendSlice);
  const trendValues = trendDates.map(d => trendMap[d] || 0);

  const tableRows = records.map(r => {
    let financialLoss;
    if (hasCostParams) {
      const batch = batches.find(b => b.id === r.batch_id);
      const AD = batch ? getAgeAtDeath(r.date, batch.placed_date) : 0;
      financialLoss = calcDetailedMortalityLoss({
        D: r.count, AD,
        FC: costParams.fc, VC: costParams.vc || 0,
        PF: costParams.pf, PV: costParams.pv || 0, PC: costParams.pc,
      }).totalLoss;
    } else {
      financialLoss = calcFinancialLoss(r.count, r.chicken_weight_kg, marketPrice, pricingMode);
    }
    return {
      ...r,
      causeLabel:   CAUSE_LABEL[r.cause] || r.cause,
      cause_notes:  r.cause_notes || '—',
      recorded_by:  r.recorded_by || '—',
      financialLoss,
    };
  });

  const batchOptions    = ['All Batches', ...Array.from(new Set(tableRows.map(r => r.batch).filter(Boolean)))];
  const filteredRows    = batchFilter === 'All Batches' ? tableRows : tableRows.filter(r => r.batch === batchFilter);

  const totalMortalityLoss = impact.reduce((s, r) => s + r.mortality_loss, 0);
  const totalProjProfit    = impact.reduce((s, r) => s + r.proj_profit, 0);
  const totalDeaths        = impact.reduce((s, r) => s + r.deaths, 0);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Mortality Tracker</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Monitor and analyze flock mortality across all batches.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />} onClick={openModal}>Add Record</Button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Mortality (7d)"    value={loading ? '—' : total7d}                      tone="red"   icon={<I.mortality w={22} />} caption="all batches" />
        <StatCard label="Avg. Mortality Rate"      value={loading ? '—' : `${avgRate.toFixed(2)}%`}    tone="red"   icon={<I.percent w={22} />} />
        <StatCard label="High Alerts"              value={loading ? '—' : highAlert}                    tone="amber" icon={<I.alertTri w={22} />} caption=">1.5% rate" />
        <StatCard label="Est. Financial Loss (7d)" value={loading ? '—' : fmt(totalFinancialLoss)}     tone="red"   icon={<I.wallet w={22} />} caption={hasCostParams ? 'feed + vitamins + chick cost' : `@ ₱${marketPrice}/${isByBird ? 'bird' : 'kg'}`} />
      </div>

      {/* Mortality Cost Parameters */}
      <Card title="Mortality Cost Parameters">
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Set these once to enable accurate per-chick mortality loss using accumulated feed &amp; vitamin intake.
          FC, PF, and PC are required; VC and PV can be left as 0 if vitamins are not tracked.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          <div>
            <label style={paramLabel}>FC — Daily Feed / Chick (kg/day)</label>
            <input type="number" value={costParams.fc} onChange={e => updateCostParam('fc', e.target.value)} min="0" step="0.001" placeholder="e.g. 0.080" style={paramInput} />
          </div>
          <div>
            <label style={paramLabel}>PF — Price / kg Feed (₱)</label>
            <input type="number" value={costParams.pf} onChange={e => updateCostParam('pf', e.target.value)} min="0" step="0.01" placeholder="e.g. 25.00" style={paramInput} />
          </div>
          <div>
            <label style={paramLabel}>PC — Price per Chick (₱)</label>
            <input type="number" value={costParams.pc} onChange={e => updateCostParam('pc', e.target.value)} min="0" step="0.01" placeholder="e.g. 48.00" style={paramInput} />
          </div>
          <div>
            <label style={paramLabel}>VC — Daily Vitamins / Chick (mL/day)</label>
            <input type="number" value={costParams.vc} onChange={e => updateCostParam('vc', e.target.value)} min="0" step="0.001" placeholder="0 if none" style={paramInput} />
          </div>
          <div>
            <label style={paramLabel}>PV — Price / unit Vitamins (₱)</label>
            <input type="number" value={costParams.pv} onChange={e => updateCostParam('pv', e.target.value)} min="0" step="0.01" placeholder="0 if none" style={paramInput} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          {hasCostParams ? (
            <div style={{ padding: '8px 12px', background: 'var(--success-bg)', borderRadius: 8, fontSize: 13, color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              ✓ Detailed cost mode active — Est. Loss now uses Feed + Vitamins + Chick formula
            </div>
          ) : (
            <div style={{ padding: '8px 12px', background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
              Fill in FC, PF, and PC to enable detailed breakdown. Without them, Est. Loss uses market price × count.
            </div>
          )}
        </div>
      </Card>

      {/* Financial Impact */}
      <Card title="Financial Impact of Mortality">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Classification:</span>
            <select
              value={classType} onChange={e => handleClassChange(e.target.value)}
              style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 13, cursor: 'pointer' }}
            >
              <option value="broiler">Broiler</option>
              <option value="layer">Layer</option>
              <option value="rtl">RTL Chicken</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Market Price (₱/{isByBird ? 'bird' : 'kg'}):
            </span>
            <input
              type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyPrice()}
              style={{ width: 90, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border-soft)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 13 }}
              min="1" placeholder="120"
            />
            <Button variant="secondary" size="sm" onClick={applyPrice}>Recalculate</Button>
          </div>
          {impact.length > 0 && !impactLoading && (
            <div style={{ display: 'flex', gap: 20, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <div style={summaryChip}><span style={chipLabel}>Total Mortality Loss</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{fmt(totalMortalityLoss)}</span></div>
              <div style={summaryChip}><span style={chipLabel}>Projected Net Profit</span><span style={{ ...chipValue, color: totalProjProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(totalProjProfit)}</span></div>
              <div style={summaryChip}><span style={chipLabel}>Total Dead Birds</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{totalDeaths.toLocaleString()}</span></div>
            </div>
          )}
        </div>
        {impactLoading ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Calculating…</p>
        ) : impact.length === 0 ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>No active batches with financial data for this farm.</p>
        ) : (
          <DataTable
            columns={[
              { key: 'batch_no', header: 'Batch', render: r => <BatchLink id={r.batch_id} name={r.batch_no} /> },
              { key: 'house',           header: 'House' },
              { key: 'initial_count',   header: 'Placed',          align: 'right', numeric: true, render: r => (r.initial_count ?? 0).toLocaleString() },
              { key: 'deaths',          header: 'Deaths',          align: 'right', numeric: true, render: r => <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{(r.deaths ?? 0).toLocaleString()} <small style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>({r.mortality_pct}%)</small></span> },
              { key: 'total_expenses',  header: 'Total Expenses',  align: 'right', render: r => fmt(r.total_expenses) },
              { key: 'mortality_loss',  header: 'Mortality Loss',  align: 'right', render: r => <span style={{ color: 'var(--danger)' }}>{fmt(r.mortality_loss)}</span> },
              { key: 'proj_revenue',    header: 'Proj. Revenue',   align: 'right', render: r => r.proj_weight_kg > 0 ? fmt(r.proj_revenue) : <span style={{ color: 'var(--text-secondary)' }}>No weight data</span> },
              { key: 'proj_profit',     header: 'Proj. Profit',    align: 'right', render: r => r.proj_weight_kg > 0 ? <span style={{ fontWeight: 600, color: r.proj_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{fmt(r.proj_profit)}</span> : '—' },
              { key: 'breakeven_price', header: 'Break-even',      align: 'right', render: r => r.proj_weight_kg > 0 ? `₱${(r.breakeven_price ?? 0).toFixed(2)}/${isByBird ? 'bird' : 'kg'}` : '—' },
              { key: 'status',          header: 'Status',          render: r => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
            ]}
            rows={impact}
            rowKey="batch_id"
          />
        )}
        <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted, var(--text-secondary))' }}>
          Mortality Loss = Deaths × (Total Expenses ÷ Birds Placed).{' '}
          {isByBird
            ? `Projected Revenue = Surviving Birds × ₱${marketPrice}/bird. Break-even = Total Expenses ÷ Surviving Birds.`
            : `Projected Revenue = Surviving Birds × Avg Weight × ₱${marketPrice}/kg. Weight data must be recorded in daily logs for projections to calculate.`
          }
        </p>
      </Card>

      {/* Detailed Mortality Cost Breakdown (only when cost params are set) */}
      {hasCostParams && breakdownRows.length > 0 && (
        <Card title="Detailed Mortality Cost Breakdown">
          <DataTable
            columns={[
              { key: 'batch_no', header: 'Batch', render: r => <BatchLink id={r.batch_id} name={r.batch_no} /> },
              { key: 'house',    header: 'House' },
              { key: 'deaths',   header: 'Total Deaths',   align: 'right', numeric: true,
                render: r => <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{(r.deaths ?? 0).toLocaleString()}</span> },
              { key: 'feedCostLoss', header: 'Feed Cost Loss', align: 'right',
                render: r => <span style={{ color: 'var(--danger)' }}>{fmt(r.feedCostLoss)}</span> },
              { key: 'vitCostLoss',  header: 'Vit. Cost Loss', align: 'right',
                render: r => <span style={{ color: Number(costParams.vc) > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>{fmt(r.vitCostLoss)}</span> },
              { key: 'chickLoss',    header: 'Chick Loss',     align: 'right',
                render: r => <span style={{ color: 'var(--danger)' }}>{fmt(r.chickLoss)}</span> },
              { key: 'totalLoss',    header: 'Total Loss',     align: 'right',
                render: r => <span style={{ color: 'var(--danger)', fontWeight: 700 }}>{fmt(r.totalLoss)}</span> },
            ]}
            rows={breakdownRows}
            rowKey="batch_id"
          />
          <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={summaryChip}><span style={chipLabel}>Feed Cost Loss</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{fmt(breakdownRows.reduce((s, r) => s + r.feedCostLoss, 0))}</span></div>
            <div style={summaryChip}><span style={chipLabel}>Vitamin Cost Loss</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{fmt(breakdownRows.reduce((s, r) => s + r.vitCostLoss, 0))}</span></div>
            <div style={summaryChip}><span style={chipLabel}>Chick Loss</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{fmt(breakdownRows.reduce((s, r) => s + r.chickLoss, 0))}</span></div>
            <div style={summaryChip}><span style={chipLabel}>Total Mortality Loss</span><span style={{ ...chipValue, color: 'var(--danger)' }}>{fmt(breakdownRows.reduce((s, r) => s + r.totalLoss, 0))}</span></div>
          </div>
          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--text-muted, var(--text-secondary))' }}>
            Feed Cost = FC × AD × D × PF &nbsp;|&nbsp; Vitamin Cost = VC × AD × D × PV &nbsp;|&nbsp; Chick Loss = D × PC &nbsp;|&nbsp; Total = Sum of all three.
            Age at death (AD) is derived per record from record date minus batch placement date.
          </p>
        </Card>
      )}

      {/* Trend chart */}
      <Card title={`Mortality Count — ${trendPeriod} (all batches)`} action={
        <Select options={['Last 7 days', 'Last 30 days']} value={trendPeriod} onChange={e => setTrendPeriod(e.target.value)} />
      }>
        <LineChart data={trendValues} color="var(--viz-mortality)" labels={trendDates.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))} />
      </Card>

      {/* Rates by batch */}
      {rates.length > 0 && (
        <Card title="Mortality Rate by Batch (7-day)">
          <DataTable
            columns={[
              { key: 'batch_no', header: 'Batch', render: r => <BatchLink id={r.batch_id} name={r.batch_no} /> },
              { key: 'house',              header: 'House' },
              { key: 'total_deaths_7d',    header: 'Deaths (7d)',   align: 'right', numeric: true },
              { key: 'current_count',      header: 'Current Birds', align: 'right', numeric: true },
              { key: 'mortality_rate_pct', header: 'Rate %',        align: 'right', numeric: true },
              { key: 'alert',              header: '' },
            ]}
            rows={rates.map(r => ({
              ...r,
              mortality_rate_pct: `${(r.mortality_rate_pct || 0).toFixed(3)}%`,
              alert: r.mortality_rate_pct > 1.5
                ? <Badge tone="danger" dot>High</Badge>
                : <Badge tone="success" dot>Normal</Badge>,
            }))}
            rowKey="batch_id"
          />
        </Card>
      )}

      {/* Mortality Records with Edit / Delete */}
      <Card title="Mortality Records" action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select options={batchOptions} value={batchFilter} onChange={e => setBatchFilter(e.target.value)} />
          <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={() => exportCsv(filteredRows, [
            { key: 'date',        header: 'Date' },
            { key: 'batch',       header: 'Batch' },
            { key: 'house',       header: 'House' },
            { key: 'count',       header: 'Count' },
            { key: 'causeLabel',  header: 'Cause' },
            { key: 'cause_notes', header: 'Notes' },
            { key: 'recorded_by', header: 'Recorded By' },
          ], 'mortality-records.csv')}>Export</Button>
        </div>
      }>
        <DataTable
          columns={[
            { key: 'date',  header: 'Date',  strong: true },
            { key: 'batch', header: 'Batch', render: r => <BatchLink id={r.batch_id} name={r.batch} /> },
            { key: 'house', header: 'House' },
            { key: 'count',        header: 'Count',        align: 'right', numeric: true },
            ...(!isByBird ? [{ key: 'chicken_weight_kg', header: 'Weight (kg)', align: 'right', render: r => r.chicken_weight_kg != null ? `${Number(r.chicken_weight_kg).toFixed(2)} kg` : '—' }] : []),
            { key: 'financialLoss', header: 'Est. Loss', align: 'right', render: r => {
              const hasData = isByBird || r.chicken_weight_kg;
              return hasData ? <span style={{ color: 'var(--danger)' }}>{fmt(r.financialLoss)}</span> : <span style={{ color: 'var(--text-secondary)' }}>—</span>;
            }},
            { key: 'causeLabel',   header: 'Cause',        render: r => <Badge tone={CAUSE_TONE[r.cause] || 'neutral'}>{r.causeLabel}</Badge> },
            { key: 'cause_notes',  header: 'Notes' },
            { key: 'recorded_by',  header: 'Recorded By' },
            { key: '_actions', header: '', render: r => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" icon={<I.pencil w={13} />} onClick={() => openEdit(r)}>Edit</Button>
                <Button variant="ghost" size="sm" icon={<I.trash w={13} />} onClick={() => openDelete(r)} style={{ color: 'var(--danger)' }}>Delete</Button>
              </div>
            )},
          ]}
          rows={filteredRows}
          rowKey="id"
        />
      </Card>

      {/* ── Add Record Modal ── */}
      <Modal open={modal} title="Add Mortality Record" onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel="Save Record" loading={saving}>
        {formErr && <ErrBox>{formErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Batch" required>
            <FieldSelect value={form.batch_id} onChange={f('batch_id')}>
              <option value="">Select batch…</option>
              {batches.filter(b => ['active', 'harvest_soon'].includes(b.status)).map(b => <option key={b.id} value={b.id}>{b.batch_no} — {b.house}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="House" required>
            <FieldSelect value={form.house_id} onChange={f('house_id')}>
              <option value="">Select house…</option>
              {houses.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Date" required>
            <FieldInput type="date" value={form.record_date} onChange={f('record_date')} />
          </FormRow>
          <FormRow label="Count" required>
            <FieldInput type="number" value={form.count} onChange={f('count')} min="1" placeholder="Number of deaths" />
          </FormRow>
          {!isByBird && (
            <FormRow label="Weight per Chicken (kg)">
              <FieldInput type="number" value={form.chicken_weight_kg} onChange={f('chicken_weight_kg')} min="0.01" step="0.01" placeholder="e.g. 1.50" />
            </FormRow>
          )}
          <FormRow label="Cause">
            <FieldSelect value={form.cause} onChange={f('cause')}>
              <option value="unknown">Unknown</option>
              <option value="disease">Disease</option>
              <option value="heat_stress">Heat Stress</option>
              <option value="injury">Injury</option>
              <option value="culling">Culling</option>
              <option value="other">Other</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Notes" style={{ gridColumn: '1 / -1' }}>
            <FieldInput value={form.cause_notes} onChange={f('cause_notes')} placeholder="Optional notes…" />
          </FormRow>
        </div>
        {form.count > 0 && form.batch_id && hasCostParams && (() => {
          const selBatch = batches.find(b => b.id === Number(form.batch_id));
          const ad = selBatch ? getAgeAtDeath(form.record_date, selBatch.placed_date) : 0;
          const bl = calcDetailedMortalityLoss({
            D: Number(form.count) || 0, AD: ad,
            FC: costParams.fc, VC: costParams.vc || 0,
            PF: costParams.pf, PV: costParams.pv || 0, PC: costParams.pc,
          });
          return (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', marginBottom: 8 }}>
                Estimated Mortality Loss — Day {ad}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3, columnGap: 16 }}>
                <span style={{ color: 'var(--text-body)' }}>Feed Cost Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.feedCostLoss)}</span>
                <span style={{ color: 'var(--text-body)' }}>Vitamin Cost Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.vitCostLoss)}</span>
                <span style={{ color: 'var(--text-body)' }}>Chick Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.chickLoss)}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-strong)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>Total Loss</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>{fmt(bl.totalLoss)}</span>
              </div>
            </div>
          );
        })()}
        {form.count > 0 && !hasCostParams && (() => {
          const selBatch = batches.find(b => b.id === Number(form.batch_id));
          const count = Number(form.count) || 0;
          const chickCostPerHead = selBatch?.chick_cost_per_head ? Number(selBatch.chick_cost_per_head) : 0;
          const pf = Number(costParams.pf) || 0;
          const totalFeedKg = Number(selBatch?.total_feed_kg) || 0;
          const initialCount = Math.max(Number(selBatch?.initial_count) || 1, 1);
          const batchAge = Math.max(Number(selBatch?.age_days) || 1, 1);
          const ad = selBatch ? getAgeAtDeath(form.record_date, selBatch.placed_date) : 0;
          const hasChickData = chickCostPerHead > 0;
          const hasFeedData = pf > 0 && totalFeedKg > 0;
          if (!hasChickData && !hasFeedData) {
            if (!isByBird && !form.chicken_weight_kg) return null;
            return (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
                Est. Financial Loss: <b style={{ color: 'var(--danger)' }}>{fmt(calcFinancialLoss(count, parseFloat(form.chicken_weight_kg) || 0, marketPrice, pricingMode))}</b>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>@ ₱{marketPrice}/{isByBird ? 'bird' : 'kg'}</span>
              </div>
            );
          }
          const ageFraction = ad > 0 && batchAge > 0 ? Math.min(ad / batchAge, 1) : 1;
          const feedCostPerBirdAtDeath = hasFeedData ? (totalFeedKg * pf / initialCount) * ageFraction : 0;
          const costPerBird = chickCostPerHead + feedCostPerBirdAtDeath;
          const totalLoss = costPerBird * count;
          return (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', marginBottom: 8 }}>Estimated Mortality Loss — Day {ad}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3, columnGap: 16 }}>
                {hasChickData && <>
                  <span style={{ color: 'var(--text-body)' }}>Chick Cost ({count} × {fmt(chickCostPerHead)}/head)</span>
                  <span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(chickCostPerHead * count)}</span>
                </>}
                {hasFeedData && <>
                  <span style={{ color: 'var(--text-body)' }}>Feed Cost (Day {ad}/{batchAge} × {fmt(totalFeedKg * pf / initialCount)}/bird)</span>
                  <span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(feedCostPerBirdAtDeath * count)}</span>
                </>}
                <span style={{ fontWeight: 700, color: 'var(--text-strong)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>Total Est. Loss</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>{fmt(totalLoss)}</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Edit Record Modal ── */}
      <Modal open={editModal} title="Edit Mortality Record" onClose={() => setEditModal(false)} onConfirm={handleEdit} confirmLabel="Save Changes" loading={editSaving}>
        {editErr && <ErrBox>{editErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Date" required>
            <FieldInput type="date" value={editForm.record_date} onChange={ef('record_date')} />
          </FormRow>
          <FormRow label="Count" required>
            <FieldInput type="number" value={editForm.count} onChange={ef('count')} min="1" />
          </FormRow>
          {!isByBird && (
            <FormRow label="Weight per Chicken (kg)">
              <FieldInput type="number" value={editForm.chicken_weight_kg} onChange={ef('chicken_weight_kg')} min="0.01" step="0.01" placeholder="e.g. 1.50" />
            </FormRow>
          )}
          <FormRow label="Cause">
            <FieldSelect value={editForm.cause} onChange={ef('cause')}>
              <option value="unknown">Unknown</option>
              <option value="disease">Disease</option>
              <option value="heat_stress">Heat Stress</option>
              <option value="injury">Injury</option>
              <option value="culling">Culling</option>
              <option value="other">Other</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Notes" style={{ gridColumn: '1 / -1' }}>
            <FieldInput value={editForm.cause_notes} onChange={ef('cause_notes')} placeholder="Optional notes…" />
          </FormRow>
        </div>
        {editForm.count > 0 && editTarget && hasCostParams && (() => {
          const selBatch = batches.find(b => b.id === editTarget.batch_id);
          const ad = selBatch ? getAgeAtDeath(editForm.record_date, selBatch.placed_date) : 0;
          const bl = calcDetailedMortalityLoss({
            D: Number(editForm.count) || 0, AD: ad,
            FC: costParams.fc, VC: costParams.vc || 0,
            PF: costParams.pf, PV: costParams.pv || 0, PC: costParams.pc,
          });
          return (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', marginBottom: 8 }}>
                Estimated Mortality Loss — Day {ad}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3, columnGap: 16 }}>
                <span style={{ color: 'var(--text-body)' }}>Feed Cost Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.feedCostLoss)}</span>
                <span style={{ color: 'var(--text-body)' }}>Vitamin Cost Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.vitCostLoss)}</span>
                <span style={{ color: 'var(--text-body)' }}>Chick Loss</span><span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(bl.chickLoss)}</span>
                <span style={{ fontWeight: 700, color: 'var(--text-strong)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>Total Loss</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>{fmt(bl.totalLoss)}</span>
              </div>
            </div>
          );
        })()}
        {editForm.count > 0 && !hasCostParams && (() => {
          const selBatch = editTarget ? batches.find(b => b.id === editTarget.batch_id) : null;
          const count = Number(editForm.count) || 0;
          const chickCostPerHead = selBatch?.chick_cost_per_head ? Number(selBatch.chick_cost_per_head) : 0;
          const pf = Number(costParams.pf) || 0;
          const totalFeedKg = Number(selBatch?.total_feed_kg) || 0;
          const initialCount = Math.max(Number(selBatch?.initial_count) || 1, 1);
          const batchAge = Math.max(Number(selBatch?.age_days) || 1, 1);
          const ad = selBatch ? getAgeAtDeath(editForm.record_date, selBatch.placed_date) : 0;
          const hasChickData = chickCostPerHead > 0;
          const hasFeedData = pf > 0 && totalFeedKg > 0;
          if (!hasChickData && !hasFeedData) {
            if (!isByBird && !editForm.chicken_weight_kg) return null;
            return (
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
                Est. Financial Loss: <b style={{ color: 'var(--danger)' }}>{fmt(calcFinancialLoss(count, parseFloat(editForm.chicken_weight_kg) || 0, marketPrice, pricingMode))}</b>
                <span style={{ color: 'var(--text-secondary)', marginLeft: 6 }}>@ ₱{marketPrice}/{isByBird ? 'bird' : 'kg'}</span>
              </div>
            );
          }
          const ageFraction = ad > 0 && batchAge > 0 ? Math.min(ad / batchAge, 1) : 1;
          const feedCostPerBirdAtDeath = hasFeedData ? (totalFeedKg * pf / initialCount) * ageFraction : 0;
          const costPerBird = chickCostPerHead + feedCostPerBirdAtDeath;
          const totalLoss = costPerBird * count;
          return (
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--danger-bg)', borderRadius: 8, fontSize: 13 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-strong)', marginBottom: 8 }}>Estimated Mortality Loss — Day {ad}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 3, columnGap: 16 }}>
                {hasChickData && <>
                  <span style={{ color: 'var(--text-body)' }}>Chick Cost ({count} × {fmt(chickCostPerHead)}/head)</span>
                  <span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(chickCostPerHead * count)}</span>
                </>}
                {hasFeedData && <>
                  <span style={{ color: 'var(--text-body)' }}>Feed Cost (Day {ad}/{batchAge} × {fmt(totalFeedKg * pf / initialCount)}/bird)</span>
                  <span style={{ textAlign: 'right', color: 'var(--danger)' }}>{fmt(feedCostPerBirdAtDeath * count)}</span>
                </>}
                <span style={{ fontWeight: 700, color: 'var(--text-strong)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>Total Est. Loss</span>
                <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--danger)', borderTop: '1px solid rgba(239,68,68,0.25)', paddingTop: 4 }}>{fmt(totalLoss)}</span>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        open={deleteModal}
        title="Delete Mortality Record"
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Delete this record of <b>{deleteTarget?.count} death{deleteTarget?.count !== 1 ? 's' : ''}</b> on <b>{deleteTarget?.date}</b> for batch <b>{deleteTarget?.batch}</b>?<br />
          The batch's live bird count will be automatically recalculated.
        </p>
      </Modal>
    </div>
  );
}

function ErrBox({ children }) {
  return (
    <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
      {children}
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

const summaryChip = { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderRadius: 8, padding: '8px 14px' };
const chipLabel   = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const chipValue   = { fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' };

const paramLabel = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 };
const paramInput = { width: '100%', boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--border-soft)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 13, outline: 'none' };
