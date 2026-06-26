import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Button } from '../components/core/Button';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { BarChart } from '../charts';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { feedApi, batchesApi, inventoryApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';

const LAYER_GUIDE = [
  { week: '1',     bw: 65,    budget: '10',      feed: 'Chick Booster',                phase: 'booster',  remarks: 'Chick arrival — provide vitamins & electrolytes in water' },
  { week: '2',     bw: 120,   budget: '16',      feed: 'Chick Booster + Chick Starter',phase: 'booster',  remarks: 'Beak trimming (day 6–10); give multivitamins after' },
  { week: '3',     bw: 180,   budget: '22',      feed: 'Chick Starter',                phase: 'starter',  remarks: '1st Newcastle Disease + Infectious Bronchitis vaccination' },
  { week: '4',     bw: 250,   budget: '28',      feed: 'Chick Starter',                phase: 'starter',  remarks: '—' },
  { week: '5',     bw: 331,   budget: '33',      feed: 'Chick Starter',                phase: 'starter',  remarks: '1st Fowl Pox vaccination' },
  { week: '6',     bw: 418,   budget: '39',      feed: 'Chick Starter',                phase: 'starter',  remarks: '—' },
  { week: '7',     bw: 508,   budget: '43',      feed: 'Chick Starter',                phase: 'starter',  remarks: '1st Deworming; give multivitamins on deworming day' },
  { week: '8',     bw: 597,   budget: '48',      feed: 'Chick Starter + Chick Grower', phase: 'starter',  remarks: '2nd Newcastle Disease vaccination; plain water 3 days after' },
  { week: '9',     bw: 682,   budget: '52',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '10',    bw: 763,   budget: '55',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '11',    bw: 841,   budget: '58',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '12',    bw: 915,   budget: '61',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '2nd Deworming; give multivitamins on deworming day' },
  { week: '13',    bw: 986,   budget: '64',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '14',    bw: 1055,  budget: '67',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '15',    bw: 1122,  budget: '69',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '—' },
  { week: '16',    bw: 1190,  budget: '73',      feed: 'Chick Grower',                 phase: 'grower',   remarks: '3rd Newcastle Disease booster vaccination' },
  { week: '17',    bw: 1260,  budget: '77',      feed: 'Pre-Lay',                      phase: 'prelay',   remarks: 'Transfer to laying house; begin pre-lay preparation' },
  { week: '18',    bw: 1329,  budget: '81',      feed: 'Pre-Lay',                      phase: 'prelay',   remarks: 'Monitor body weight; supplement calcium; 3rd Deworming' },
  { week: '19',    bw: 1393,  budget: '85',      feed: 'Chicken Layer',                phase: 'layer',    remarks: 'Laying period begins; increase feed gradually' },
  { week: '20',    bw: 1448,  budget: '92',      feed: 'Chicken Layer',                phase: 'layer',    remarks: '—' },
  { week: '21',    bw: 1496,  budget: '97',      feed: 'Chicken Layer',                phase: 'layer',    remarks: '—' },
  { week: '22',    bw: 1537,  budget: '99',      feed: 'Chicken Layer',                phase: 'layer',    remarks: '—' },
  { week: '23-up', bw: 1571,  budget: '100–109', feed: 'Chicken Layer',                phase: 'layer',    remarks: 'Maintain full feed; monitor egg production & FCR' },
];

const PHASE_STYLE = {
  booster: { bg: '#fef9c3', color: '#854d0e', label: 'Booster' },
  starter: { bg: '#dcfce7', color: '#166534', label: 'Starter' },
  grower:  { bg: '#d1fae5', color: '#065f46', label: 'Grower'  },
  prelay:  { bg: '#ede9fe', color: '#5b21b6', label: 'Pre-Lay' },
  layer:   { bg: '#dbeafe', color: '#1e40af', label: 'Layer'   },
};

const I = Icons;

const STOCK_TONE = { ok: 'success', low: 'warning', out_of_stock: 'danger' };

const TODAY = new Date().toISOString().split('T')[0];
const BLANK_ISSUE    = { batch_id: '', house_id: '', feed_type_id: '', issue_date: TODAY, qty_kg: '', fcr_snapshot: '' };
const BLANK_PURCHASE = { feed_type_id: '', supplier_id: '', purchase_date: TODAY, qty_kg: '', cost_per_kg: '', invoice_no: '' };

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
  const [guideOpen, setGuideOpen] = useState(false);

  // purchases
  const [purchases,    setPurchases]    = useState([]);
  const [purchaseModal,setPurchaseModal]= useState(false);
  const [purchaseForm, setPurchaseForm] = useState(BLANK_PURCHASE);
  const [purchaseErr,  setPurchaseErr]  = useState('');
  const [suppliers,    setSuppliers]    = useState([]);

  // link to inventory
  const [linkModal,    setLinkModal]    = useState(false);
  const [linkTarget,   setLinkTarget]   = useState(null); // { id, name }
  const [linkItemId,   setLinkItemId]   = useState('');
  const [invItems,     setInvItems]     = useState([]);
  const [linkSaving,   setLinkSaving]   = useState(false);

  function loadFeed() {
    return Promise.all([
      feedApi.stock(),
      feedApi.issues({ limit: 50, farm_id: farmId }),
      feedApi.weekly(farmId),
      feedApi.purchases({ limit: 50 }),
    ]).then(([s, iss, w, p]) => { setStock(s || []); setIssues(iss || []); setWeekly(w || []); setPurchases(p || []); });
  }

  useEffect(() => {
    loadFeed().catch(e => setLoadError(e.message || 'Failed to load feed data.')).finally(() => setLoading(false));
    batchesApi.list({ farm_id: farmId }).then(setBatches).catch(() => {});
    batchesApi.houses({ farm_id: farmId }).then(setHouses).catch(() => {});
    inventoryApi.items({ farm_id: farmId }).then(setInvItems).catch(() => {});
    inventoryApi.suppliers().then(setSuppliers).catch(() => {});
  }, [farmId]);

  // inline add feed type
  const [addTypeOpen,   setAddTypeOpen]   = useState(false);
  const [newTypeName,   setNewTypeName]   = useState('');
  const [newTypeSaving, setNewTypeSaving] = useState(false);
  const [newTypeErr,    setNewTypeErr]    = useState('');

  async function handleAddFeedType() {
    if (!newTypeName.trim()) { setNewTypeErr('Feed type name is required.'); return; }
    setNewTypeSaving(true); setNewTypeErr('');
    try {
      const created = await feedApi.createFeedType({ name: newTypeName.trim() });
      await loadFeed();
      setForm(p => ({ ...p, feed_type_id: String(created.id) }));
      setAddTypeOpen(false);
      setNewTypeName('');
    } catch (e) { setNewTypeErr(e.message || 'Failed to add feed type.'); }
    finally { setNewTypeSaving(false); }
  }

  function openModal() {
    setForm(BLANK_ISSUE); setFormErr('');
    setAddTypeOpen(false); setNewTypeName(''); setNewTypeErr('');
    setModal(true);
  }

  function openPurchaseModal() {
    setPurchaseForm(BLANK_PURCHASE); setPurchaseErr('');
    setAddTypeOpen(false); setNewTypeName(''); setNewTypeErr('');
    setPurchaseModal(true);
  }

  async function handlePurchaseSave() {
    const pf = purchaseForm;
    if (!pf.feed_type_id || !pf.qty_kg || !pf.cost_per_kg || !pf.purchase_date) {
      setPurchaseErr('Feed type, quantity, cost, and date are required.'); return;
    }
    setSaving(true); setPurchaseErr('');
    try {
      await feedApi.createPurchase({
        feed_type_id:  Number(pf.feed_type_id),
        supplier_id:   pf.supplier_id ? Number(pf.supplier_id) : null,
        purchase_date: pf.purchase_date,
        qty_kg:        parseFloat(pf.qty_kg),
        cost_per_kg:   parseFloat(pf.cost_per_kg),
        invoice_no:    pf.invoice_no || null,
      });
      await loadFeed();
      setPurchaseModal(false);
    } catch (err) { setPurchaseErr(err.message || 'Failed to save purchase.'); }
    finally { setSaving(false); }
  }

  function openLinkModal(stockRow) {
    setLinkTarget(stockRow);
    setLinkItemId(stockRow.inventory_item_id ? String(stockRow.inventory_item_id) : '');
    setLinkModal(true);
  }

  async function handleLinkSave() {
    setLinkSaving(true);
    try {
      if (linkItemId) {
        await feedApi.linkInventory(linkTarget.id, Number(linkItemId));
      } else {
        await feedApi.unlinkInventory(linkTarget.id);
      }
      await loadFeed();
      setLinkModal(false);
    } catch (err) { alert(err.message || 'Failed to save link.'); }
    finally { setLinkSaving(false); }
  }

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
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="md" icon={<I.box w={16} />} onClick={openPurchaseModal}>Record Purchase</Button>
          <Button variant="primary"   size="md" icon={<I.plus w={16} />} onClick={openModal}>Issue Feed</Button>
        </div>
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
            { key: 'name',          header: 'Feed Type',      strong: true },
            { key: 'qty_on_hand',   header: 'On Hand (kg)',   align: 'right', numeric: true },
            { key: 'reorder_qty',   header: 'Reorder (kg)',   align: 'right', numeric: true },
            { key: 'avg_daily',     header: 'Avg Daily (kg)', align: 'right', numeric: true },
            { key: 'days_left',     header: 'Days Left',      align: 'right', numeric: true },
            { key: 'status_badge',  header: 'Status' },
            { key: 'inv_link',      header: 'Inventory Link' },
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
            inv_link: s.inventory_item_id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1e40af' }}>
                  ✓ {s.inventory_item_name || `Item #${s.inventory_item_id}`}
                </span>
                <button onClick={() => openLinkModal(s)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px', borderRadius: 4 }}>change</button>
              </div>
            ) : (
              <button onClick={() => openLinkModal(s)} style={{ border: '1px dashed var(--border)', background: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--text-muted)', padding: '3px 10px', borderRadius: 6 }}>
                + Link to Inventory
              </button>
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

      {/* Feed Purchase Log */}
      <Card title="Feed Purchase Log" action={
        <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={() => exportCsv(purchases, [
          { key: 'purchase_date', header: 'Date' },
          { key: 'feed_type',     header: 'Feed Type' },
          { key: 'supplier',      header: 'Supplier' },
          { key: 'qty_kg',        header: 'Qty (kg)' },
          { key: 'cost_per_kg',   header: 'Cost/kg' },
          { key: 'total_cost',    header: 'Total Cost' },
          { key: 'invoice_no',    header: 'Invoice No' },
        ], 'feed-purchases.csv')}>Export</Button>
      }>
        <DataTable
          columns={[
            { key: 'purchase_date', header: 'Date',       strong: true },
            { key: 'feed_type',     header: 'Feed Type' },
            { key: 'supplier',      header: 'Supplier' },
            { key: 'qty_kg',        header: 'Qty (kg)',   align: 'right', numeric: true },
            { key: 'cost_per_kg',   header: 'Cost/kg',    align: 'right', numeric: true },
            { key: 'total_cost',    header: 'Total Cost', align: 'right', numeric: true },
            { key: 'invoice_no',    header: 'Invoice No' },
          ]}
          rows={purchases.map(p => ({
            ...p,
            qty_kg:     Number(p.qty_kg).toLocaleString(),
            cost_per_kg:Number(p.cost_per_kg).toFixed(2),
            total_cost: Number(p.total_cost).toLocaleString(undefined, { minimumFractionDigits: 2 }),
            supplier:   p.supplier   || '—',
            invoice_no: p.invoice_no || '—',
          }))}
          rowKey="id"
        />
      </Card>

      {/* Layer Feeding Guide */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--white)' }}>
        <button
          onClick={() => setGuideOpen(v => !v)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', gap: 12 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <I.feed w={18} style={{ color: 'var(--text-brand)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--text-strong)' }}>
              Layer Feeding Guide
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>Unifeeds Program — Week 1 to 23+</span>
          </div>
          <span style={{ fontSize: 18, color: 'var(--text-muted)', lineHeight: 1, transform: guideOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }}>▾</span>
        </button>

        {guideOpen && (
          <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {/* Phase legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--gray-50)' }}>
              {Object.entries(PHASE_STYLE).map(([k, s]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
                  {s.label}
                </span>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center', marginLeft: 4 }}>— feed phase color coding</span>
            </div>

            {/* Notes */}
            <div style={{ padding: '10px 20px', background: '#fffbeb', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, color: '#78350f', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <strong>Notes:</strong>
              <span>1. Give Vitamin C 3 days before every vaccination and multi-vitamins.</span>
              <span>2. Under normal conditions, plain water is advised 3 consecutive days after vaccination.</span>
              <span>3. Give multi-vitamins on the day during deworming until 3 consecutive days.</span>
              <span style={{ fontStyle: 'italic' }}>* Please consult your veterinarian for vaccination and medication programs.</span>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#7c3b1e', color: '#fff' }}>
                    {['Week', 'Body Weight Avg (g)', 'Daily Feed Budget (g/head)', 'Feed Type', 'Remarks'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Week' || h === 'Body Weight Avg (g)' || h === 'Daily Feed Budget (g/head)' ? 'center' : 'left', fontWeight: 700, fontSize: 12, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {LAYER_GUIDE.map((row, i) => {
                    const ps = PHASE_STYLE[row.phase];
                    return (
                      <tr key={row.week} style={{ background: i % 2 === 0 ? 'var(--white)' : 'var(--gray-50)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-strong)', fontSize: 13 }}>{row.week}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.bw.toLocaleString()}</td>
                        <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text-strong)' }}>{row.budget}</td>
                        <td style={{ padding: '9px 14px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: ps.bg, color: ps.color, whiteSpace: 'nowrap' }}>
                            {row.feed}
                          </span>
                        </td>
                        <td style={{ padding: '9px 14px', color: row.remarks === '—' ? 'var(--text-muted)' : 'var(--text-secondary)', fontStyle: row.remarks === '—' ? 'normal' : 'normal' }}>
                          {row.remarks !== '—' && (
                            <span style={{ display: 'inline-block', marginRight: 6, color: '#ca8a04' }}>●</span>
                          )}
                          {row.remarks}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Record Purchase Modal */}
      <Modal open={purchaseModal} title="Record Feed Purchase" onClose={() => setPurchaseModal(false)} onConfirm={handlePurchaseSave} confirmLabel="Save Purchase" loading={saving}>
        {purchaseErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{purchaseErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Feed Type" required style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <FieldSelect value={purchaseForm.feed_type_id} onChange={e => setPurchaseForm(p => ({ ...p, feed_type_id: e.target.value }))} style={{ flex: 1 }}>
                <option value="">Select feed type…</option>
                {stock.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FieldSelect>
              <button
                type="button"
                onClick={() => { setAddTypeOpen(o => !o); setNewTypeErr(''); }}
                style={{ flexShrink: 0, height: 36, padding: '0 12px', border: '1px dashed var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {addTypeOpen ? '✕ Cancel' : '+ New Type'}
              </button>
            </div>
            {addTypeOpen && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>New Feed Type</div>
                {newTypeErr && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{newTypeErr}</div>}
                <FormRow label="Feed Type Name" required>
                  <FieldInput value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Starter Pro, Layer Mash…" />
                </FormRow>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" onClick={handleAddFeedType} disabled={newTypeSaving}>
                    {newTypeSaving ? 'Saving…' : 'Add Feed Type'}
                  </Button>
                </div>
              </div>
            )}
          </FormRow>
          <FormRow label="Supplier">
            <FieldSelect value={purchaseForm.supplier_id} onChange={e => setPurchaseForm(p => ({ ...p, supplier_id: e.target.value }))}>
              <option value="">No supplier</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Purchase Date" required>
            <FieldInput type="date" value={purchaseForm.purchase_date} onChange={e => setPurchaseForm(p => ({ ...p, purchase_date: e.target.value }))} />
          </FormRow>
          <FormRow label="Invoice No">
            <FieldInput value={purchaseForm.invoice_no} onChange={e => setPurchaseForm(p => ({ ...p, invoice_no: e.target.value }))} placeholder="e.g. INV-2026-001" />
          </FormRow>
          <FormRow label="Quantity (kg)" required>
            <FieldInput type="number" value={purchaseForm.qty_kg} onChange={e => setPurchaseForm(p => ({ ...p, qty_kg: e.target.value }))} placeholder="e.g. 500" min="0.1" step="0.1" />
          </FormRow>
          <FormRow label="Cost per kg" required>
            <FieldInput type="number" value={purchaseForm.cost_per_kg} onChange={e => setPurchaseForm(p => ({ ...p, cost_per_kg: e.target.value }))} placeholder="e.g. 28.50" step="0.01" />
          </FormRow>
        </div>
        {purchaseForm.qty_kg && purchaseForm.cost_per_kg && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 8, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
            Total Cost: {(parseFloat(purchaseForm.qty_kg || 0) * parseFloat(purchaseForm.cost_per_kg || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </div>
        )}
        {stock.find(s => s.id === Number(purchaseForm.feed_type_id))?.inventory_item_id && (
          <div style={{ marginTop: 8, padding: '8px 14px', background: '#dbeafe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
            This feed type is linked to inventory — stock will be updated automatically.
          </div>
        )}
      </Modal>

      {/* Link to Inventory Modal */}
      <Modal open={linkModal} title={`Link "${linkTarget?.name}" to Inventory`} onClose={() => setLinkModal(false)} onConfirm={handleLinkSave} confirmLabel="Save Link" loading={linkSaving}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Select an inventory item to sync with. When feed is issued or purchased, the linked inventory item qty will update automatically.
        </p>
        <FormRow label="Inventory Item">
          <FieldSelect value={linkItemId} onChange={e => setLinkItemId(e.target.value)}>
            <option value="">— Remove link / No link —</option>
            {invItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.qty_on_hand} {i.unit} on hand)</option>)}
          </FieldSelect>
        </FormRow>
        {linkTarget?.inventory_item_id && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
            Currently linked to: <strong>{linkTarget.inventory_item_name || `Item #${linkTarget.inventory_item_id}`}</strong>
          </div>
        )}
      </Modal>

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
          <FormRow label="Feed Type" required style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <FieldSelect value={form.feed_type_id} onChange={f('feed_type_id')} style={{ flex: 1 }}>
                <option value="">Select feed type…</option>
                {stock.map((s) => <option key={s.id} value={s.id}>{s.name} ({Math.round(s.qty_on_hand_kg)} kg left)</option>)}
              </FieldSelect>
              <button
                type="button"
                onClick={() => { setAddTypeOpen(o => !o); setNewTypeErr(''); }}
                style={{ flexShrink: 0, height: 36, padding: '0 12px', border: '1px dashed var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {addTypeOpen ? '✕ Cancel' : '+ New Type'}
              </button>
            </div>
            {addTypeOpen && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>New Feed Type</div>
                {newTypeErr && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{newTypeErr}</div>}
                <FormRow label="Feed Type Name" required>
                  <FieldInput
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    placeholder="e.g. Starter Pro, Layer Mash…"
                  />
                </FormRow>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" onClick={handleAddFeedType} disabled={newTypeSaving}>
                    {newTypeSaving ? 'Saving…' : 'Add Feed Type'}
                  </Button>
                </div>
              </div>
            )}
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
