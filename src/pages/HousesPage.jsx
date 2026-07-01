import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';

import { farmsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { HouseMaintenanceCard } from '../components/HouseMaintenanceCard';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

const TYPE_LABEL = { broiler: 'Broiler', layer: 'Layer', breeder: 'Breeder', dekalb_white: 'Dekalb White' };
const TYPE_TONE  = { broiler: 'info', layer: 'success', breeder: 'warning', dekalb_white: 'success' };

const BLANK = { name: '', capacity: '', house_type: 'broiler' };

const ACTION_BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'var(--text-muted)', transition: 'background 0.15s, color 0.15s',
};

export default function HousesPage() {
  const { farmId, farms } = useFarm();
  const [houses,  setHouses]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [loadError, setLoadError] = useState('');
  const [modal,     setModal]     = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(BLANK);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  const [maintHouse, setMaintHouse] = useState(null); // house whose maintenance panel is open

  // Delete modal
  const [delModal,  setDelModal]  = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [deleting,  setDeleting]  = useState(false);

  function load() {
    setLoading(true);
    setLoadError('');
    return farmsApi.houses(farmId)
      .then(setHouses)
      .catch(e => setLoadError(e.message || 'Failed to load houses.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [farmId]);

  function openAdd() {
    setEditId(null); setForm(BLANK); setErr(''); setModal(true);
  }

  function openEdit(h) {
    setEditId(h.id);
    setForm({ name: h.name, capacity: String(h.capacity), house_type: h.house_type });
    setErr(''); setModal(true);
  }

  async function handleSave() {
    if (!form.name) { setErr('House name is required.'); return; }
    setSaving(true); setErr('');
    try {
      const payload = { name: form.name, capacity: Number(form.capacity) || 0, house_type: form.house_type };
      if (editId) {
        await farmsApi.updateHouse(farmId, editId, payload);
      } else {
        await farmsApi.createHouse(farmId, payload);
      }
      await load();
      setModal(false);
    } catch (e) { setErr(e.message || 'Failed to save house.'); }
    finally { setSaving(false); }
  }

  async function handleToggleActive(h) {
    try {
      await farmsApi.updateHouse(farmId, h.id, { is_active: !h.is_active });
      await load();
    } catch (e) { setLoadError(e.message || 'Failed to update house status.'); }
  }

  async function handleDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await farmsApi.deleteHouse(farmId, delTarget.id);
      setHouses(prev => prev.filter(h => h.id !== delTarget.id));
      setDelModal(false);
    } catch (e) { setLoadError(e.message || 'Failed to delete house.'); }
    finally { setDeleting(false); }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const currentFarm = farms.find(f => f.id === farmId);

  const cols = [
    { key: 'name',       header: 'House Name', render: r => <b style={{ color: 'var(--text-strong)' }}>{r.name}</b> },
    { key: 'house_type', header: 'Type',       render: r => <Badge tone={TYPE_TONE[r.house_type] || 'neutral'}>{TYPE_LABEL[r.house_type] || r.house_type}</Badge> },
    { key: 'capacity',   header: 'Capacity',   render: r => (r.capacity ?? 0).toLocaleString() + ' birds' },
    { key: 'is_active',  header: 'Status',     render: r => <Badge tone={r.is_active ? 'success' : 'neutral'}>{r.is_active ? 'Active' : 'Inactive'}</Badge> },
    {
      key: 'actions', header: '',
      render: r => (
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            style={{ ...ACTION_BTN, ...(maintHouse?.id === r.id ? { background: 'var(--brand-subtle, rgba(var(--brand-rgb,34,197,94),0.12))', color: 'var(--brand)' } : {}) }}
            title="Repair & Maintenance"
            onClick={() => setMaintHouse(prev => prev?.id === r.id ? null : r)}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--success-bg)'; e.currentTarget.style.color = 'var(--success)'; }}
            onMouseLeave={e => {
              if (maintHouse?.id === r.id) return;
              e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)';
            }}
          >
            <I.wrench w={14} />
          </button>
          <button
            style={ACTION_BTN}
            title="Edit"
            onClick={() => openEdit(r)}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gray-100)'; e.currentTarget.style.color = 'var(--text-strong)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <I.pencil w={14} />
          </button>
          <button
            style={ACTION_BTN}
            title={r.is_active ? 'Deactivate' : 'Activate'}
            onClick={() => handleToggleActive(r)}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--warning-bg)'; e.currentTarget.style.color = 'var(--warning)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {r.is_active ? <I.eye w={14} /> : <I.eyeOff w={14} />}
          </button>
          <button
            style={ACTION_BTN}
            title="Delete"
            onClick={() => { setDelTarget(r); setDelModal(true); }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <I.trash w={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PrintPageHeader title="Poultry Houses" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Poultry Houses</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            Houses for {currentFarm?.name || `Farm #${farmId}`} — switch farms from the sidebar.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <PrintButton title="Poultry Houses" />
          <Button variant="primary" icon={<I.plus w={16} />} onClick={openAdd}>Add House</Button>
        </div>
      </div>

      {loadError && <ErrBanner message={loadError} />}
      <Card>
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading houses…</div>
        ) : (
          <DataTable columns={cols} rows={houses} rowKey="id" />
        )}
      </Card>

      {/* Maintenance panel */}
      {maintHouse && (
        <HouseMaintenanceCard house={maintHouse} farmId={farmId} />
      )}

      {/* Add / Edit modal */}
      <Modal
        open={modal}
        title={editId ? 'Edit House' : 'Add House'}
        onClose={() => setModal(false)}
        onConfirm={handleSave}
        confirmLabel={editId ? 'Save Changes' : 'Create House'}
        loading={saving}
      >
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <FormRow label="House Name" required>
          <FieldInput value={form.name} onChange={f('name')} placeholder="e.g. House A" />
        </FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Type">
            <FieldSelect value={form.house_type} onChange={f('house_type')}>
              <option value="broiler">Broiler</option>
              <option value="layer">Layer</option>
              <option value="breeder">Breeder</option>
              <option value="dekalb_white">Dekalb White</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Capacity (birds)">
            <FieldInput type="number" value={form.capacity} onChange={f('capacity')} placeholder="0" />
          </FormRow>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={delModal}
        title="Delete House"
        onClose={() => setDelModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete House"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>
          Are you sure you want to delete <b style={{ color: 'var(--text-strong)' }}>{delTarget?.name}</b>? This cannot be undone.
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
