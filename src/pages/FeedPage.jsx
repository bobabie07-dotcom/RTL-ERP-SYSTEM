import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { BarChart } from '../charts';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { feedApi, batchesApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';

const I = Icons;

const STOCK_TONE = { ok: 'success', low: 'warning', out_of_stock: 'danger' };

const TODAY = new Date().toISOString().split('T')[0];
const BLANK_ISSUE = { batch_id: '', house_id: '', feed_type_id: '', issue_date: TODAY, qty_kg: '', fcr_snapshot: '' };

export default function FeedPage() {
  const { farmId } = useFarm();
  const [stock,     setStock]     = useState([]);
  const [issues,    setIssues]    = useState([]);
  const [weekly,    setWeekly]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [batches,   setBatches]   = useState([]);
  const [houses,    setHouses]    = useState([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(BLANK_ISSUE);
  const [saving,    setSaving]    = useState(false);
  const [formErr,   setFormErr]   = useState('');
  const [loadError, setLoadError] = useState('');
  const [batchFilter, setBatchFilter] = useState('All Batches');

  function loadFeed() {
    return Promise.all([
      feedApi.stock(),
      feedApi.issues({ limit: 50, farm_id: farmId }),
      feedApi.weekly(farmId),
    ]).then(([s, iss, w]) => { setStock(s || []); setIssues(iss || []); setWeekly(w || []); });
  }

  useEffect(() => {
    loadFeed().catch(e => setLoadError(e.message || 'Failed to load feed data.')).finally(() => setLoading(false));
    batchesApi.list({ farm_id: farmId }).then(setBatches).catch(() => {});
    batchesApi.houses({ farm_id: farmId }).then(setHouses).catch(() => {});
  }, [farmId]);

  function openModal() { setForm(BLANK_ISSUE); setFormErr(''); setModal(true); }

  async function handleSave() {
    if (!form.batch_id || !form.house_id || !form.feed_type_id || !form.qty_kg) {
      setFormErr('Please fill in all required fields.'); return;
    }
    setSaving(true); setFormErr('');
    try {
      await feedApi.createIssue({ ...form, batch_id: Number(form.batch_id), house_id: Number(form.house_id), feed_type_id: Number(form.feed_type_id), qty_kg: parseFloat(form.qty_kg), fcr_snapshot: form.fcr_snapshot ? parseFloat(form.fcr_snapshot) : null });
      await loadFeed();
      setModal(false);
    } catch (err) { setFormErr(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const totalStock     = stock.reduce((s, ft) => s + (ft.qty_on_hand_kg || 0), 0);
  const todayIssues    = issues.filter((i) => i.date === new Date().toISOString().split('T')[0]);
  const todayKg        = todayIssues.reduce((s, i) => s + (i.qty_kg || 0), 0);
  const avgFcr         = issues.length ? (issues.reduce((s, i) => s + (i.fcr_snapshot || 0), 0) / issues.filter(i => i.fcr_snapshot).length || 0) : 0;
  const lowStockCount  = stock.filter((s) => s.stock_status === 'low' || s.stock_status === 'out_of_stock').length;

  const barData   = weekly.map((w) => ({ value: w.total_kg, label2: w.total_kg.toLocaleString(), color: 'var(--viz-feed)' }));
  const barLabels = weekly.map((w) => w.house);

  const tableRows = issues.map((i) => ({
    ...i,
    date:     i.date,
    batch:    i.batch,
    house:    i.house,
    feedType: i.feed_type,
    qty:      (i.qty_kg || 0).toLocaleString(),
    fcr:      i.fcr_snapshot ? parseFloat(i.fcr_snapshot).toFixed(3) : '—',
    recordedBy: i.recorded_by || '—',
  }));

  const filteredIssueRows = batchFilter === 'All Batches'
    ? tableRows
    : tableRows.filter(r => r.batch === batchFilter);

  const batchOptions = ['All Batches', ...Array.from(new Set(issues.map(i => i.batch).filter(Boolean)))];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Feed Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Monitor feed consumption, FCR, and stock levels.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />} onClick={openModal}>Issue Feed</Button>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Feed Stock (kg)" value={loading ? '—' : Math.round(totalStock).toLocaleString()} icon={<I.feed w={22} />} />
        <StatCard label="Today's Consumption (kg)" value={loading ? '—' : Math.round(todayKg).toLocaleString()} tone="amber" icon={<I.box w={22} />} />
        <StatCard label="Average FCR" value={loading ? '—' : (avgFcr || 0).toFixed(2)} tone="blue" icon={<I.scale w={22} />} caption="vs target 1.70" />
        <StatCard label="Low Stock Alerts" value={loading ? '—' : lowStockCount} tone="red" icon={<I.alertTri w={22} />} caption="feed types" />
      </div>

      {/* Stock levels per feed type */}
      <Card title="Feed Stock Levels">
        <DataTable
          columns={[
            { key: 'name',          header: 'Feed Type',     strong: true },
            { key: 'qty_on_hand',   header: 'On Hand (kg)',  align: 'right', numeric: true },
            { key: 'reorder_qty',   header: 'Reorder (kg)',  align: 'right', numeric: true },
            { key: 'avg_daily',     header: 'Avg Daily (kg)',align: 'right', numeric: true },
            { key: 'days_left',     header: 'Days Left',     align: 'right', numeric: true },
            { key: 'status_badge',  header: 'Status' },
          ]}
          rows={stock.map((s) => ({
            ...s,
            qty_on_hand: Math.round(s.qty_on_hand_kg).toLocaleString(),
            reorder_qty: Math.round(s.reorder_qty_kg).toLocaleString(),
            avg_daily:   s.avg_daily_kg ? Math.round(s.avg_daily_kg).toLocaleString() : '—',
            days_left:   s.days_remaining != null ? s.days_remaining : '—',
            status_badge: (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: s.stock_status === 'ok' ? 'var(--success-bg)' : s.stock_status === 'low' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                color: s.stock_status === 'ok' ? 'var(--success)' : s.stock_status === 'low' ? 'var(--warning)' : 'var(--danger)',
              }}>
                {s.stock_status === 'ok' ? 'In Stock' : s.stock_status === 'low' ? 'Low' : 'Out of Stock'}
              </span>
            ),
          }))}
          rowKey="id"
        />
      </Card>

      <Card title="Feed Consumption by House — this week (kg)">
        <BarChart data={barData} labels={barLabels} />
      </Card>

      <Card title="Feed Issue Log" action={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Select options={batchOptions} value={batchFilter} onChange={e => setBatchFilter(e.target.value)} />
          <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={() => exportCsv(filteredIssueRows, [
            { key: 'date',        header: 'Date' },
            { key: 'batch',       header: 'Batch' },
            { key: 'house',       header: 'House' },
            { key: 'feedType',    header: 'Feed Type' },
            { key: 'qty',         header: 'Qty (kg)' },
            { key: 'fcr',         header: 'FCR' },
            { key: 'recordedBy',  header: 'Recorded By' },
          ], 'feed-issues.csv')}>Export</Button>
        </div>
      }>
        <DataTable
          columns={[
            { key: 'date',       header: 'Date',      strong: true },
            { key: 'batch',      header: 'Batch' },
            { key: 'house',      header: 'House' },
            { key: 'feedType',   header: 'Feed Type' },
            { key: 'qty',        header: 'Qty (kg)',  align: 'right', numeric: true },
            { key: 'fcr',        header: 'FCR',       align: 'right', numeric: true },
            { key: 'recordedBy', header: 'Recorded By' },
          ]}
          rows={filteredIssueRows}
          rowKey="id"
        />
      </Card>

      <Modal open={modal} title="Issue Feed" onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel="Record Issue" loading={saving}>
        {formErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{formErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Batch" required>
            <FieldSelect value={form.batch_id} onChange={f('batch_id')}>
              <option value="">Select batch…</option>
              {batches.filter(b => ['active','harvest_soon'].includes(b.status)).map((b) => <option key={b.id} value={b.id}>{b.batch_no} — {b.house}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="House" required>
            <FieldSelect value={form.house_id} onChange={f('house_id')}>
              <option value="">Select house…</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Feed Type" required>
            <FieldSelect value={form.feed_type_id} onChange={f('feed_type_id')}>
              <option value="">Select feed type…</option>
              {stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({Math.round(s.qty_on_hand_kg)} kg left)</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Date" required>
            <FieldInput type="date" value={form.issue_date} onChange={f('issue_date')} />
          </FormRow>
          <FormRow label="Quantity (kg)" required>
            <FieldInput type="number" value={form.qty_kg} onChange={f('qty_kg')} placeholder="e.g. 250" min="0.1" step="0.1" />
          </FormRow>
          <FormRow label="FCR Snapshot">
            <FieldInput type="number" value={form.fcr_snapshot} onChange={f('fcr_snapshot')} placeholder="e.g. 1.72" step="0.001" />
          </FormRow>
        </div>
      </Modal>
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
