import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput } from '../components/core/Modal';
import { eggsApi, batchesApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE = { pending: 'warning', delivered: 'success', cancelled: 'danger' };
const STATUS_LABEL = { pending: 'Pending', delivered: 'Delivered', cancelled: 'Cancelled' };
const PAY_TONE = { unpaid: 'danger', paid: 'success', partial: 'warning' };

export default function EggSalesPage() {
  const { farmId } = useFarm();

  const [sales, setSales] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');

  const [form, setForm] = useState({
    buyer_id: '',
    order_date: new Date().toISOString().split('T')[0],
    size: 'M',
    qty_packages: '',
    package_type: 'tray',
    price_per_package: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [s, b, inv] = await Promise.all([
        eggsApi.listSales({ farm_id: farmId }),
        batchesApi.buyers(),
        eggsApi.getInventory({ farm_id: farmId }),
      ]);
      setSales(s || []);
      setBuyers(b || []);
      setInventory(inv || []);
    } catch (e) {
      setLoadErr(e.message || 'Failed to load egg sales data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmId) loadData();
  }, [farmId]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleOpenAdd = () => {
    setForm({
      buyer_id: buyers[0]?.id ? String(buyers[0].id) : '',
      order_date: new Date().toISOString().split('T')[0],
      size: 'M',
      qty_packages: '',
      package_type: 'tray',
      price_per_package: '',
      notes: '',
    });
    setErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.buyer_id) { setErr('Buyer is required.'); return; }
    if (!form.qty_packages || parseInt(form.qty_packages) <= 0) {
      setErr('Quantity must be greater than zero.');
      return;
    }
    if (!form.price_per_package || parseFloat(form.price_per_package) <= 0) {
      setErr('Price per package must be greater than zero.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      await eggsApi.createSale(farmId, {
        buyer_id: parseInt(form.buyer_id),
        order_date: form.order_date,
        size: form.size,
        qty_packages: parseInt(form.qty_packages),
        package_type: form.package_type,
        price_per_package: parseFloat(form.price_per_package),
        notes: form.notes || null,
      });
      await loadData();
      setModal(false);
    } catch (e) {
      setErr(e.message || 'Failed to create sales order.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this egg sales order? This will restock the inventory.')) return;
    try {
      await eggsApi.updateSaleStatus(orderId, { status: 'cancelled', payment_status: 'unpaid' });
      await loadData();
    } catch (e) {
      alert(e.message || 'Failed to cancel order.');
    }
  };

  const getStock = sizeName => {
    const inv = inventory.find(i => i.size === sizeName);
    return inv ? inv.stock_qty : 0;
  };

  const tableRows = sales.map(s => {
    const buyerObj = buyers.find(b => b.id === s.buyer_id) || { name: `Buyer #${s.buyer_id}` };
    return {
      id: s.id,
      orderNo: s.order_no,
      date: s.order_date,
      buyer: buyerObj.name,
      details: `${s.qty_packages} ${s.package_type}s of Size ${s.size} (${s.total_eggs.toLocaleString()} eggs)`,
      price: `₱${Number(s.price_per_package).toFixed(2)}`,
      total: `₱${Number(s.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      status: s.status,
      payment: s.payment_status,
      notes: s.notes || '—',
    };
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadErr && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>
          {loadErr}
        </div>
      )}
      <PrintPageHeader title="Egg Sales Orders" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Egg Sales Orders</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage orders, pricing, packaging, and deliveries of sorted eggs.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton title="Egg Sales" />
          <Button onClick={handleOpenAdd} icon={<I.plus w={15} />}>Create Order</Button>
        </div>
      </div>

      <Card title="Egg Sales Orders List">
        <DataTable
          columns={[
            { key: 'orderNo', header: 'Order No.', strong: true },
            { key: 'date', header: 'Order Date' },
            { key: 'buyer', header: 'Buyer / Client' },
            { key: 'details', header: 'Items / Packaging' },
            { key: 'price', header: 'Unit Price', align: 'right' },
            { key: 'total', header: 'Total Value', align: 'right' },
            { key: 'status', header: 'Status', render: r => <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge> },
            { key: 'payment', header: 'Payment', render: r => <Badge tone={PAY_TONE[r.payment]}>{r.payment.toUpperCase()}</Badge> },
            {
              key: 'actions', header: '',
              render: r => (
                r.status !== 'cancelled' ? (
                  <button onClick={() => handleCancelOrder(r.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600, fontSize: 12 }}>
                    Cancel Order
                  </button>
                ) : '—'
              )
            }
          ]}
          rows={tableRows}
          rowKey="id"
        />
      </Card>

      <Modal open={modal} title="New Egg Sales Order" onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel="Complete Sale" loading={saving}>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <FormRow label="Buyer / Client" required>
          <select value={form.buyer_id} onChange={f('buyer_id')} style={SEL_STYLE}>
            <option value="">— Select Buyer —</option>
            {buyers.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Order Date" required>
          <FieldInput type="date" value={form.order_date} onChange={f('order_date')} />
        </FormRow>
        <FormRow label="Egg Size" required>
          <select value={form.size} onChange={f('size')} style={SEL_STYLE}>
            <option value="S">Small (S) — Available: {getStock('S')}</option>
            <option value="M">Medium (M) — Available: {getStock('M')}</option>
            <option value="L">Large (L) — Available: {getStock('L')}</option>
            <option value="XL">Extra Large (XL) — Available: {getStock('XL')}</option>
            <option value="Jumbo">Jumbo — Available: {getStock('Jumbo')}</option>
            <option value="Cracked">Cracked — Available: {getStock('Cracked')}</option>
          </select>
        </FormRow>
        <FormRow label="Packaging Type" required>
          <select value={form.package_type} onChange={f('package_type')} style={SEL_STYLE}>
            <option value="tray">Tray (30 eggs)</option>
            <option value="box">Box (360 eggs / 12 trays)</option>
          </select>
        </FormRow>
        <FormRow label="Quantity (Trays / Boxes)" required>
          <FieldInput type="number" value={form.qty_packages} onChange={f('qty_packages')} placeholder="e.g. 50" />
        </FormRow>
        <FormRow label="Price per package (PHP)" required>
          <FieldInput type="number" value={form.price_per_package} onChange={f('price_per_package')} placeholder="e.g. 210.00" />
        </FormRow>
        <FormRow label="Notes">
          <textarea value={form.notes} onChange={f('notes')} placeholder="Optional delivery instructions..." style={TXT_STYLE} />
        </FormRow>
      </Modal>
    </div>
  );
}

const SEL_STYLE = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface-raised, rgba(0,0,0,0.03))',
  color: 'var(--text-strong)',
  fontSize: 14,
  outline: 'none',
};

const TXT_STYLE = {
  width: '100%',
  minHeight: 80,
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  background: 'var(--surface-raised, rgba(0,0,0,0.03))',
  color: 'var(--text-strong)',
  fontSize: 14,
  outline: 'none',
  resize: 'vertical',
  fontFamily: 'inherit',
};
