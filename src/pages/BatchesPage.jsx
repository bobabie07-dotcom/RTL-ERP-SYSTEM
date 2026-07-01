import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { batchesApi, procurementApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

const STATUS_LABEL = { active: 'Active', harvest_soon: 'Harvest Soon', harvested: 'Harvested', terminated: 'Terminated' };
const STATUS_TONE  = { active: 'success', harvest_soon: 'warning', harvested: 'neutral', terminated: 'danger' };

const TODAY = new Date().toISOString().split('T')[0];
const BLANK_BATCH = { batch_no: '', house_id: '', breed_id: '', placed_date: TODAY, initial_count: '', cycle_length_days: 42, chick_cost_per_head: '', chick_supplier_id: '' };

const ACTION_BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'var(--text-muted)', transition: 'background 0.15s, color 0.15s',
};

export default function BatchesPage() {
  const navigate = useNavigate();
  const { farmId } = useFarm();
  const [batches,      setBatches]      = useState([]);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [houses,       setHouses]       = useState([]);
  const [breeds,       setBreeds]       = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);

  // Add / Edit modal
  const [modal,        setModal]        = useState(false);
  const [editId,       setEditId]       = useState(null);   // null = adding new
  const [form,         setForm]         = useState(BLANK_BATCH);
  const [saving,       setSaving]       = useState(false);
  const [formError,    setFormError]    = useState('');

  // Delete modal
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  useEffect(() => {
    batchesApi.list({ farm_id: farmId })
      .then(setBatches)
      .catch(e => setLoadError(e.message || 'Failed to load batches.'))
      .finally(() => setLoading(false));
    batchesApi.houses({ farm_id: farmId }).then(setHouses).catch(() => {});
    batchesApi.breeds().then(setBreeds).catch(() => {});
    procurementApi.suppliers().then(setSuppliers).catch(() => {});
  }, [farmId]);

  function nextBatchNo() {
    const year = new Date().getFullYear();
    const prefix = `BATCH-${year}-`;
    const used = batches
      .map(b => b.batch_no)
      .filter(n => n.startsWith(prefix))
      .map(n => parseInt(n.slice(prefix.length), 10))
      .filter(n => !isNaN(n));
    const next = used.length ? Math.max(...used) + 1 : 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }

  function openAdd() {
    setEditId(null);
    setForm({ ...BLANK_BATCH, batch_no: nextBatchNo() });
    setFormError('');
    setModal(true);
  }

  function openEdit(r) {
    setEditId(r.id);
    setForm({
      batch_no:            r.batch_no,
      house_id:            String(r.house_id || ''),
      breed_id:            r.breed_id ? String(r.breed_id) : '',
      placed_date:         String(r.placed_date),
      initial_count:       String(r.initial_count),
      cycle_length_days:   String(r.cycle_length_days),
      chick_cost_per_head: r.chick_cost_per_head ? String(r.chick_cost_per_head) : '',
      chick_supplier_id:   r.chick_supplier_id ? String(r.chick_supplier_id) : '',
    });
    setFormError('');
    setModal(true);
  }

  async function handleSave() {
    if (!form.house_id || !form.placed_date || !form.initial_count) {
      setFormError('Please fill in all required fields.'); return;
    }
    setSaving(true); setFormError('');
    try {
      const payload = {
        house_id:          Number(form.house_id),
        breed_id:          form.breed_id ? Number(form.breed_id) : null,
        placed_date:       form.placed_date,
        initial_count:     Number(form.initial_count),
        cycle_length_days: Number(form.cycle_length_days),
      };
      if (editId) {
        await batchesApi.update(editId, {
          ...payload,
          chick_cost_per_head: form.chick_cost_per_head ? Number(form.chick_cost_per_head) : null,
          chick_supplier_id:   form.chick_supplier_id ? Number(form.chick_supplier_id) : null,
        });
      } else {
        await batchesApi.create({
          ...payload,
          batch_no:            form.batch_no,
          farm_id:             farmId,
          chick_cost_per_head: form.chick_cost_per_head ? Number(form.chick_cost_per_head) : null,
          chick_supplier_id:   form.chick_supplier_id ? Number(form.chick_supplier_id) : null,
        });
      }
      const updated = await batchesApi.list({ farm_id: farmId });
      setBatches(updated);
      setModal(false);
    } catch (err) { setFormError(err.message || 'Failed to save batch.'); }
    finally { setSaving(false); }
  }

  function openDelete(r) {
    setDeleteTarget(r);
    setDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await batchesApi.delete(deleteTarget.id);
      setBatches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteModal(false);
    } catch (err) { setLoadError(err.message || 'Failed to delete batch.'); }
    finally { setDeleting(false); }
  }

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const filtered = batches.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch = b.batch_no.toLowerCase().includes(q) || b.house.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All Status' || STATUS_LABEL[b.status] === statusFilter;
    return matchSearch && matchStatus;
  });

  const total        = batches.length;
  const active       = batches.filter((b) => b.status === 'active').length;
  const harvestSoon  = batches.filter((b) => b.status === 'harvest_soon').length;
  const totalBirds   = batches.filter((b) => ['active','harvest_soon'].includes(b.status))
                              .reduce((s, b) => s + (b.current_count || 0), 0);

  const rows = filtered.map((b) => ({
    ...b,
    id:        b.id,
    breed:     b.breed || '—',
    placed:    b.placed_date,
    birds:     (b.current_count || 0).toLocaleString(),
    age:       `${b.age_days}d`,
    mort:      `${(b.mortality_pct || 0).toFixed(2)}%`,
    fcr:       (b.fcr || 0).toFixed(2),
    avgWt:     b.avg_weight_g ? `${(b.avg_weight_g / 1000).toFixed(2)} kg` : '—',
    chickCost: b.chick_cost_per_head != null ? `${Number(b.chick_cost_per_head).toFixed(2)}` : '—',
    statusLabel: STATUS_LABEL[b.status] || b.status,
  }));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}
      <PrintPageHeader title="Batch Management" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Batch Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Track and manage all poultry batches across farms.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PrintButton title="Batch Management" />
          <Button variant="primary" size="md" icon={<I.plus w={16} />} onClick={openAdd}>Add Batch</Button>
        </div>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Batches"  value={loading ? '—' : total}       icon={<I.batch w={22} />} />
        <StatCard label="Active Batches" value={loading ? '—' : active}      icon={<I.birds w={22} />} />
        <StatCard label="Harvest Soon"   value={loading ? '—' : harvestSoon} tone="amber" icon={<I.harvest w={22} />} />
        <StatCard label="Total Birds"    value={loading ? '—' : totalBirds.toLocaleString()} tone="blue" icon={<I.population w={22} />} />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Input placeholder="Search batch or house..." icon={<I.search />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select
            options={['All Status', 'Active', 'Harvest Soon', 'Harvested']}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
          <Button variant="secondary" size="md" icon={<I.download w={15} />} onClick={() => exportCsv(rows, [
            { key: 'batch_no',    header: 'Batch No.' },
            { key: 'house',       header: 'House' },
            { key: 'farm',        header: 'Farm' },
            { key: 'breed',       header: 'Breed' },
            { key: 'placed',      header: 'Date Placed' },
            { key: 'birds',       header: 'Current Birds' },
            { key: 'age',         header: 'Age' },
            { key: 'mort',        header: 'Mortality %' },
            { key: 'fcr',         header: 'FCR' },
            { key: 'avgWt',       header: 'Avg. Weight' },
            { key: 'chickCost',   header: 'Chick Cost/Head' },
            { key: 'statusLabel', header: 'Status' },
          ], 'batches.csv')}>Export CSV</Button>
        </div>
        <DataTable
          columns={[
            { key: 'batch_no', header: 'Batch No.', strong: true, render: (r) => (
              <a href="#" onClick={(e) => { e.preventDefault(); navigate('/batches/' + r.id); }} style={{ fontWeight: 600, color: 'var(--text-brand)' }}>{r.batch_no}</a>
            )},
            { key: 'house',       header: 'House' },
            { key: 'farm',        header: 'Farm' },
            { key: 'breed',       header: 'Breed' },
            { key: 'placed',      header: 'Date Placed' },
            { key: 'birds',       header: 'Birds',          align: 'right', numeric: true },
            { key: 'age',         header: 'Age',            align: 'right' },
            { key: 'mort',        header: 'Mortality %',    align: 'right', numeric: true },
            { key: 'fcr',         header: 'FCR',            align: 'right', numeric: true },
            { key: 'avgWt',       header: 'Avg. Weight',    align: 'right' },
            { key: 'chickCost',   header: 'Chick Cost/Head', align: 'right', numeric: true },
            { key: 'statusLabel', header: 'Status', render: (r) => (
              <Badge tone={STATUS_TONE[r.status] || 'neutral'} dot>{r.statusLabel}</Badge>
            )},
            { key: '_actions', header: '', render: (r) => (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                  style={ACTION_BTN}
                  title="Edit batch"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-body)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <I.pencil w={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDelete(r); }}
                  style={ACTION_BTN}
                  title="Delete batch"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <I.trash w={14} />
                </button>
              </div>
            )},
          ]}
          rows={rows}
          rowKey="id"
        />
      </Card>

      {/* Add / Edit Modal */}
      <Modal
        open={modal}
        title={editId ? 'Edit Batch' : 'Add New Batch'}
        onClose={() => setModal(false)}
        onConfirm={handleSave}
        confirmLabel={editId ? 'Save Changes' : 'Create Batch'}
        loading={saving}
      >
        {formError && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{formError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Batch Number">
            <div style={{ position: 'relative' }}>
              <FieldInput
                value={form.batch_no}
                onChange={f('batch_no')}
                style={editId ? { background: 'var(--bg-subtle)', color: 'var(--text-muted)', cursor: 'default' } : {}}
              />
              {!editId && (
                <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', color: 'var(--green-500)', background: 'var(--green-50)', padding: '2px 7px', borderRadius: 99, pointerEvents: 'none' }}>AUTO</span>
              )}
            </div>
          </FormRow>
          <FormRow label="House" required>
            <FieldSelect value={form.house_id} onChange={f('house_id')}>
              <option value="">Select house…</option>
              {houses.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Breed">
            <FieldSelect value={form.breed_id} onChange={f('breed_id')}>
              <option value="">Select breed…</option>
              {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Date Placed" required>
            <FieldInput type="date" value={form.placed_date} onChange={f('placed_date')} />
          </FormRow>
          <FormRow label="Initial Bird Count" required>
            <FieldInput type="number" value={form.initial_count} onChange={f('initial_count')} placeholder="e.g. 5000" min="1" />
          </FormRow>
          <FormRow label="Cycle Length (days)">
            <FieldInput type="number" value={form.cycle_length_days} onChange={f('cycle_length_days')} min="1" />
          </FormRow>
          <FormRow label="Chick Cost / Head (SAR)">
            <FieldInput type="number" value={form.chick_cost_per_head} onChange={f('chick_cost_per_head')} placeholder="e.g. 4.50" min="0" step="0.01" />
          </FormRow>
          <FormRow label="Chick Supplier">
            <FieldSelect value={form.chick_supplier_id} onChange={f('chick_supplier_id')}>
              <option value="">None</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </FieldSelect>
          </FormRow>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModal}
        title="Delete Batch"
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Are you sure you want to delete batch <b>{deleteTarget?.batch_no}</b>?<br />
          This action cannot be undone and will remove all associated data.
        </p>
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
