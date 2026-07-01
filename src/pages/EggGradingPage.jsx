import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { StatCard } from '../components/data/StatCard';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput } from '../components/core/Modal';
import { eggsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

export default function EggGradingPage() {
  const { farmId } = useFarm();

  const [gradings, setGradings] = useState([]);
  const [collections, setCollections] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');

  const [form, setForm] = useState({
    collection_id: '',
    size_s: '0',
    size_m: '0',
    size_l: '0',
    size_xl: '0',
    size_jumbo: '0',
    dirty_count: '0',
    graded_date: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [grad, col, inv] = await Promise.all([
        eggsApi.listGradings({ farm_id: farmId }),
        eggsApi.listCollections({ farm_id: farmId }),
        eggsApi.getInventory({ farm_id: farmId }),
      ]);
      setGradings(grad || []);
      setCollections(col || []);
      setInventory(inv || []);
    } catch (e) {
      setLoadErr(e.message || 'Failed to load egg grading data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmId) loadData();
  }, [farmId]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleOpenAdd = () => {
    // Only allow grading on collections that are not fully graded yet (for simplicity, list all)
    setForm({
      collection_id: collections[0]?.id ? String(collections[0].id) : '',
      size_s: '0',
      size_m: '0',
      size_l: '0',
      size_xl: '0',
      size_jumbo: '0',
      dirty_count: '0',
      graded_date: new Date().toISOString().split('T')[0],
    });
    setErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.collection_id) { setErr('Please select a collection batch.'); return; }
    const s = parseInt(form.size_s) || 0;
    const m = parseInt(form.size_m) || 0;
    const l = parseInt(form.size_l) || 0;
    const xl = parseInt(form.size_xl) || 0;
    const j = parseInt(form.size_jumbo) || 0;
    const d = parseInt(form.dirty_count) || 0;

    if (s < 0 || m < 0 || l < 0 || xl < 0 || j < 0 || d < 0) {
      setErr('Quantities cannot be negative.');
      return;
    }

    setSaving(true);
    setErr('');
    try {
      await eggsApi.createGrading({
        collection_id: parseInt(form.collection_id),
        size_s: s,
        size_m: m,
        size_l: l,
        size_xl: xl,
        size_jumbo: j,
        dirty_count: d,
        graded_date: form.graded_date,
      });
      await loadData();
      setModal(false);
    } catch (e) {
      setErr(e.message || 'Failed to log grading.');
    } finally {
      setSaving(false);
    }
  };

  const getStock = sizeName => {
    const inv = inventory.find(i => i.size === sizeName);
    return inv ? inv.stock_qty : 0;
  };

  // Convert egg count to trays (30 eggs per tray)
  const toTrays = count => {
    const trays = Math.floor(count / 30);
    const rem = count % 30;
    return rem > 0 ? `${trays} trays (+${rem} pcs)` : `${trays} trays`;
  };

  const tableRows = gradings.map(g => {
    const col = collections.find(c => c.id === g.collection_id) || { collect_date: '—', total_collected: 0 };
    return {
      id: g.id,
      date: g.graded_date,
      colDate: col.collect_date,
      colQty: (col.total_collected || 0).toLocaleString(),
      s: g.size_s.toLocaleString(),
      m: g.size_m.toLocaleString(),
      l: g.size_l.toLocaleString(),
      xl: g.size_xl.toLocaleString(),
      jumbo: g.size_jumbo.toLocaleString(),
      dirty: g.dirty_count.toLocaleString(),
      total: (g.size_s + g.size_m + g.size_l + g.size_xl + g.size_jumbo + g.dirty_count).toLocaleString(),
    };
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadErr && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>
          {loadErr}
        </div>
      )}
      <PrintPageHeader title="Egg Sorting & Grading" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Egg Sorting & Grading</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Sort collected eggs into sizes and manage salable inventory.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton title="Egg Grading" />
          <Button onClick={handleOpenAdd} icon={<I.plus w={15} />}>Log Grading</Button>
        </div>
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-strong)', margin: '10px 0 0' }}>Current Stock Levels (by Size)</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 16 }} className="stat-grid">
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>SMALL</span>
          <span style={QTY_STYLE}>{getStock('S').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('S'))}</span>
        </div>
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>MEDIUM</span>
          <span style={QTY_STYLE}>{getStock('M').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('M'))}</span>
        </div>
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>LARGE</span>
          <span style={QTY_STYLE}>{getStock('L').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('L'))}</span>
        </div>
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>EXTRA LARGE</span>
          <span style={QTY_STYLE}>{getStock('XL').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('XL'))}</span>
        </div>
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>JUMBO</span>
          <span style={QTY_STYLE}>{getStock('Jumbo').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('Jumbo'))}</span>
        </div>
        <div style={STOCK_CARD}>
          <span style={SIZE_LABEL}>CRACKED / REJECTS</span>
          <span style={{ ...QTY_STYLE, color: 'var(--danger)' }}>{getStock('Cracked').toLocaleString()}</span>
          <span style={TRAY_STYLE}>{toTrays(getStock('Cracked'))}</span>
        </div>
      </div>

      <Card title="Egg Grading Logs">
        <DataTable
          columns={[
            { key: 'date', header: 'Graded Date', strong: true },
            { key: 'colDate', header: 'Collection Date' },
            { key: 'colQty', header: 'Raw Harvest Qty', align: 'right', numeric: true },
            { key: 's', header: 'Small', align: 'right', numeric: true },
            { key: 'm', header: 'Medium', align: 'right', numeric: true },
            { key: 'l', header: 'Large', align: 'right', numeric: true },
            { key: 'xl', header: 'XL', align: 'right', numeric: true },
            { key: 'jumbo', header: 'Jumbo', align: 'right', numeric: true },
            { key: 'dirty', header: 'Dirty / Rejects', align: 'right', numeric: true },
            { key: 'total', header: 'Total Graded', align: 'right', numeric: true },
          ]}
          rows={tableRows}
          rowKey="id"
        />
      </Card>

      <Modal open={modal} title="Log Egg Size Grading" onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel="Log Sizes" loading={saving}>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <FormRow label="Raw Egg Collection Batch" required>
          <select value={form.collection_id} onChange={f('collection_id')} style={SEL_STYLE}>
            <option value="">— Select Collection —</option>
            {collections.map(c => (
              <option key={c.id} value={c.id}>
                {c.collect_date} — {c.total_collected} eggs (cracked: {c.cracked_count})
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Grading Date" required>
          <FieldInput type="date" value={form.graded_date} onChange={f('graded_date')} />
        </FormRow>
        
        <h4 style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>Size Breakdown (Eggs Count)</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FormRow label="Small (S)" required>
            <FieldInput type="number" value={form.size_s} onChange={f('size_s')} />
          </FormRow>
          <FormRow label="Medium (M)" required>
            <FieldInput type="number" value={form.size_m} onChange={f('size_m')} />
          </FormRow>
          <FormRow label="Large (L)" required>
            <FieldInput type="number" value={form.size_l} onChange={f('size_l')} />
          </FormRow>
          <FormRow label="Extra Large (XL)" required>
            <FieldInput type="number" value={form.size_xl} onChange={f('size_xl')} />
          </FormRow>
          <FormRow label="Jumbo" required>
            <FieldInput type="number" value={form.size_jumbo} onChange={f('size_jumbo')} />
          </FormRow>
          <FormRow label="Dirty / Soft Shell" required>
            <FieldInput type="number" value={form.dirty_count} onChange={f('dirty_count')} />
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}

const STOCK_CARD = {
  background: '#fff',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '14px 18px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 4,
};

const SIZE_LABEL = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-secondary)',
  letterSpacing: '0.04em',
};

const QTY_STYLE = {
  fontSize: 22,
  fontWeight: 800,
  color: 'var(--text-strong)',
  lineHeight: 1.2,
};

const TRAY_STYLE = {
  fontSize: 11,
  color: 'var(--text-muted)',
};

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
