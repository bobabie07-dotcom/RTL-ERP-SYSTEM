import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { StatCard } from '../components/data/StatCard';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput } from '../components/core/Modal';
import { spentHensApi, batchesApi, salesApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

const EMPTY_FORM = {
  sale_date:     new Date().toISOString().split('T')[0],
  batch_id:      '',
  buyer_id:      '',
  birds_sold:    '',
  avg_weight_kg: '',
  price_per_kg:  '',
  transport_cost:'0',
  payment_status:'unpaid',
  notes:         '',
};

export default function SpentHenSalesPage() {
  const { farmId } = useFarm();

  const [sales,   setSales]   = useState([]);
  const [batches, setBatches] = useState([]);
  const [buyers,  setBuyers]  = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');
  const [loadErr, setLoadErr] = useState('');
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState(EMPTY_FORM);

  const loadData = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [s, b, by, sm] = await Promise.all([
        spentHensApi.list(farmId),
        batchesApi.list({ farm_id: farmId }),
        salesApi.buyers(farmId).catch(() => []),
        spentHensApi.summary(farmId),
      ]);
      setSales(s || []);
      setBatches(b || []);
      setBuyers(by || []);
      setSummary(sm);
    } catch (e) {
      setLoadErr(e.message || 'Failed to load spent hen data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (farmId) loadData(); }, [farmId]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setErr('');
    setModal(true);
  };

  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      sale_date:     row.sale_date,
      batch_id:      String(row.batch_id || ''),
      buyer_id:      String(row.buyer_id || ''),
      birds_sold:    String(row.birds_sold),
      avg_weight_kg: String(row.avg_weight_kg || ''),
      price_per_kg:  String(row.price_per_kg),
      transport_cost:String(row.transport_cost || '0'),
      payment_status:row.payment_status,
      notes:         row.notes || '',
    });
    setErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.birds_sold || parseInt(form.birds_sold) <= 0) { setErr('Birds sold must be greater than zero.'); return; }
    if (!form.price_per_kg || parseFloat(form.price_per_kg) <= 0) { setErr('Price per kg is required.'); return; }
    setSaving(true);
    setErr('');
    try {
      const payload = {
        sale_date:      form.sale_date,
        batch_id:       form.batch_id ? parseInt(form.batch_id) : null,
        buyer_id:       form.buyer_id ? parseInt(form.buyer_id) : null,
        birds_sold:     parseInt(form.birds_sold),
        avg_weight_kg:  form.avg_weight_kg ? parseFloat(form.avg_weight_kg) : null,
        price_per_kg:   parseFloat(form.price_per_kg),
        transport_cost: parseFloat(form.transport_cost) || 0,
        payment_status: form.payment_status,
        notes:          form.notes || null,
      };
      if (editId) {
        await spentHensApi.update(editId, payload);
      } else {
        await spentHensApi.create(farmId, payload);
      }
      await loadData();
      setModal(false);
    } catch (e) {
      setErr(e.message || 'Failed to save record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this spent hen sale record?')) return;
    try {
      await spentHensApi.delete(id);
      await loadData();
    } catch (e) {
      alert(e.message || 'Failed to delete.');
    }
  };

  const tableRows = sales.map(s => {
    const batch = batches.find(b => b.id === s.batch_id);
    const buyer = buyers.find(b => b.id === s.buyer_id);
    return {
      id:       s.id,
      _raw:     s,
      date:     s.sale_date,
      batch:    batch?.batch_no || (s.batch_id ? `Batch #${s.batch_id}` : '—'),
      buyer:    buyer?.name || (s.buyer_id ? `Buyer #${s.buyer_id}` : '—'),
      birds:    (s.birds_sold || 0).toLocaleString(),
      weight:   s.total_weight_kg ? `${parseFloat(s.total_weight_kg).toFixed(1)} kg` : '—',
      price:    `₱${parseFloat(s.price_per_kg || 0).toFixed(2)}/kg`,
      total:    `₱${parseFloat(s.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      payment:  s.payment_status,
    };
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadErr && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>{loadErr}</div>
      )}
      <PrintPageHeader title="Spent Hen Sales" />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Spent Hen Sales</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Track end-of-lay flock sales and revenue.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton title="Spent Hen Sales" />
          <Button onClick={openAdd} icon={<I.plus w={15} />}>Record Sale</Button>
        </div>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard label="Total Sales" value={loading ? '—' : (summary?.total_sales || 0).toLocaleString()} icon={<I.batch w={22} />} />
        <StatCard label="Birds Sold" value={loading ? '—' : (summary?.total_birds || 0).toLocaleString()} icon={<I.mortality w={22} />} />
        <StatCard label="Total Weight (kg)" value={loading ? '—' : parseFloat(summary?.total_weight_kg || 0).toFixed(1)} icon={<I.reports w={22} />} />
        <StatCard label="Total Revenue" value={loading ? '—' : `₱${parseFloat(summary?.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} tone="blue" icon={<I.trendUp w={22} />} />
      </div>

      <Card title="Spent Hen Sale Records">
        <DataTable
          columns={[
            { key: 'date',    header: 'Sale Date',   strong: true },
            { key: 'batch',   header: 'Flock / Batch' },
            { key: 'buyer',   header: 'Buyer' },
            { key: 'birds',   header: 'Birds Sold',   align: 'right', numeric: true },
            { key: 'weight',  header: 'Total Weight', align: 'right' },
            { key: 'price',   header: 'Price / kg',   align: 'right' },
            { key: 'total',   header: 'Total Amount', align: 'right', numeric: true },
            { key: 'payment', header: 'Payment' },
          ]}
          rows={tableRows}
          rowKey="id"
          onRowClick={row => openEdit(row._raw)}
          actions={row => (
            <button onClick={e => { e.stopPropagation(); handleDelete(row.id); }}
              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, padding: '2px 6px' }}>
              Delete
            </button>
          )}
        />
      </Card>

      <Modal open={modal} title={editId ? 'Edit Spent Hen Sale' : 'Record Spent Hen Sale'} onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel={saving ? 'Saving…' : 'Save'} loading={saving}>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <FormRow label="Sale Date" required>
          <FieldInput type="date" value={form.sale_date} onChange={f('sale_date')} />
        </FormRow>
        <FormRow label="Flock / Batch">
          <select value={form.batch_id} onChange={f('batch_id')} style={SEL}>
            <option value="">— All / No specific batch —</option>
            {batches.map(b => <option key={b.id} value={b.id}>{b.batch_no}</option>)}
          </select>
        </FormRow>
        <FormRow label="Buyer">
          <select value={form.buyer_id} onChange={f('buyer_id')} style={SEL}>
            <option value="">— Select Buyer —</option>
            {buyers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </FormRow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormRow label="Birds Sold" required>
            <FieldInput type="number" value={form.birds_sold} onChange={f('birds_sold')} placeholder="e.g. 5000" />
          </FormRow>
          <FormRow label="Avg Weight / Bird (kg)">
            <FieldInput type="number" step="0.01" value={form.avg_weight_kg} onChange={f('avg_weight_kg')} placeholder="e.g. 1.85" />
          </FormRow>
          <FormRow label="Price per kg (₱)" required>
            <FieldInput type="number" step="0.01" value={form.price_per_kg} onChange={f('price_per_kg')} placeholder="e.g. 55.00" />
          </FormRow>
          <FormRow label="Transport Cost (₱)">
            <FieldInput type="number" step="0.01" value={form.transport_cost} onChange={f('transport_cost')} placeholder="0" />
          </FormRow>
        </div>
        <FormRow label="Payment Status">
          <select value={form.payment_status} onChange={f('payment_status')} style={SEL}>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </FormRow>
        <FormRow label="Notes">
          <textarea value={form.notes} onChange={f('notes')} placeholder="Optional notes..." style={TXT} />
        </FormRow>
      </Modal>
    </div>
  );
}

const SEL = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface-raised, rgba(0,0,0,0.03))', color: 'var(--text-strong)', fontSize: 14, outline: 'none',
};

const TXT = {
  width: '100%', minHeight: 72, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
  background: 'var(--surface-raised, rgba(0,0,0,0.03))', color: 'var(--text-strong)', fontSize: 14, outline: 'none',
  resize: 'vertical', fontFamily: 'inherit',
};
