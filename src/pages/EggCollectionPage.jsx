import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { StatCard } from '../components/data/StatCard';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput } from '../components/core/Modal';
import { LineChart } from '../charts';
import { eggsApi, batchesApi, farmsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { PrintButton, PrintPageHeader } from '../components/core/PrintButton';
import Icons from '../icons';

const I = Icons;

export default function EggCollectionPage() {
  const { farmId } = useFarm();

  const [collections, setCollections] = useState([]);
  const [batches, setBatches] = useState([]);
  const [houses, setHouses] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState('');

  const [form, setForm] = useState({
    batch_id: '',
    house_id: '',
    collect_date: new Date().toISOString().split('T')[0],
    total_collected: '',
    cracked_count: '0',
    soft_shell: '0',
    double_yolk: '0',
    dirty: '0',
    misshaped: '0',
    reject: '0',
    waste: '0',
    feed_kg: '',
    water_liters: '',
    temperature: '',
    humidity: '',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [cols, b, h, m] = await Promise.all([
        eggsApi.listCollections({ farm_id: farmId }),
        batchesApi.list({ farm_id: farmId, status: 'active' }),
        farmsApi.houses(farmId),
        eggsApi.getMetrics({ farm_id: farmId }),
      ]);
      setCollections(cols || []);
      setBatches(b || []);
      setHouses(h || []);
      setMetrics(m);
    } catch (e) {
      setLoadErr(e.message || 'Failed to load egg collections data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (farmId) loadData();
  }, [farmId]);

  const f = k => e => {
    const val = e.target.value;
    setForm(p => {
      const updated = { ...p, [k]: val };
      // If batch is selected, auto-populate house_id from batch
      if (k === 'batch_id') {
        const selectedBatch = batches.find(b => b.id === parseInt(val));
        if (selectedBatch) {
          updated.house_id = String(selectedBatch.house_id);
        }
      }
      return updated;
    });
  };

  const handleOpenAdd = () => {
    setForm({
      batch_id: batches[0]?.id ? String(batches[0].id) : '',
      house_id: batches[0]?.house_id ? String(batches[0].house_id) : '',
      collect_date: new Date().toISOString().split('T')[0],
      total_collected: '',
      cracked_count: '0',
      soft_shell: '0',
      double_yolk: '0',
      dirty: '0',
      misshaped: '0',
      reject: '0',
      waste: '0',
      feed_kg: '',
      water_liters: '',
      temperature: '',
      humidity: '',
      notes: '',
    });
    setErr('');
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.batch_id) { setErr('Batch selection is required.'); return; }
    if (!form.house_id) { setErr('House selection is required.'); return; }
    if (!form.total_collected || parseInt(form.total_collected) <= 0) {
      setErr('Total collected eggs must be greater than zero.');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const cracked = parseInt(form.cracked_count) || 0;
      const defect_summary = {
        cracked,
        soft_shell:  parseInt(form.soft_shell)  || 0,
        double_yolk: parseInt(form.double_yolk) || 0,
        dirty:       parseInt(form.dirty)       || 0,
        misshaped:   parseInt(form.misshaped)   || 0,
        reject:      parseInt(form.reject)      || 0,
        waste:       parseInt(form.waste)       || 0,
      };
      const feed_water_log = (form.feed_kg || form.water_liters || form.temperature || form.humidity) ? {
        feed_kg:      parseFloat(form.feed_kg)      || null,
        water_liters: parseFloat(form.water_liters) || null,
        temperature:  parseFloat(form.temperature)  || null,
        humidity:     parseFloat(form.humidity)      || null,
      } : null;
      await eggsApi.createCollection({
        batch_id:       parseInt(form.batch_id),
        house_id:       parseInt(form.house_id),
        collect_date:   form.collect_date,
        total_collected: parseInt(form.total_collected),
        cracked_count:  cracked,
        defect_summary,
        feed_water_log,
        notes: form.notes || null,
      });
      await loadData();
      setModal(false);
    } catch (e) {
      setErr(e.message || 'Failed to save collection.');
    } finally {
      setSaving(false);
    }
  };

  const trendData = metrics?.trend || [];
  const chartData = trendData.map(t => t.hen_day_pct);
  const chartLabels = trendData.map(t => t.date);

  const tableRows = collections.map(c => {
    const b = batches.find(x => x.id === c.batch_id) || { batch_no: `Batch #${c.batch_id}` };
    const h = houses.find(x => x.id === c.house_id) || { name: `House #${c.house_id}` };
    return {
      id: c.id,
      date: c.collect_date,
      batch: b.batch_no,
      house: h.name,
      total: (c.total_collected || 0).toLocaleString(),
      cracked: (c.cracked_count || 0).toLocaleString(),
      good: ((c.total_collected - c.cracked_count) || 0).toLocaleString(),
      notes: c.notes || '—',
    };
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {loadErr && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>
          {loadErr}
        </div>
      )}
      <PrintPageHeader title="Egg Collections" />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Egg Collections</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Log and track daily egg production and Hen-Day %.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <PrintButton title="Egg Collections" />
          <Button onClick={handleOpenAdd} icon={<I.plus w={15} />}>Log Collection</Button>
        </div>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <StatCard label="Total Eggs Collected" value={loading ? '—' : (metrics?.total_collected || 0).toLocaleString()} icon={<I.percent w={22} />} />
        <StatCard label="Flock Defect Rate" value={loading ? '—' : `${(metrics?.defect_rate || 0).toFixed(2)}%`} tone={metrics?.defect_rate > 3 ? 'red' : 'green'} icon={<I.mortality w={22} />} caption="cracked or broken eggs" />
        <StatCard label="Egg Sales (delivered)" value={loading ? '—' : `₱${(metrics?.total_sales || 0).toLocaleString()}`} tone="blue" icon={<I.trendUp w={22} />} />
      </div>

      {trendData.length > 0 && (
        <Card title="Hen-Day Laying Percentage (%) — Last 30 Records">
          <LineChart data={chartData} labels={chartLabels} color="var(--success)" />
        </Card>
      )}

      <Card title="Daily Harvest Logs">
        <DataTable
          columns={[
            { key: 'date', header: 'Collect Date', strong: true },
            { key: 'batch', header: 'flock Batch' },
            { key: 'house', header: 'Poultry House' },
            { key: 'total', header: 'Total Collected', align: 'right', numeric: true },
            { key: 'cracked', header: 'Cracked / Broken', align: 'right', numeric: true },
            { key: 'good', header: 'Good / Salable', align: 'right', numeric: true },
            { key: 'notes', header: 'Notes' },
          ]}
          rows={tableRows}
          rowKey="id"
        />
      </Card>

      <Modal open={modal} title="Log Daily Egg Collection" onClose={() => setModal(false)} onConfirm={handleSave} confirmLabel="Save Log" loading={saving}>
        {err && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <FormRow label="Batch (Laying Flock)" required>
          <select value={form.batch_id} onChange={f('batch_id')} style={SEL_STYLE}>
            <option value="">— Select Laying Batch —</option>
            {batches.map(b => (
              <option key={b.id} value={b.id}>{b.batch_no} ({b.house})</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="House" required>
          <select value={form.house_id} onChange={f('house_id')} style={SEL_STYLE} disabled>
            <option value="">— Select House —</option>
            {houses.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </FormRow>
        <FormRow label="Collection Date" required>
          <FieldInput type="date" value={form.collect_date} onChange={f('collect_date')} />
        </FormRow>
        <FormRow label="Total Eggs Collected" required>
          <FieldInput type="number" value={form.total_collected} onChange={f('total_collected')} placeholder="e.g. 500" />
        </FormRow>
        <FormRow label="Cracked / Damaged Count">
          <FieldInput type="number" value={form.cracked_count} onChange={f('cracked_count')} placeholder="0" />
        </FormRow>
        <div style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          Defect Breakdown (optional)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormRow label="Soft Shell">
            <FieldInput type="number" value={form.soft_shell} onChange={f('soft_shell')} placeholder="0" />
          </FormRow>
          <FormRow label="Double Yolk">
            <FieldInput type="number" value={form.double_yolk} onChange={f('double_yolk')} placeholder="0" />
          </FormRow>
          <FormRow label="Dirty Eggs">
            <FieldInput type="number" value={form.dirty} onChange={f('dirty')} placeholder="0" />
          </FormRow>
          <FormRow label="Misshaped">
            <FieldInput type="number" value={form.misshaped} onChange={f('misshaped')} placeholder="0" />
          </FormRow>
          <FormRow label="Reject">
            <FieldInput type="number" value={form.reject} onChange={f('reject')} placeholder="0" />
          </FormRow>
          <FormRow label="Waste">
            <FieldInput type="number" value={form.waste} onChange={f('waste')} placeholder="0" />
          </FormRow>
        </div>
        <div style={{ margin: '12px 0 4px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
          Feed & Water Log (optional)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormRow label="Feed Consumed (kg)">
            <FieldInput type="number" step="0.1" value={form.feed_kg} onChange={f('feed_kg')} placeholder="e.g. 1085.5" />
          </FormRow>
          <FormRow label="Water Used (liters)">
            <FieldInput type="number" step="1" value={form.water_liters} onChange={f('water_liters')} placeholder="e.g. 3850" />
          </FormRow>
          <FormRow label="Temperature (°C)">
            <FieldInput type="number" step="0.1" value={form.temperature} onChange={f('temperature')} placeholder="e.g. 29.4" />
          </FormRow>
          <FormRow label="Humidity (%)">
            <FieldInput type="number" step="1" value={form.humidity} onChange={f('humidity')} placeholder="e.g. 71" />
          </FormRow>
        </div>
        <FormRow label="Notes">
          <textarea value={form.notes} onChange={f('notes')} placeholder="Optional comments..." style={TXT_STYLE} />
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
