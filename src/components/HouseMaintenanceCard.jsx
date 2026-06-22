import React, { useEffect, useState } from 'react';
import { Card } from './data/Card';
import { DataTable } from './data/DataTable';
import { Badge } from './core/Badge';
import { Button } from './core/Button';
import { Modal, FormRow, FieldInput, FieldSelect } from './core/Modal';
import { maintenanceApi } from '../api/client';
import Icons from '../icons';

const I = Icons;

const CATEGORIES = [
  { value: 'roofing',      label: 'Roofing Installations' },
  { value: 'plumbing',     label: 'Plumbing Systems' },
  { value: 'structural',   label: 'Structural Works' },
  { value: 'gutter',       label: 'Concrete Gutter Replacements' },
  { value: 'electrical',   label: 'Electrical' },
  { value: 'dismantling',  label: 'Dismantling Works' },
  { value: 'other',        label: 'Other' },
];

const CAT_LABEL = Object.fromEntries(CATEGORIES.map(c => [c.value, c.label]));

const STATUS_TONE  = { pending: 'warning', in_progress: 'info', completed: 'success' };
const STATUS_LABEL = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };

const TODAY = new Date().toISOString().split('T')[0];
const THIS_YEAR = new Date().getFullYear();

const BLANK = {
  log_date: TODAY, category: 'other', description: '', cost: '',
  status: 'pending', batch_allocated: false,
};

const fmt = n =>
  n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function HouseMaintenanceCard({ house, farmId }) {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState('');

  const [modal,   setModal]   = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const [delModal,  setDelModal]  = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  function load() {
    setLoading(true);
    maintenanceApi.list({ house_id: house.id })
      .then(data => { setLogs(data || []); setErr(''); })
      .catch(e => setErr(e.message || 'Failed to load maintenance logs.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [house.id]);

  function openAdd() {
    setEditId(null); setForm(BLANK); setFormErr(''); setModal(true);
  }

  function openEdit(row) {
    setEditId(row.id);
    setForm({
      log_date:        row.log_date,
      category:        row.category,
      description:     row.description || '',
      cost:            String(row.cost ?? ''),
      status:          row.status,
      batch_allocated: row.batch_allocated,
    });
    setFormErr(''); setModal(true);
  }

  async function handleSave() {
    if (!form.log_date || !form.category) {
      setFormErr('Date and category are required.'); return;
    }
    setSaving(true); setFormErr('');
    try {
      const payload = {
        log_date:        form.log_date,
        category:        form.category,
        description:     form.description || null,
        cost:            parseFloat(form.cost) || 0,
        status:          form.status,
        batch_allocated: form.batch_allocated,
      };
      if (editId) {
        await maintenanceApi.update(editId, payload);
      } else {
        await maintenanceApi.create({ ...payload, house_id: house.id, farm_id: farmId });
      }
      await load();
      setModal(false);
    } catch (e) { setFormErr(e.message || 'Failed to save.'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await maintenanceApi.delete(delTarget.id);
      await load();
      setDelModal(false);
    } catch (e) { setErr(e.message || 'Failed to delete.'); }
    finally { setDeleting(false); }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Derived summary ────────────────────────────────────────────────────────
  const ytdLogs     = logs.filter(l => new Date(l.log_date).getFullYear() === THIS_YEAR && l.status === 'completed');
  const totalYtd    = ytdLogs.reduce((s, l) => s + parseFloat(l.cost || 0), 0);
  const pendingCount = logs.filter(l => l.status === 'pending').length;

  const actionBtn = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: 'transparent', color: 'var(--text-muted)', transition: 'background 0.15s, color 0.15s',
  };

  return (
    <>
      <Card
        title={`Repair & Maintenance — ${house.name}`}
        action={<Button variant="primary" size="sm" icon={<I.plus w={15} />} onClick={openAdd}>Add Record</Button>}
      >
        {/* Summary chips */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={chip}>
            <span style={chipLabel}>Total Maintenance YTD</span>
            <span style={{ ...chipValue, color: totalYtd > 0 ? 'var(--danger)' : 'var(--text-strong)' }}>
              {fmt(totalYtd)}
            </span>
          </div>
          <div style={chip}>
            <span style={chipLabel}>Pending Repairs</span>
            <span style={{ ...chipValue, color: pendingCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {pendingCount}
            </span>
          </div>
        </div>

        {err && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
            {err}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>Loading…</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No maintenance records yet. Click <b>Add Record</b> to get started.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'log_date',    header: 'Date',        strong: true },
              { key: 'category',    header: 'Category',    render: r => CAT_LABEL[r.category] || r.category },
              { key: 'description', header: 'Description', render: r => r.description || '—' },
              { key: 'cost',        header: 'Cost',        align: 'right', render: r => <span style={{ fontWeight: 600 }}>{fmt(r.cost)}</span> },
              { key: 'status',      header: 'Status',      render: r => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
              { key: 'batch_allocated', header: 'Batch Alloc.', render: r =>
                r.batch_allocated
                  ? <Badge tone="info">Allocated</Badge>
                  : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
              },
              { key: '_actions', header: '', render: r => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <button style={actionBtn} title="Edit" onClick={() => openEdit(r)}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.color = 'var(--text-strong)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                    <I.pencil w={13} />
                  </button>
                  <button style={actionBtn} title="Delete" onClick={() => { setDelTarget(r); setDelModal(true); }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>
                    <I.trash w={13} />
                  </button>
                </div>
              )},
            ]}
            rows={logs}
            rowKey="id"
          />
        )}
      </Card>

      {/* Add / Edit modal */}
      <Modal
        open={modal}
        title={editId ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
        onClose={() => setModal(false)}
        onConfirm={handleSave}
        confirmLabel={editId ? 'Save Changes' : 'Save Record'}
        loading={saving}
        width={520}
      >
        {formErr && (
          <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
            {formErr}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Date" required>
            <FieldInput type="date" value={form.log_date} onChange={f('log_date')} />
          </FormRow>
          <FormRow label="Status">
            <FieldSelect value={form.status} onChange={f('status')}>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Category" required style={{ gridColumn: '1 / -1' }}>
            <FieldSelect value={form.category} onChange={f('category')}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Description" style={{ gridColumn: '1 / -1' }}>
            <textarea
              value={form.description}
              onChange={f('description')}
              placeholder="Describe the repair or maintenance work…"
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '8px 12px',
                borderRadius: 8, border: '1px solid var(--border-soft)',
                background: 'var(--surface)', color: 'var(--text-strong)',
                fontSize: 14, fontFamily: 'var(--font-body)', resize: 'vertical',
                outline: 'none', lineHeight: 1.5,
              }}
            />
          </FormRow>
          <FormRow label="Cost (₱)">
            <FieldInput type="number" value={form.cost} onChange={f('cost')} min="0" step="0.01" placeholder="0.00" />
          </FormRow>
          <FormRow label=" " style={{ display: 'flex', alignItems: 'center', paddingTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-body)', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={form.batch_allocated}
                onChange={e => setForm(p => ({ ...p, batch_allocated: e.target.checked }))}
                style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }}
              />
              Allocate cost to current active batch
            </label>
          </FormRow>
        </div>
        {form.status === 'completed' && parseFloat(form.cost) > 0 && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--success-bg)', borderRadius: 8, fontSize: 13, color: 'var(--success)' }}>
            <b>{fmt(parseFloat(form.cost))}</b> will be recorded as an expense
            {form.batch_allocated ? ' and allocated to the active batch.' : ' under Farm Overhead.'}
          </div>
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={delModal}
        title="Delete Maintenance Record"
        onClose={() => setDelModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Delete the <b>{CAT_LABEL[delTarget?.category]}</b> record from <b>{delTarget?.log_date}</b>?
          {delTarget?.expense_id && (
            <><br /><span style={{ color: 'var(--text-secondary)' }}>The linked expense entry will also be removed.</span></>
          )}
        </p>
      </Modal>
    </>
  );
}

const chip      = { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface-raised, rgba(0,0,0,0.03))', borderRadius: 8, padding: '8px 16px', minWidth: 160 };
const chipLabel = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const chipValue = { fontSize: 20, fontWeight: 700, color: 'var(--text-strong)' };
