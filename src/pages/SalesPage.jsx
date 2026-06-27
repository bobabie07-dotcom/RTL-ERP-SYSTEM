import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { StatCard } from '../components/data/StatCard';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { salesApi, procurementApi, batchesApi, inventoryApi } from '../api/client';
import { exportCsv } from '../utils/exportCsv';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const fmt = n => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const I = Icons;

const SALE_STATUS_TONE  = {
  pending_approval: 'warning',
  pending:          'info',
  delivered:        'info',
  completed:        'success',
  cancelled:        'danger',
};
const SALE_STATUS_LABEL = {
  pending_approval: 'Pending Approval',
  pending:          'Pending',
  delivered:        'Delivered',
  completed:        'Completed',
  cancelled:        'Cancelled',
};

const PAY_TONE  = { unpaid: 'danger', partial: 'warning', paid: 'success' };
const PAY_LABEL = { unpaid: 'Unpaid', partial: 'Partial', paid: 'Paid' };

const PO_STATUS_TONE  = {
  pending_approval: 'warning',
  draft:            'neutral',
  ordered:          'info',
  partial:          'warning',
  received:         'success',
  cancelled:        'danger',
};
const PO_STATUS_LABEL = {
  pending_approval: 'Pending Approval',
  draft:            'Draft',
  ordered:          'Ordered',
  partial:          'Partial',
  received:         'Received',
  cancelled:        'Cancelled',
};

const TODAY = new Date().toISOString().split('T')[0];
const BLANK_SALE = { order_no: '', batch_id: '', buyer_id: '', order_date: TODAY, qty_kg: '', price_per_kg: '', notes: '' };
const BLANK_PO      = { supplier_id: '', order_date: TODAY, expected_date: '', notes: '' };
const BLANK_PO_ITEM = { item_id: '', qty_ordered: '', unit_price: '', mode: 'select', new_name: '', new_unit: 'pcs', new_category_id: '' };

function TabBar({ active, onChange, overdueCount }) {
  const tabs = [
    { key: 'sales',       label: 'Sales Orders',    icon: <I.sales w={15} /> },
    { key: 'purchase',    label: 'Purchase Orders', icon: <I.procurement w={15} /> },
    { key: 'receivables', label: `Receivables${overdueCount > 0 ? ` (${overdueCount})` : ''}`, icon: <I.wallet w={15} /> },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid var(--border)', marginBottom: 4 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-body)',
          color: active === t.key ? 'var(--text-brand)' : 'var(--text-secondary)',
          borderBottom: active === t.key ? '2px solid var(--text-brand)' : '2px solid transparent',
          marginBottom: -2, transition: 'all 120ms',
        }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

export default function SalesPage() {
  const { farmId } = useFarm();
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const isManager  = user?.role_id <= 2 || user?.role_id === 5;

  const [tab,          setTab]          = useState('sales');
  const [orders,       setOrders]       = useState([]);
  const [pos,          setPos]          = useState([]);
  const [summary,      setSummary]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [batches,      setBatches]      = useState([]);
  const [buyers,       setBuyers]       = useState([]);
  const [suppliers,    setSuppliers]    = useState([]);
  const [receivables,  setReceivables]  = useState(null);
  const [recvLoading,  setRecvLoading]  = useState(false);
  // Payment recording modal
  const [payTarget,    setPayTarget]    = useState(null);
  const [payStatus,    setPayStatus]    = useState('paid');
  const [paySaving,    setPaySaving]    = useState(false);

  // Sale modal
  const [saleModal, setSaleModal] = useState(false);
  const [saleForm,  setSaleForm]  = useState(BLANK_SALE);
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleErr,   setSaleErr]   = useState('');

  // PO modal
  const [poModal,         setPoModal]         = useState(false);
  const [poForm,          setPoForm]          = useState(BLANK_PO);
  const [poItems,         setPoItems]         = useState([{ ...BLANK_PO_ITEM }]);
  const [inventoryItems,  setInventoryItems]  = useState([]);
  const [categories,      setCategories]      = useState([]);
  const [poSaving,        setPoSaving]        = useState(false);
  const [poErr,           setPoErr]           = useState('');

  // Inline add-supplier inside PO modal
  const [addSupplierOpen,   setAddSupplierOpen]   = useState(false);
  const [newSupplierForm,   setNewSupplierForm]   = useState({ name: '', contact_name: '', phone: '' });
  const [newSupplierSaving, setNewSupplierSaving] = useState(false);
  const [newSupplierErr,    setNewSupplierErr]    = useState('');

  // Approve/Reject modal (shared for sales + PO)
  const [approvalTarget, setApprovalTarget] = useState(null); // { type: 'sale'|'po', id, action: 'approve'|'reject' }
  const [rejectReason,   setRejectReason]   = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);

  // Update sale status modal
  const [updateTarget, setUpdateTarget] = useState(null);
  const [updateForm,   setUpdateForm]   = useState({ status: '', payment_status: '' });
  const [updateSaving, setUpdateSaving] = useState(false);

  // Sync inventory modal (for already-received POs)
  const [syncTarget,   setSyncTarget]   = useState(null); // { id, po_no }
  const [syncItems,    setSyncItems]    = useState([{ ...BLANK_PO_ITEM }]);
  const [syncSaving,   setSyncSaving]   = useState(false);
  const [syncErr,      setSyncErr]      = useState('');

  // Delete confirmation modal
  const [delTarget,  setDelTarget]  = useState(null); // { type: 'sale'|'po', id, label }
  const [deleting,   setDeleting]   = useState(false);

  function loadAll() {
    return Promise.all([
      salesApi.orders({ limit: 100, farm_id: farmId }),
      salesApi.summary(farmId),
      procurementApi.orders({ farm_id: farmId }),
    ]).then(([o, s, p]) => {
      setOrders(o || []);
      setSummary(s);
      setPos(p || []);
    });
  }

  function loadReceivables() {
    setRecvLoading(true);
    salesApi.receivables(farmId).then(setReceivables).catch(() => {}).finally(() => setRecvLoading(false));
  }

  useEffect(() => {
    setLoading(true);
    loadAll().catch(e => setLoadError(e.message || 'Failed to load sales data.')).finally(() => setLoading(false));
    batchesApi.list({ farm_id: farmId }).then(setBatches).catch(() => {});
    batchesApi.buyers().then(setBuyers).catch(() => {});
    procurementApi.suppliers().then(setSuppliers).catch(() => {});
    loadReceivables();
  }, [farmId]);

  useEffect(() => {
    if (tab === 'receivables') loadReceivables();
  }, [tab]);

  // ── New Sale ───────────────────────────────────────────────────────────────
  function openSaleModal() {
    const num = `SO-${Date.now().toString().slice(-6)}`;
    setSaleForm({ ...BLANK_SALE, order_no: num });
    setSaleErr(''); setSaleModal(true);
  }

  async function handleSaveSale() {
    if (!saleForm.batch_id || !saleForm.qty_kg || !saleForm.price_per_kg) {
      setSaleErr('Batch, quantity, and price are required.'); return;
    }
    setSaleSaving(true); setSaleErr('');
    try {
      await salesApi.createOrder({
        ...saleForm,
        batch_id:     Number(saleForm.batch_id),
        buyer_id:     saleForm.buyer_id ? Number(saleForm.buyer_id) : null,
        qty_kg:       parseFloat(saleForm.qty_kg),
        price_per_kg: parseFloat(saleForm.price_per_kg),
      });
      await loadAll();
      setSaleModal(false);
    } catch (err) { setSaleErr(err.message || 'Failed to save.'); }
    finally { setSaleSaving(false); }
  }

  // ── New Purchase ───────────────────────────────────────────────────────────
  function openPoModal() {
    setPoForm(BLANK_PO); setPoErr('');
    setPoItems([{ ...BLANK_PO_ITEM }]);
    setAddSupplierOpen(false); setNewSupplierForm({ name: '', contact_name: '', phone: '' }); setNewSupplierErr('');
    inventoryApi.items({ farm_id: farmId }).then(setInventoryItems).catch(() => {});
    if (categories.length === 0) inventoryApi.categories().then(setCategories).catch(() => {});
    setPoModal(true);
  }

  function addPoItem()          { setPoItems(p => [...p, { ...BLANK_PO_ITEM }]); }
  function removePoItem(idx)    { setPoItems(p => p.filter((_, i) => i !== idx)); }
  function updatePoItem(idx, k, v) { setPoItems(p => p.map((it, i) => i === idx ? { ...it, [k]: v } : it)); }

  async function handleSavePo() {
    const validItems = poItems.filter(it => {
      if (it.mode === 'input') return it.new_name.trim() && it.qty_ordered && it.unit_price;
      return it.item_id && it.qty_ordered && it.unit_price;
    });
    if (!poForm.order_date) { setPoErr('Order date is required.'); return; }
    if (validItems.length === 0) { setPoErr('Add at least one item with qty and unit price.'); return; }
    setPoSaving(true); setPoErr('');
    try {
      const resolved = await Promise.all(validItems.map(async it => {
        if (it.mode !== 'input') return it;
        const created = await inventoryApi.createItem({
          farm_id:     farmId,
          name:        it.new_name.trim(),
          unit:        it.new_unit || 'pcs',
          category_id: it.new_category_id ? Number(it.new_category_id) : (categories[0]?.id || 1),
        });
        return { ...it, item_id: String(created.id) };
      }));
      await procurementApi.createOrder({
        farm_id:       farmId,
        supplier_id:   poForm.supplier_id ? Number(poForm.supplier_id) : null,
        order_date:    poForm.order_date,
        expected_date: poForm.expected_date || null,
        notes:         poForm.notes || null,
        items: resolved.map(it => ({
          item_id:     Number(it.item_id),
          qty_ordered: parseFloat(it.qty_ordered),
          unit_price:  parseFloat(it.unit_price),
        })),
      });
      await loadAll();
      setPoModal(false);
    } catch (err) { setPoErr(err.message || 'Failed to save.'); }
    finally { setPoSaving(false); }
  }

  async function handleAddSupplier() {
    if (!newSupplierForm.name.trim()) { setNewSupplierErr('Supplier name is required.'); return; }
    setNewSupplierSaving(true); setNewSupplierErr('');
    try {
      const created = await procurementApi.createSupplier({
        name:         newSupplierForm.name.trim(),
        contact_name: newSupplierForm.contact_name || null,
        phone:        newSupplierForm.phone || null,
      });
      const updated = await procurementApi.suppliers();
      setSuppliers(updated);
      setPoForm(p => ({ ...p, supplier_id: String(created.id) }));
      setAddSupplierOpen(false);
      setNewSupplierForm({ name: '', contact_name: '', phone: '' });
    } catch (e) { setNewSupplierErr(e.message || 'Failed to add supplier.'); }
    finally { setNewSupplierSaving(false); }
  }

  // ── Approval ───────────────────────────────────────────────────────────────
  function openApproval(type, id, action) {
    setApprovalTarget({ type, id, action });
    setRejectReason('');
  }

  async function handleApproval() {
    if (!approvalTarget) return;
    const { type, id, action } = approvalTarget;
    if (action === 'reject' && !rejectReason.trim()) return;
    setApprovalSaving(true);
    try {
      if (type === 'sale') {
        if (action === 'approve') await salesApi.approveOrder(id);
        else await salesApi.rejectOrder(id, rejectReason);
      } else {
        if (action === 'approve') await procurementApi.approveOrder(id);
        else await procurementApi.rejectOrder(id, rejectReason);
      }
      await loadAll();
      setApprovalTarget(null);
    } catch (err) { setLoadError(err.message || 'Action failed.'); }
    finally { setApprovalSaving(false); }
  }

  // ── Update sale status ─────────────────────────────────────────────────────
  function openUpdateSale(row) {
    setUpdateTarget(row);
    setUpdateForm({ status: row.status, payment_status: row.payment_status });
  }

  async function handleUpdateSale() {
    if (!updateTarget) return;
    setUpdateSaving(true);
    try {
      await salesApi.updateOrder(updateTarget.id, updateForm);
      await loadAll();
      setUpdateTarget(null);
    } catch (err) { setLoadError(err.message || 'Update failed.'); }
    finally { setUpdateSaving(false); }
  }

  // ── Receive PO ────────────────────────────────────────────────────────────
  async function handleReceivePo(id) {
    try {
      await procurementApi.receiveOrder(id);
      await loadAll();
    } catch (err) { setLoadError(err.message || 'Failed.'); }
  }

  // ── Sync inventory (backfill for already-received POs) ────────────────────
  function openSyncModal(row) {
    setSyncTarget({ id: row.id, po_no: row.po_no || `PO-${String(row.id).padStart(6, '0')}` });
    setSyncItems([{ ...BLANK_PO_ITEM }]);
    setSyncErr('');
    inventoryApi.items({ farm_id: farmId }).then(setInventoryItems).catch(() => {});
    if (categories.length === 0) inventoryApi.categories().then(setCategories).catch(() => {});
    setSyncSaving(false);
  }

  function updateSyncItem(idx, k, v) { setSyncItems(p => p.map((x, i) => i === idx ? { ...x, [k]: v } : x)); }

  async function handleSyncInventory() {
    const validItems = syncItems.filter(it => {
      if (it.mode === 'input') return it.new_name.trim() && it.qty_ordered && parseFloat(it.qty_ordered) > 0;
      return it.item_id && it.qty_ordered && parseFloat(it.qty_ordered) > 0;
    });
    if (validItems.length === 0) { setSyncErr('Add at least one item with a quantity.'); return; }
    setSyncSaving(true); setSyncErr('');
    try {
      const resolved = await Promise.all(validItems.map(async it => {
        if (it.mode !== 'input') return it;
        const created = await inventoryApi.createItem({
          farm_id:     farmId,
          name:        it.new_name.trim(),
          unit:        it.new_unit || 'pcs',
          category_id: it.new_category_id ? Number(it.new_category_id) : (categories[0]?.id || 1),
        });
        return { ...it, item_id: String(created.id) };
      }));
      await procurementApi.syncInventory(syncTarget.id, resolved.map(it => ({
        item_id:     Number(it.item_id),
        qty_ordered: parseFloat(it.qty_ordered),
        unit_price:  parseFloat(it.unit_price || 0),
      })));
      setSyncTarget(null);
    } catch (err) { setSyncErr(err.message || 'Failed to sync.'); }
    finally { setSyncSaving(false); }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      if (delTarget.type === 'sale') await salesApi.deleteOrder(delTarget.id);
      else await procurementApi.deleteOrder(delTarget.id);
      await loadAll();
      setDelTarget(null);
    } catch (err) { setLoadError(err.message || 'Delete failed.'); }
    finally { setDeleting(false); }
  }

  // ── Record Payment ─────────────────────────────────────────────────────────
  async function handleRecordPayment() {
    if (!payTarget) return;
    setPaySaving(true);
    try {
      await salesApi.recordPayment(payTarget.id, payStatus);
      loadReceivables();
      await loadAll();
      setPayTarget(null);
    } catch (err) { setLoadError(err.message || 'Failed to record payment.'); }
    finally { setPaySaving(false); }
  }

  const sf = k => e => setSaleForm(p => ({ ...p, [k]: e.target.value }));
  const pf = k => e => setPoForm(p => ({ ...p, [k]: e.target.value }));

  // ── Table rows ─────────────────────────────────────────────────────────────
  const saleRows = orders.map(o => ({
    ...o,
    total:       `₱${parseFloat(o.total_amount || 0).toLocaleString()}`,
    pricePerKg:  `₱${parseFloat(o.price_per_kg || 0).toFixed(2)}`,
    qtyKg:       parseFloat(o.qty_kg || 0).toLocaleString(),
  }));

  const saleCols = [
    { key: 'order_no',  header: 'Order No.',  strong: true },
    { key: 'date',      header: 'Date' },
    { key: 'batch',     header: 'Batch', render: r => (
      <span onClick={() => navigate(`/batches/${r.batch_id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>{r.batch}</span>
    ) },
    { key: 'buyer',     header: 'Buyer' },
    { key: 'qtyKg',    header: 'Qty (kg)',  align: 'right', numeric: true },
    { key: 'pricePerKg', header: 'Price/kg', align: 'right', numeric: true },
    { key: 'total',     header: 'Total',    align: 'right', numeric: true },
    {
      key: 'status', header: 'Status',
      render: r => <Badge tone={SALE_STATUS_TONE[r.status] || 'neutral'} dot>{SALE_STATUS_LABEL[r.status] || r.status}</Badge>,
    },
    {
      key: 'payment_status', header: 'Payment',
      render: r => r.status === 'cancelled' ? <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
        : <Badge tone={PAY_TONE[r.payment_status] || 'neutral'}>{PAY_LABEL[r.payment_status] || r.payment_status}</Badge>,
    },
    {
      key: 'actions', header: '',
      render: r => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
          {r.status === 'pending_approval' && isManager && (
            <>
              <Button variant="primary" size="sm" onClick={() => openApproval('sale', r.id, 'approve')}>Approve</Button>
              <Button variant="danger"  size="sm" onClick={() => openApproval('sale', r.id, 'reject')}>Reject</Button>
            </>
          )}
          {r.status !== 'pending_approval' && r.status !== 'cancelled' && (
            <Button variant="ghost" size="sm" icon={<I.pencil w={12} />} onClick={() => openUpdateSale(r)}>Update</Button>
          )}
          {isManager && (
            <Button variant="ghost" size="sm" icon={<I.trash w={12} />}
              style={{ color: 'var(--danger)' }}
              onClick={() => setDelTarget({ type: 'sale', id: r.id, label: r.order_no })}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const poCols = [
    { key: 'po_no',       header: 'PO No.',     strong: true, render: r => r.po_no || `PO-${String(r.id).padStart(6,'0')}` },
    { key: 'order_date',  header: 'Date' },
    { key: 'expected_date', header: 'Expected',  render: r => r.expected_date || '—' },
    { key: 'supplier',    header: 'Supplier',   render: r => r.supplier || 'Unknown' },
    { key: 'total_amount', header: 'Amount',    align: 'right', numeric: true,
      render: r => r.total_amount ? `₱${parseFloat(r.total_amount).toLocaleString()}` : '—' },
    { key: 'notes',       header: 'Description', render: r => <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.notes || '—'}</span> },
    {
      key: 'status', header: 'Status',
      render: r => <Badge tone={PO_STATUS_TONE[r.status] || 'neutral'} dot>{PO_STATUS_LABEL[r.status] || r.status}</Badge>,
    },
    { key: 'approved_by_name', header: 'Approved By', render: r => r.approved_by_name
      ? <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.approved_by_name}</span>
      : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span> },
    {
      key: 'actions', header: '',
      render: r => (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'nowrap' }}>
          {r.status === 'pending_approval' && isManager && (
            <>
              <Button variant="primary" size="sm" onClick={() => openApproval('po', r.id, 'approve')}>Approve</Button>
              <Button variant="danger"  size="sm" onClick={() => openApproval('po', r.id, 'reject')}>Reject</Button>
            </>
          )}
          {r.status === 'ordered' && isManager && (
            <Button variant="secondary" size="sm" onClick={() => handleReceivePo(r.id)}>Mark Received</Button>
          )}
          {r.status === 'received' && isManager && (
            <>
              <Button variant="ghost" size="sm" onClick={() => openSyncModal(r)} style={{ color: 'var(--text-brand)' }}>Sync Inventory</Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inventory')} style={{ color: 'var(--text-brand)' }}>View Inventory</Button>
            </>
          )}
          {isManager && (
            <Button variant="ghost" size="sm" icon={<I.trash w={12} />}
              style={{ color: 'var(--danger)' }}
              onClick={() => setDelTarget({ type: 'po', id: r.id, label: r.po_no || `PO-${String(r.id).padStart(6,'0')}` })}>
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const pendingSales   = orders.filter(o => o.status === 'pending_approval').length;
  const pendingPos     = pos.filter(p => p.status === 'pending_approval').length;
  const overdueCount   = receivables?.overdue_30_count || 0;

  const agingTone = days => days >= 60 ? 'danger' : days >= 30 ? 'warning' : 'neutral';

  const recvCols = [
    { key: 'order_no',    header: 'Order No.',  strong: true },
    { key: 'order_date',  header: 'Date' },
    { key: 'batch',       header: 'Batch', render: r => (
      <span onClick={() => navigate(`/batches/${r.batch_id}`)} style={{ color: 'var(--text-brand)', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>{r.batch}</span>
    ) },
    { key: 'buyer',       header: 'Buyer',      render: r => r.buyer || 'Unknown' },
    { key: 'buyer_phone', header: 'Phone',      render: r => r.buyer_phone || '—' },
    { key: 'total_amount', header: 'Amount',    align: 'right', render: r => <b style={{ color: 'var(--danger)' }}>{fmt(r.total_amount)}</b> },
    { key: 'payment_status', header: 'Payment', render: r => <Badge tone={PAY_TONE[r.payment_status] || 'neutral'}>{PAY_LABEL[r.payment_status] || r.payment_status}</Badge> },
    { key: 'days_outstanding', header: 'Age',   render: r => <Badge tone={agingTone(r.days_outstanding)} dot>{r.days_outstanding}d</Badge> },
    { key: '_action', header: '',
      render: r => <Button variant="primary" size="sm" onClick={() => { setPayTarget(r); setPayStatus('paid'); }}>Record Payment</Button>,
    },
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadError && <ErrBanner message={loadError} />}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Sales & Procurement</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Track poultry sales, purchase orders, and approval workflows.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" icon={<I.procurement w={16} />} onClick={openPoModal}>New Purchase</Button>
          <Button variant="primary"   size="md" icon={<I.plus w={16} />} onClick={openSaleModal}>New Sale</Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <StatCard label="Total Revenue"     value={loading ? '—' : `₱${parseFloat(summary?.total_revenue || 0).toLocaleString()}`} tone="blue" icon={<I.trendUp w={22} />} />
        <StatCard label="Total Sold (kg)"   value={loading ? '—' : parseFloat(summary?.total_kg || 0).toLocaleString()} icon={<I.sales w={22} />} caption="all time" />
        <StatCard label="Avg. Price/kg"     value={loading ? '—' : `₱${parseFloat(summary?.avg_price_per_kg || 0).toFixed(2)}`} tone="amber" icon={<I.wallet w={22} />} />
        <StatCard label="Outstanding A/R"   value={receivables ? fmt(receivables.total_outstanding) : '—'} tone="red" icon={<I.wallet w={22} />} caption={`${receivables?.count || 0} unpaid orders`} />
        <StatCard
          label="Pending Approval"
          value={loading ? '—' : pendingSales + pendingPos}
          tone="red"
          icon={<I.alertTri w={22} />}
          caption={`${pendingSales} sales · ${pendingPos} purchases`}
        />
      </div>

      {/* Tabs */}
      <Card>
        <TabBar active={tab} onChange={setTab} overdueCount={overdueCount} />
        <div style={{ marginTop: 16 }}>
          {tab === 'sales' && <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={() => exportCsv(saleRows, [
                { key: 'order_no',       header: 'Order No.' },
                { key: 'date',           header: 'Date' },
                { key: 'batch',          header: 'Batch' },
                { key: 'buyer',          header: 'Buyer' },
                { key: 'qtyKg',         header: 'Qty (kg)' },
                { key: 'pricePerKg',     header: 'Price/kg' },
                { key: 'total',          header: 'Total' },
                { key: 'status',         header: 'Status' },
                { key: 'payment_status', header: 'Payment' },
              ], 'sales-orders.csv')}>Export CSV</Button>
            </div>
            <DataTable columns={saleCols} rows={saleRows} rowKey="id" />
          </>}
          {tab === 'purchase' && <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
              <Button variant="secondary" size="sm" icon={<I.download w={14} />} onClick={() => exportCsv(pos, [
                { key: 'po_no',        header: 'PO No.' },
                { key: 'order_date',   header: 'Date' },
                { key: 'expected_date',header: 'Expected' },
                { key: 'supplier',     header: 'Supplier' },
                { key: 'total_amount', header: 'Amount' },
                { key: 'notes',        header: 'Description' },
                { key: 'status',       header: 'Status' },
              ], 'purchase-orders.csv')}>Export CSV</Button>
            </div>
            <DataTable columns={poCols} rows={pos} rowKey="id" />
          </>}
          {tab === 'receivables' && (
            recvLoading ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Loading receivables…</div>
            ) : !receivables || receivables.orders.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No outstanding receivables. All orders are paid!</div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Total Outstanding', value: fmt(receivables.total_outstanding), tone: 'var(--danger)' },
                    { label: 'Unpaid Orders',     value: receivables.count,                  tone: 'var(--text-strong)' },
                    { label: '30+ Days Overdue',  value: receivables.overdue_30_count,       tone: receivables.overdue_30_count > 0 ? 'var(--warning)' : 'var(--text-secondary)' },
                    { label: '60+ Days Overdue',  value: receivables.overdue_60_count,       tone: receivables.overdue_60_count > 0 ? 'var(--danger)'  : 'var(--text-secondary)' },
                  ].map(c => (
                    <div key={c.label} style={{ padding: '10px 16px', background: 'var(--surface-raised,rgba(0,0,0,.03))', borderRadius: 8, minWidth: 140 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{c.label}</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: c.tone }}>{c.value}</div>
                    </div>
                  ))}
                </div>
                <DataTable columns={recvCols} rows={receivables.orders} rowKey="id" />
              </>
            )
          )}
        </div>
      </Card>

      {/* New Sale Modal */}
      <Modal open={saleModal} title="New Sales Order" onClose={() => setSaleModal(false)} onConfirm={handleSaveSale} confirmLabel="Submit for Approval" loading={saleSaving}>
        {saleErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{saleErr}</div>}
        <div style={{ background: 'var(--warning-bg,#fffbeb)', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
          This order will be submitted for manager approval before processing.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Order No." required><FieldInput value={saleForm.order_no} onChange={sf('order_no')} placeholder="SO-XXXXXX" /></FormRow>
          <FormRow label="Order Date" required><FieldInput type="date" value={saleForm.order_date} onChange={sf('order_date')} /></FormRow>
          <FormRow label="Batch" required>
            <FieldSelect value={saleForm.batch_id} onChange={sf('batch_id')}>
              <option value="">Select batch…</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_no} — {b.house}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Buyer">
            <FieldSelect value={saleForm.buyer_id} onChange={sf('buyer_id')}>
              <option value="">Walk-in / Unknown</option>
              {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Quantity (kg)" required><FieldInput type="number" value={saleForm.qty_kg} onChange={sf('qty_kg')} placeholder="e.g. 500" min="0.1" step="0.1" /></FormRow>
          <FormRow label="Price per kg (₱)" required><FieldInput type="number" value={saleForm.price_per_kg} onChange={sf('price_per_kg')} placeholder="e.g. 120.00" min="0" step="0.01" /></FormRow>
          <FormRow label="Notes" style={{ gridColumn: '1/-1' }}><FieldInput value={saleForm.notes} onChange={sf('notes')} placeholder="Optional notes…" /></FormRow>
        </div>
      </Modal>

      {/* New Purchase Order Modal */}
      <Modal open={poModal} title="New Purchase Order" onClose={() => setPoModal(false)} onConfirm={handleSavePo} confirmLabel="Submit for Approval" loading={poSaving} width={680}>
        {poErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{poErr}</div>}
        <div style={{ background: 'var(--warning-bg,#fffbeb)', border: '1px solid #fde68a', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
          This PO will be submitted for manager approval before ordering. Received items will be automatically added to inventory.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Order Date" required><FieldInput type="date" value={poForm.order_date} onChange={pf('order_date')} /></FormRow>
          <FormRow label="Expected Delivery"><FieldInput type="date" value={poForm.expected_date} onChange={pf('expected_date')} /></FormRow>
          <FormRow label="Supplier" style={{ gridColumn: '1/-1' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <FieldSelect value={poForm.supplier_id} onChange={pf('supplier_id')} style={{ flex: 1 }}>
                <option value="">Select supplier…</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FieldSelect>
              <button
                type="button"
                onClick={() => { setAddSupplierOpen(s => !s); setNewSupplierErr(''); }}
                style={{ flexShrink: 0, height: 36, padding: '0 12px', border: '1px dashed var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                {addSupplierOpen ? '✕ Cancel' : '+ New Supplier'}
              </button>
            </div>
            {addSupplierOpen && (
              <div style={{ marginTop: 10, padding: '12px 14px', background: 'var(--gray-50)', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>New Supplier</div>
                {newSupplierErr && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{newSupplierErr}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
                  <FormRow label="Supplier Name" required>
                    <FieldInput value={newSupplierForm.name} onChange={e => setNewSupplierForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Al-Noor Feed Co." />
                  </FormRow>
                  <FormRow label="Contact Person">
                    <FieldInput value={newSupplierForm.contact_name} onChange={e => setNewSupplierForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="e.g. Juan dela Cruz" />
                  </FormRow>
                  <FormRow label="Phone" style={{ gridColumn: '1/-1' }}>
                    <FieldInput value={newSupplierForm.phone} onChange={e => setNewSupplierForm(p => ({ ...p, phone: e.target.value }))} placeholder="+63 912 345 6789" />
                  </FormRow>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button variant="primary" size="sm" onClick={handleAddSupplier} disabled={newSupplierSaving}>
                    {newSupplierSaving ? 'Saving…' : 'Add Supplier'}
                  </Button>
                </div>
              </div>
            )}
          </FormRow>

          {/* Line items */}
          <FormRow label="Items" required style={{ gridColumn: '1/-1' }}>
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left', width: '46%' }}>Inventory Item</th>
                    <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '16%' }}>Qty</th>
                    <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '20%' }}>Unit Price (₱)</th>
                    <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '14%' }}>Total</th>
                    <th style={{ width: '4%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {poItems.map((it, idx) => {
                    const rowTotal = parseFloat(it.qty_ordered || 0) * parseFloat(it.unit_price || 0);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle,#f0f0f0)' }}>
                        <td style={{ padding: '4px 6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 3 }}>
                            <button type="button" onClick={() => updatePoItem(idx, 'mode', it.mode === 'select' ? 'input' : 'select')}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-brand)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>
                              {it.mode === 'input' ? '← Pick existing' : '+ Type new'}
                            </button>
                          </div>
                          {it.mode !== 'input' ? (
                            <FieldSelect value={it.item_id} onChange={e => updatePoItem(idx, 'item_id', e.target.value)}>
                              <option value="">Select item…</option>
                              {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                            </FieldSelect>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <FieldInput value={it.new_name} onChange={e => updatePoItem(idx, 'new_name', e.target.value)} placeholder="Item name…" autoFocus />
                              <div style={{ display: 'flex', gap: 4 }}>
                                <FieldInput value={it.new_unit} onChange={e => updatePoItem(idx, 'new_unit', e.target.value)} placeholder="Unit" style={{ width: 64 }} />
                                <FieldSelect value={it.new_category_id} onChange={e => updatePoItem(idx, 'new_category_id', e.target.value)} style={{ flex: 1 }}>
                                  <option value="">Category…</option>
                                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </FieldSelect>
                              </div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <FieldInput type="number" value={it.qty_ordered} onChange={e => updatePoItem(idx, 'qty_ordered', e.target.value)} min="0.01" step="0.01" style={{ textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '4px 6px' }}>
                          <FieldInput type="number" value={it.unit_price} onChange={e => updatePoItem(idx, 'unit_price', e.target.value)} min="0" step="0.01" style={{ textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--text-strong)', whiteSpace: 'nowrap' }}>
                          {rowTotal > 0 ? `₱${rowTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td style={{ padding: '4px 2px', textAlign: 'center' }}>
                          {poItems.length > 1 && (
                            <button type="button" onClick={() => removePoItem(idx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <button type="button" onClick={addPoItem} style={{ border: '1px dashed var(--border)', background: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600 }}>+ Add Row</button>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-strong)' }}>
                  Total: ₱{poItems.reduce((s, it) => s + parseFloat(it.qty_ordered || 0) * parseFloat(it.unit_price || 0), 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </FormRow>

          <FormRow label="Notes" style={{ gridColumn: '1/-1' }}><FieldInput value={poForm.notes} onChange={pf('notes')} placeholder="Optional notes…" /></FormRow>
        </div>
      </Modal>

      {/* Approve / Reject Modal */}
      <Modal
        open={!!approvalTarget}
        title={approvalTarget?.action === 'approve'
          ? `Approve ${approvalTarget?.type === 'sale' ? 'Sales Order' : 'Purchase Order'}`
          : `Reject ${approvalTarget?.type === 'sale' ? 'Sales Order' : 'Purchase Order'}`}
        onClose={() => setApprovalTarget(null)}
        onConfirm={handleApproval}
        confirmLabel={approvalTarget?.action === 'approve' ? 'Approve' : 'Reject'}
        confirmVariant={approvalTarget?.action === 'approve' ? 'primary' : 'danger'}
        loading={approvalSaving}
        width={440}
      >
        {approvalTarget?.action === 'approve' ? (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
            Are you sure you want to <b>approve</b> this {approvalTarget?.type === 'sale' ? 'sales order' : 'purchase order'}?
            {approvalTarget?.type === 'sale' && ' It will move to Pending status and be ready for delivery.'}
            {approvalTarget?.type === 'po' && ' It will be sent to the supplier as Ordered.'}
          </p>
        ) : (
          <div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
              Please provide a reason for rejecting this {approvalTarget?.type === 'sale' ? 'sales order' : 'purchase order'}.
            </p>
            <FormRow label="Rejection Reason" required>
              <FieldInput value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="e.g. Insufficient stock, price too high…" />
            </FormRow>
          </div>
        )}
      </Modal>

      {/* Update Sale Status Modal */}
      <Modal
        open={!!updateTarget}
        title="Update Order Status"
        onClose={() => setUpdateTarget(null)}
        onConfirm={handleUpdateSale}
        confirmLabel="Save"
        loading={updateSaving}
        width={400}
      >
        <FormRow label="Order Status">
          <FieldSelect value={updateForm.status} onChange={e => setUpdateForm(p => ({ ...p, status: e.target.value }))}>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </FieldSelect>
        </FormRow>
        <FormRow label="Payment Status">
          <FieldSelect value={updateForm.payment_status} onChange={e => setUpdateForm(p => ({ ...p, payment_status: e.target.value }))}>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </FieldSelect>
        </FormRow>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!delTarget}
        title={`Delete ${delTarget?.type === 'sale' ? 'Sales Order' : 'Purchase Order'}`}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Are you sure you want to permanently delete{' '}
          <b style={{ color: 'var(--text-strong)' }}>{delTarget?.label}</b>?
          This action cannot be undone.
        </p>
      </Modal>

      {/* Sync Inventory Modal */}
      <Modal open={!!syncTarget} title={`Sync Inventory — ${syncTarget?.po_no}`} onClose={() => setSyncTarget(null)} onConfirm={handleSyncInventory} confirmLabel="Add to Inventory" loading={syncSaving} width={640}>
        {syncErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{syncErr}</div>}
        <div style={{ background: 'var(--info-bg,#eff6ff)', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12, color: '#1e40af' }}>
          Enter the items that were received on this PO. Each item's quantity will be added to inventory stock.
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left', width: '48%' }}>Inventory Item</th>
              <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '18%' }}>Qty Received</th>
              <th style={{ padding: '4px 6px 8px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right', width: '22%' }}>Unit Price (₱)</th>
              <th style={{ width: '12%' }}></th>
            </tr>
          </thead>
          <tbody>
            {syncItems.map((it, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle,#f0f0f0)' }}>
                <td style={{ padding: '4px 6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 3 }}>
                    <button type="button" onClick={() => updateSyncItem(idx, 'mode', it.mode === 'select' ? 'input' : 'select')}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--text-brand)', fontWeight: 600, padding: 0, textDecoration: 'underline' }}>
                      {it.mode === 'input' ? '← Pick existing' : '+ Type new'}
                    </button>
                  </div>
                  {it.mode !== 'input' ? (
                    <FieldSelect value={it.item_id} onChange={e => updateSyncItem(idx, 'item_id', e.target.value)}>
                      <option value="">Select item…</option>
                      {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </FieldSelect>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <FieldInput value={it.new_name} onChange={e => updateSyncItem(idx, 'new_name', e.target.value)} placeholder="Item name…" autoFocus />
                      <div style={{ display: 'flex', gap: 4 }}>
                        <FieldInput value={it.new_unit} onChange={e => updateSyncItem(idx, 'new_unit', e.target.value)} placeholder="Unit" style={{ width: 64 }} />
                        <FieldSelect value={it.new_category_id} onChange={e => updateSyncItem(idx, 'new_category_id', e.target.value)} style={{ flex: 1 }}>
                          <option value="">Category…</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </FieldSelect>
                      </div>
                    </div>
                  )}
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <FieldInput type="number" value={it.qty_ordered} onChange={e => updateSyncItem(idx, 'qty_ordered', e.target.value)} min="0.01" step="0.01" style={{ textAlign: 'right' }} />
                </td>
                <td style={{ padding: '4px 6px' }}>
                  <FieldInput type="number" value={it.unit_price} onChange={e => updateSyncItem(idx, 'unit_price', e.target.value)} min="0" step="0.01" placeholder="optional" style={{ textAlign: 'right' }} />
                </td>
                <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                  {syncItems.length > 1 && (
                    <button type="button" onClick={() => setSyncItems(p => p.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1 }}>×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={() => setSyncItems(p => [...p, { ...BLANK_PO_ITEM }])} style={{ marginTop: 10, border: '1px dashed var(--border)', background: 'none', cursor: 'pointer', borderRadius: 6, padding: '4px 12px', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600 }}>+ Add Row</button>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={!!payTarget}
        title={`Record Payment — ${payTarget?.order_no}`}
        onClose={() => setPayTarget(null)}
        onConfirm={handleRecordPayment}
        confirmLabel="Save Payment"
        loading={paySaving}
        width={400}
      >
        <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          Order Amount: <b style={{ color: 'var(--text-strong)' }}>{payTarget ? fmt(payTarget.total_amount) : '—'}</b>
          {payTarget?.buyer && <> · Buyer: <b style={{ color: 'var(--text-strong)' }}>{payTarget.buyer}</b></>}
        </p>
        <FormRow label="Payment Status">
          <FieldSelect value={payStatus} onChange={e => setPayStatus(e.target.value)}>
            <option value="partial">Partial — partially paid</option>
            <option value="paid">Paid — fully settled</option>
          </FieldSelect>
        </FormRow>
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
