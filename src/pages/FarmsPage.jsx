import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { StatCard } from '../components/data/StatCard';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput } from '../components/core/Modal';
import { farmsApi, reportsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';

const I = Icons;

const BLANK = { name: '', name_ar: '', location: '' };

const fmt = n =>
  n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pnlColor = n => n == null ? 'var(--text-body)' : n >= 0 ? 'var(--success)' : 'var(--danger)';

export default function FarmsPage() {
  const { farms, farmId, selectFarm, reloadFarms } = useFarm();
  const [local,   setLocal]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const [err,       setErr]       = useState('');
  const [loadError, setLoadError] = useState('');

  const [delModal,  setDelModal]  = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  const [finances,    setFinances]    = useState(null);
  const [finLoading,  setFinLoading]  = useState(false);

  function load() {
    return farmsApi.list().then(list => { setLocal(list); reloadFarms(); }).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!farmId) return;
    setFinLoading(true);
    reportsApi.farmFinances(farmId)
      .then(setFinances)
      .catch(() => setFinances(null))
      .finally(() => setFinLoading(false));
  }, [farmId]);

  function openAdd() {
    setEditId(null); setForm(BLANK); setErr(''); setModal(true);
  }

  function openEdit(f) {
    setEditId(f.id);
    setForm({ name: f.name, name_ar: f.name_ar || '', location: f.location || '' });
    setErr(''); setModal(true);
  }

  async function handleSave() {
    if (!form.name) { setErr('Farm name is required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: form.name, name_ar: form.name_ar || null, location: form.location || null };
      if (editId) {
        await farmsApi.update(editId, payload);
      } else {
        const created = await farmsApi.create(payload);
        selectFarm(created.id);
      }
      await load();
      setModal(false);
    } catch (e) { setErr(e.message || 'Failed to save farm.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await farmsApi.delete(delTarget.id);
      setDelModal(false);
      await load();
    } catch (e) { setLoadError(e.message || 'Failed to delete farm.'); }
    finally { setDeleting(false); }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const activeFarm = local.find(x => x.id === farmId);
  const finTitle   = activeFarm
    ? `Farm Finances — ${activeFarm.name} (${finances?.year ?? '…'})`
    : 'Farm Finances';

  const cols = [
    { key: 'id',       header: '#',           render: r => r.id },
    { key: 'name',     header: 'Farm Name',   render: r => <b style={{ color: 'var(--text-strong)' }}>{r.name}</b> },
    { key: 'name_ar',  header: 'Local Name',   render: r => r.name_ar || '—' },
    { key: 'location', header: 'Location',    render: r => r.location || '—' },
    {
      key: 'actions', header: '',
      render: r => (
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => openEdit(r)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-brand)', fontWeight: 600, fontSize: 13 }}
          >
            Edit
          </button>
          <button
            onClick={() => { setDelTarget(r); setDelModal(true); }}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600, fontSize: 13 }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>⚠ {loadError}</div>}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Farm Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage all farms registered in the system.</p>
        </div>
        <Button variant="primary" icon={<I.plus w={16} />} onClick={openAdd}>Add Farm</Button>
      </div>

      <Card>
        <DataTable columns={cols} rows={local} rowKey="id" />
      </Card>

      {/* ── Farm Finances ─────────────────────────────────────────── */}
      <Card title={finTitle}>
        {finLoading ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Loading finances…</p>
        ) : !finances ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
            {farmId ? 'No financial data available for this farm.' : 'Select a farm to view finances.'}
          </p>
        ) : (
          <>
            {/* YTD Revenue / Expense / Profit row */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
              <div style={kpiBox}>
                <span style={kpiLabel}>Revenue YTD</span>
                <span style={{ ...kpiValue, color: 'var(--success)' }}>{fmt(finances.revenue_ytd)}</span>
                <span style={kpiSub}>Sales (non-cancelled)</span>
              </div>
              <div style={kpiBox}>
                <span style={kpiLabel}>Expenses YTD</span>
                <span style={{ ...kpiValue, color: 'var(--danger)' }}>{fmt(finances.expenses_ytd)}</span>
                <span style={kpiSub}>Feed + operational</span>
              </div>
              <div style={kpiBox}>
                <span style={kpiLabel}>Net Profit YTD</span>
                <span style={{ ...kpiValue, color: pnlColor(finances.net_profit_ytd) }}>{fmt(finances.net_profit_ytd)}</span>
                <span style={kpiSub}>Revenue − Expenses</span>
              </div>
            </div>

            {/* Active flock / mortality row */}
            <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={kpiBox}>
                <span style={kpiLabel}>Active Batches</span>
                <span style={kpiValue}>{finances.active_batches}</span>
                <span style={kpiSub}>active / harvest soon</span>
              </div>
              <div style={kpiBox}>
                <span style={kpiLabel}>Current Flock</span>
                <span style={kpiValue}>{finances.active_birds.toLocaleString()}</span>
                <span style={kpiSub}>from {finances.initial_birds.toLocaleString()} placed</span>
              </div>
              <div style={kpiBox}>
                <span style={kpiLabel}>Total Deaths</span>
                <span style={{ ...kpiValue, color: 'var(--danger)' }}>{finances.total_deaths.toLocaleString()}</span>
                <span style={kpiSub}>active batches only</span>
              </div>
              <div style={kpiBox}>
                <span style={kpiLabel}>Mortality Cost</span>
                <span style={{ ...kpiValue, color: 'var(--danger)' }}>{fmt(finances.mortality_cost)}</span>
                <span style={kpiSub}>investment lost to deaths</span>
              </div>
            </div>

            <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Feed costed at ₱{finances.feed_price_used}/kg (avg. from purchases). Expenses include feed + recorded operational costs for {finances.year}.
            </p>
          </>
        )}
      </Card>

      <Modal
        open={modal}
        title={editId ? 'Edit Farm' : 'Add Farm'}
        onClose={() => setModal(false)}
        onConfirm={handleSave}
        confirmLabel={editId ? 'Save Changes' : 'Create Farm'}
        loading={saving}
      >
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <FormRow label="Farm Name" required>
          <FieldInput value={form.name} onChange={f('name')} placeholder="e.g. RTL Main Farm" />
        </FormRow>
        <FormRow label="Local / Filipino Name">
          <FieldInput value={form.name_ar} onChange={f('name_ar')} placeholder="e.g. Bukid ng Pamilya" />
        </FormRow>
        <FormRow label="Location">
          <FieldInput value={form.location} onChange={f('location')} placeholder="City, Region" />
        </FormRow>
      </Modal>

      <Modal
        open={delModal}
        title="Delete Farm"
        onClose={() => setDelModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete Farm"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Are you sure you want to delete <b style={{ color: 'var(--text-strong)' }}>{delTarget?.name}</b>?<br />
          This will also remove all houses under this farm and cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

const kpiBox = {
  background: 'var(--surface-raised, rgba(0,0,0,0.03))',
  borderRadius: 10,
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};
const kpiLabel = { fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const kpiValue = { fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1.3 };
const kpiSub   = { fontSize: 12, color: 'var(--text-muted, var(--text-secondary))' };
