import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { StatCard } from '../components/data/StatCard';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { inventoryApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE  = { in_stock: 'success', low_stock: 'warning', out_of_stock: 'danger' };
const STATUS_LABEL = { in_stock: 'In Stock', low_stock: 'Low Stock', out_of_stock: 'Out of Stock' };

const ACTION_BTN = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer',
  background: 'transparent', color: 'var(--text-muted)', transition: 'background 0.15s, color 0.15s',
};

const BLANK = { name: '', category_id: '', unit: 'pcs', qty_on_hand: '', reorder_level: '', cost_per_unit: '', sku: '' };

export default function InventoryPage() {
  const { farmId } = useFarm();
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('All Categories');
  const [loading,    setLoading]    = useState(true);
  const [loadError,  setLoadError]  = useState('');

  // Add / Edit modal
  const [modal,       setModal]       = useState(false);
  const [editId,      setEditId]      = useState(null);
  const [form,        setForm]        = useState(BLANK);
  const [saving,      setSaving]      = useState(false);
  const [formErr,     setFormErr]     = useState('');

  // Delete modal
  const [deleteModal,  setDeleteModal]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting,     setDeleting]     = useState(false);

  function loadItems() {
    return Promise.all([
      inventoryApi.items({ farm_id: farmId }),
      inventoryApi.categories(),
    ]).then(([it, cats]) => {
      setItems(it || []);
      setCategories(cats || []);
    });
  }

  useEffect(() => {
    loadItems().catch(e => setLoadError(e.message || 'Failed to load inventory.')).finally(() => setLoading(false));
  }, [farmId]);

  const catOptions = ['All Categories', ...categories.map((c) => c.name)];

  const filtered = items.filter((i) => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === 'All Categories' || categories.find((c) => c.id === i.category_id)?.name === catFilter;
    return matchSearch && matchCat;
  });

  const inStock    = items.filter((i) => i.status === 'in_stock').length;
  const lowStock   = items.filter((i) => i.status === 'low_stock').length;
  const outOfStock = items.filter((i) => i.status === 'out_of_stock').length;

  function openAdd() {
    setEditId(null);
    setForm(BLANK);
    setFormErr('');
    setModal(true);
  }

  function openEdit(r) {
    setEditId(r.id);
    setForm({
      name:          r.name,
      category_id:   String(r.category_id),
      unit:          r.unit,
      qty_on_hand:   String(parseFloat(r.qty_on_hand)),
      reorder_level: String(parseFloat(r.reorder_level)),
      cost_per_unit: r.cost_per_unit ? String(parseFloat(r.cost_per_unit)) : '',
      sku:           r.sku || '',
    });
    setFormErr('');
    setModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.category_id) {
      setFormErr('Item name and category are required.'); return;
    }
    setSaving(true); setFormErr('');
    try {
      if (editId) {
        await inventoryApi.updateItem(editId, {
          name:          form.name,
          qty_on_hand:   form.qty_on_hand ? parseFloat(form.qty_on_hand) : 0,
          reorder_level: form.reorder_level ? parseFloat(form.reorder_level) : 0,
          cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        });
      } else {
        await inventoryApi.createItem({
          farm_id:       farmId,
          category_id:   Number(form.category_id),
          name:          form.name,
          sku:           form.sku || null,
          unit:          form.unit || 'pcs',
          qty_on_hand:   form.qty_on_hand ? parseFloat(form.qty_on_hand) : 0,
          reorder_level: form.reorder_level ? parseFloat(form.reorder_level) : 0,
          cost_per_unit: form.cost_per_unit ? parseFloat(form.cost_per_unit) : null,
        });
      }
      await loadItems();
      setModal(false);
    } catch (err) { setFormErr(err.message || 'Failed to save.'); }
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
      await inventoryApi.deleteItem(deleteTarget.id);
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteModal(false);
    } catch (err) { setLoadError(err.message || 'Failed to delete item.'); }
    finally { setDeleting(false); }
  }

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  const rows = filtered.map((i) => ({
    ...i,
    categoryName:   categories.find((c) => c.id === i.category_id)?.name || '—',
    qtyDisplay:     parseFloat(i.qty_on_hand).toLocaleString(),
    reorderDisplay: parseFloat(i.reorder_level).toLocaleString(),
    lastUpdated:    i.last_updated ? new Date(i.last_updated).toLocaleDateString() : '—',
  }));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Inventory</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage feeds, medicines, and farm supplies.</p>
        </div>
        <Button variant="primary" size="md" icon={<I.plus w={16} />} onClick={openAdd}>Add Item</Button>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Items"       value={loading ? '—' : items.length}    icon={<I.box w={22} />} caption="in inventory" />
        <StatCard label="In Stock"          value={loading ? '—' : inStock}         icon={<I.check w={22} />} caption="items available" />
        <StatCard label="Low Stock Alerts"  value={loading ? '—' : lowStock}        tone="amber" icon={<I.alertTri w={22} />} caption="items" />
        <StatCard label="Out of Stock"      value={loading ? '—' : outOfStock}      tone="red"   icon={<I.trash w={22} />}   caption="items" />
      </div>

      <Card>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', minWidth: 200 }}>
            <Input placeholder="Search items..." icon={<I.search />} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select options={catOptions} value={catFilter} onChange={(e) => setCatFilter(e.target.value)} />
          <Button variant="secondary" size="md" icon={<I.download w={15} />} onClick={() => exportCsv(rows, [
            { key: 'name',           header: 'Item Name' },
            { key: 'categoryName',   header: 'Category' },
            { key: 'qtyDisplay',     header: 'Quantity' },
            { key: 'unit',           header: 'Unit' },
            { key: 'reorderDisplay', header: 'Reorder Level' },
            { key: 'status',         header: 'Status' },
            { key: 'lastUpdated',    header: 'Last Updated' },
          ], 'inventory.csv')}>Export CSV</Button>
        </div>
        <DataTable
          columns={[
            { key: 'name',           header: 'Item Name',      strong: true },
            { key: 'categoryName',   header: 'Category' },
            { key: 'qtyDisplay',     header: 'Quantity',       align: 'right', numeric: true },
            { key: 'unit',           header: 'Unit' },
            { key: 'reorderDisplay', header: 'Reorder Level',  align: 'right', numeric: true },
            { key: 'lastUpdated',    header: 'Last Updated' },
            { key: 'status',         header: 'Status', render: (r) => (
              <Badge tone={STATUS_TONE[r.status] || 'neutral'} dot>{STATUS_LABEL[r.status] || r.status}</Badge>
            )},
            { key: '_actions', header: '', render: (r) => (
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                  style={ACTION_BTN}
                  title="Edit item"
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-subtle)'; e.currentTarget.style.color = 'var(--text-body)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <I.pencil w={14} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openDelete(r); }}
                  style={ACTION_BTN}
                  title="Delete item"
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
        title={editId ? 'Edit Item' : 'Add Inventory Item'}
        onClose={() => setModal(false)}
        onConfirm={handleSave}
        confirmLabel={editId ? 'Save Changes' : 'Add Item'}
        loading={saving}
      >
        {formErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{formErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Item Name" required style={{ gridColumn: '1 / -1' }}>
            <FieldInput value={form.name} onChange={f('name')} placeholder="e.g. Poultry Vaccine A" />
          </FormRow>
          {!editId && (
            <FormRow label="Category" required>
              <FieldSelect value={form.category_id} onChange={f('category_id')}>
                <option value="">Select category…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </FieldSelect>
            </FormRow>
          )}
          {!editId && (
            <FormRow label="Unit">
              <FieldSelect value={form.unit} onChange={f('unit')}>
                <option value="pcs">pcs</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="bag">bag</option>
                <option value="box">box</option>
                <option value="bottle">bottle</option>
              </FieldSelect>
            </FormRow>
          )}
          {!editId && (
            <FormRow label="SKU / Code">
              <FieldInput value={form.sku} onChange={f('sku')} placeholder="Optional" />
            </FormRow>
          )}
          <FormRow label="Qty on Hand">
            <FieldInput type="number" value={form.qty_on_hand} onChange={f('qty_on_hand')} placeholder="0" min="0" step="0.01" />
          </FormRow>
          <FormRow label="Reorder Level">
            <FieldInput type="number" value={form.reorder_level} onChange={f('reorder_level')} placeholder="0" min="0" step="0.01" />
          </FormRow>
          <FormRow label="Cost per Unit (₱)">
            <FieldInput type="number" value={form.cost_per_unit} onChange={f('cost_per_unit')} placeholder="Optional" min="0" step="0.01" />
          </FormRow>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        open={deleteModal}
        title="Delete Item"
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Are you sure you want to delete <b>{deleteTarget?.name}</b>?<br />
          This action cannot be undone.
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
