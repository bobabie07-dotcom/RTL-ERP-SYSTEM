import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StatCard } from '../components/data/StatCard';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { ProgressRing } from '../components/data/ProgressRing';
import { LineChart } from '../charts';
import { batchesApi, healthApi, batchPlansApi, salesApi, harvestApi, batchFinanceApi } from '../api/client';
import { getStoredMarketPrice } from '../utils/useMarketPrice';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE  = { active: 'success', harvest_soon: 'warning', harvested: 'neutral', terminated: 'danger' };
const STATUS_LABEL = { active: 'Active', harvest_soon: 'Harvest Soon', harvested: 'Harvested', terminated: 'Terminated' };
const EVENT_TONE   = { vaccination: 'info', medication: 'warning', weighing: 'neutral', vet_visit: 'info', observation: 'neutral', culling: 'danger' };
const EVENT_LABEL  = { vaccination: 'Vaccination', medication: 'Medication', weighing: 'Weighing', vet_visit: 'Vet Visit', observation: 'Observation', culling: 'Culling' };
const VACC_TONE    = { upcoming: 'neutral', done: 'success', missed: 'danger' };
const EXP_LABEL    = { labor: 'Labor', utilities: 'Utilities', maintenance: 'Maintenance', transport: 'Transport', chicks: 'Chicks', other: 'Other' };

const fmt = n => n == null ? '—' : `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pColor = n => n == null ? 'inherit' : n >= 0 ? 'var(--success)' : 'var(--danger)';

const TODAY = new Date().toISOString().split('T')[0];

const BLANK_PLAN = {
  supplier_name: '', bird_cost_per_head: '', delivery_cost_per_head: '',
  infrastructure_cost: '', contract_price_per_head: '', notes: '',
  feed_phases: [
    { feed_type_name: 'Chick Booster Crumble', grams_per_day: '60',  duration_days: '30', cost_per_50kg: '' },
    { feed_type_name: 'Chick Starter Mash',    grams_per_day: '85',  duration_days: '30', cost_per_50kg: '' },
    { feed_type_name: 'Chick Grower Mash',     grams_per_day: '100', duration_days: '20', cost_per_50kg: '' },
    { feed_type_name: 'Chicken Layer Mash',    grams_per_day: '120', duration_days: '20', cost_per_50kg: '' },
  ],
  expense_items: [
    { category: 'Medicine & Vitamins', qty: '', period: 'Batch',  unit_cost: '', notes: 'Per head budget' },
    { category: 'Labor',               qty: '', period: 'Days',   unit_cost: '500', notes: '₱500/day' },
    { category: 'Water & Electricity', qty: '', period: 'Months', unit_cost: '1500', notes: '₱1,500/month' },
    { category: 'Equipment & Supplies',qty: '', period: '',       unit_cost: '', notes: 'As needed' },
    { category: 'Transportation',      qty: '', period: '',       unit_cost: '', notes: 'As needed' },
    { category: 'Others',              qty: '', period: '',       unit_cost: '', notes: '' },
  ],
};
const BLANK_PHASE   = { feed_type_name: '', grams_per_day: '', duration_days: '', cost_per_50kg: '' };
const BLANK_EXPENSE_ITEM = { category: '', qty: '', period: '', unit_cost: '', notes: '' };

export default function BatchDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { farmId } = useFarm();
  const { user } = useAuth();

  const BLANK_EVENT   = { event_type: 'observation', event_date: TODAY, description: '', cost: '', status: 'done' };
  const BLANK_LOG     = { log_date: TODAY, current_count: '', mortality_count: '0', avg_weight_g: '', culls: '0', notes: '' };
  const BLANK_VACC    = { vaccine_id: '', scheduled_date: TODAY, route: 'water', dose_per_bird: '', cost_per_dose: '', total_cost: '', notes: '' };
  const BLANK_EXP     = { category: 'labor', amount: '', expense_date: TODAY, description: '' };
  const BLANK_HARVEST = { harvest_date: TODAY, birds_harvested: '', total_weight_kg: '', price_per_kg: '', buyer_name: '', notes: '' };

  const [batch,       setBatch]       = useState(null);
  const [logs,        setLogs]        = useState([]);
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);
  const [pageErr,     setPageErr]     = useState('');

  // Daily log modal
  const [logModal,    setLogModal]    = useState(false);
  const [logForm,     setLogForm]     = useState(BLANK_LOG);
  const [logSaving,   setLogSaving]   = useState(false);
  const [logErr,      setLogErr]      = useState('');
  const [editLogId,      setEditLogId]      = useState(null);
  const [deleteLogModal, setDeleteLogModal] = useState(false);
  const [deleteLogTarget,setDeleteLogTarget]= useState(null);
  const [deletingLog,    setDeletingLog]    = useState(false);

  // Vaccination
  const [vaccinations, setVaccinations] = useState([]);
  const [medications,  setMedications]  = useState([]);
  const [vaccModal,    setVaccModal]    = useState(false);
  const [vaccForm,     setVaccForm]     = useState(BLANK_VACC);
  const [vaccSaving,   setVaccSaving]   = useState(false);
  const [vaccErr,      setVaccErr]      = useState('');
  const [editVaccId,       setEditVaccId]       = useState(null);
  const [deleteVaccModal,  setDeleteVaccModal]  = useState(false);
  const [deleteVaccTarget, setDeleteVaccTarget] = useState(null);
  const [deletingVacc,     setDeletingVacc]     = useState(false);

  // Expenses
  const [expenses,    setExpenses]    = useState([]);
  const [expModal,    setExpModal]    = useState(false);
  const [expForm,     setExpForm]     = useState(BLANK_EXP);
  const [expSaving,   setExpSaving]   = useState(false);
  const [expErr,      setExpErr]      = useState('');

  // Harvest
  const [harvest,         setHarvest]         = useState(null);
  const [harvestPnl,      setHarvestPnl]      = useState(null);
  const [harvestModal,    setHarvestModal]    = useState(false);
  const [harvestForm,     setHarvestForm]     = useState(BLANK_HARVEST);
  const [harvestSaving,   setHarvestSaving]   = useState(false);
  const [harvestErr,      setHarvestErr]      = useState('');
  const [harvestEditMode, setHarvestEditMode] = useState(false);
  // Health event modal
  const [recordModal, setRecordModal] = useState(false);
  const [recForm,     setRecForm]     = useState(BLANK_EVENT);
  const [recSaving,   setRecSaving]   = useState(false);
  const [recErr,      setRecErr]      = useState('');

  // Financial plan
  const [plan,            setPlan]            = useState(null);
  const [planLoading,     setPlanLoading]     = useState(false);
  const [planModal,       setPlanModal]       = useState(false);
  const [planForm,        setPlanForm]        = useState(BLANK_PLAN);
  const [planSaving,      setPlanSaving]      = useState(false);
  const [planErr,         setPlanErr]         = useState('');
  const [planDeleteModal, setPlanDeleteModal] = useState(false);
  const [planDeleting,    setPlanDeleting]    = useState(false);

  // Finance
  const [finPnl,          setFinPnl]          = useState(null);
  const [finExpenses,     setFinExpenses]      = useState([]);
  const [finRevenues,     setFinRevenues]      = useState([]);
  const [finCategories,   setFinCategories]    = useState([]);
  const [finLoading,      setFinLoading]       = useState(false);
  const [finExpModal,     setFinExpModal]      = useState(false);
  const [finRevModal,     setFinRevModal]      = useState(false);
  const [finEditExp,      setFinEditExp]       = useState(null);
  const [finExpForm,      setFinExpForm]       = useState({ expense_date: TODAY, category_code: 'LABOR', amount: '', qty: '', unit: '', description: '' });
  const [finRevForm,      setFinRevForm]       = useState({ revenue_date: TODAY, category: 'SALES', amount: '', qty_kg: '', price_per_kg: '', description: '' });
  const [finExpSaving,    setFinExpSaving]     = useState(false);
  const [finRevSaving,    setFinRevSaving]     = useState(false);
  const [finExpErr,       setFinExpErr]        = useState('');
  const [finRevErr,       setFinRevErr]        = useState('');

  useEffect(() => {
    Promise.all([
      batchesApi.get(id),
      batchesApi.logs(id),
      healthApi.events({ batch_id: id }),
    ]).then(([b, l, e]) => {
      setBatch(b); setLogs(l || []); setEvents(e || []);
      if (b.status === 'harvested') {
        return Promise.all([
          harvestApi.get(id).catch(() => null),
          harvestApi.pnl(id).catch(() => null),
        ]).then(([h, pnl]) => { setHarvest(h); setHarvestPnl(pnl); });
      }
    }).catch(err => {
      if (err.message?.includes('404') || err.message?.includes('not found')) setNotFound(true);
      else console.error(err);
    }).finally(() => setLoading(false));

    loadPlan();
    loadVaccinations();
    loadExpenses();
    loadFinance();
    healthApi.medications('vaccine').then(setMedications).catch(() => {});
  }, [id]);

  function loadPlan() {
    setPlanLoading(true);
    batchPlansApi.get(id).then(setPlan).catch(() => setPlan(null)).finally(() => setPlanLoading(false));
  }
  function loadVaccinations() {
    healthApi.vaccinations({ batch_id: id }).then(v => setVaccinations(v || [])).catch(() => {});
  }
  function loadExpenses() {
    salesApi.expenses({ batch_id: id }).then(e => setExpenses(e || [])).catch(() => {});
  }
  function loadFinance() {
    setFinLoading(true);
    Promise.all([
      batchFinanceApi.pnl(id).catch(() => null),
      batchFinanceApi.expenses(id).catch(() => []),
      batchFinanceApi.revenues(id).catch(() => []),
      batchFinanceApi.categories(id).catch(() => []),
    ]).then(([pnl, exps, revs, cats]) => {
      setFinPnl(pnl);
      setFinExpenses(exps || []);
      setFinRevenues(revs || []);
      setFinCategories(cats || []);
    }).finally(() => setFinLoading(false));
  }

  // ── Daily Log ──────────────────────────────────────────────────────────────
  function openEditLog(log) {
    setLogForm({
      log_date:        String(log.log_date),
      current_count:   String(log.current_count),
      mortality_count: String(log.mortality_count),
      avg_weight_g:    log.avg_weight_g ? String(log.avg_weight_g) : '',
      culls:           String(log.culls),
      notes:           log.notes || '',
    });
    setEditLogId(log.id);
    setLogErr('');
    setLogModal(true);
  }
  async function handleLogSave() {
    if (!logForm.current_count) { setLogErr('Current count is required.'); return; }
    setLogSaving(true); setLogErr('');
    try {
      const data = {
        log_date:        logForm.log_date,
        current_count:   parseInt(logForm.current_count),
        mortality_count: parseInt(logForm.mortality_count) || 0,
        avg_weight_g:    logForm.avg_weight_g ? parseInt(logForm.avg_weight_g) : null,
        culls:           parseInt(logForm.culls) || 0,
        notes:           logForm.notes || null,
      };
      if (editLogId) {
        await batchesApi.updateLog(id, editLogId, data);
      } else {
        await batchesApi.addLog(id, data);
      }
      const [updated, updatedBatch] = await Promise.all([batchesApi.logs(id), batchesApi.get(id)]);
      setLogs(updated || []); setBatch(updatedBatch);
      setLogModal(false); setEditLogId(null);
    } catch (e) { setLogErr(e.message || 'Failed to save log.'); }
    finally { setLogSaving(false); }
  }
  async function handleDeleteLog() {
    if (!deleteLogTarget) return;
    setDeletingLog(true);
    try {
      await batchesApi.deleteLog(id, deleteLogTarget.id);
      const [updated, updatedBatch] = await Promise.all([batchesApi.logs(id), batchesApi.get(id)]);
      setLogs(updated || []); setBatch(updatedBatch);
      setDeleteLogModal(false); setDeleteLogTarget(null);
    } catch (e) { setDeleteLogModal(false); setPageErr(e.message || 'Failed to delete log.'); }
    finally { setDeletingLog(false); }
  }

  // ── Vaccination ────────────────────────────────────────────────────────────
  function openEditVacc(vacc) {
    setVaccForm({
      vaccine_id:     String(vacc.vaccine_id),
      scheduled_date: String(vacc.scheduled_date),
      route:          vacc.route,
      dose_per_bird:  vacc.dose_per_bird || '',
      cost_per_dose:  vacc.cost_per_dose != null ? String(vacc.cost_per_dose) : '',
      total_cost:     vacc.total_cost    != null ? String(vacc.total_cost)    : '',
      notes:          vacc.notes || '',
    });
    setEditVaccId(vacc.id);
    setVaccErr('');
    setVaccModal(true);
  }
  async function handleVaccSave() {
    if (!vaccForm.vaccine_id || !vaccForm.scheduled_date) { setVaccErr('Vaccine and date required.'); return; }
    setVaccSaving(true); setVaccErr('');
    try {
      const payload = {
        ...vaccForm,
        vaccine_id:    parseInt(vaccForm.vaccine_id),
        cost_per_dose: vaccForm.cost_per_dose ? parseFloat(vaccForm.cost_per_dose) : null,
        total_cost:    vaccForm.total_cost    ? parseFloat(vaccForm.total_cost)    : null,
      };
      if (editVaccId) {
        await healthApi.updateVaccination(editVaccId, payload);
      } else {
        await healthApi.createVaccination({ batch_id: parseInt(id), ...payload });
      }
      loadVaccinations();
      setVaccModal(false); setEditVaccId(null);
    } catch (e) { setVaccErr(e.message || 'Failed to save.'); }
    finally { setVaccSaving(false); }
  }
  async function handleDeleteVacc() {
    if (!deleteVaccTarget) return;
    setDeletingVacc(true);
    try {
      await healthApi.deleteVaccination(deleteVaccTarget.id);
      loadVaccinations();
      setDeleteVaccModal(false); setDeleteVaccTarget(null);
    } catch (e) { setDeleteVaccModal(false); setPageErr(e.message || 'Failed to delete vaccination.'); }
    finally { setDeletingVacc(false); }
  }
  async function markVaccDone(vacc) {
    await healthApi.updateVaccination(vacc.id, { status: 'done', completed_date: TODAY });
    loadVaccinations();
  }

  // ── Expenses ───────────────────────────────────────────────────────────────
  async function handleExpSave() {
    if (!expForm.amount || !expForm.expense_date) { setExpErr('Amount and date are required.'); return; }
    setExpSaving(true); setExpErr('');
    try {
      await salesApi.createExpense({
        batch_id:     parseInt(id),
        farm_id:      farmId,
        category:     expForm.category,
        amount:       parseFloat(expForm.amount),
        expense_date: expForm.expense_date,
        description:  expForm.description || null,
      });
      loadExpenses();
      setExpModal(false);
    } catch (e) { setExpErr(e.message || 'Failed to save.'); }
    finally { setExpSaving(false); }
  }

  // ── Health event ───────────────────────────────────────────────────────────
  async function handleRecord() {
    if (!recForm.event_date || !recForm.event_type) { setRecErr('Event type and date are required.'); return; }
    setRecSaving(true); setRecErr('');
    try {
      await healthApi.createEvent({
        batch_id: Number(id),
        ...recForm,
        cost: recForm.cost ? parseFloat(recForm.cost) : null,
      });
      const updated = await healthApi.events({ batch_id: id });
      setEvents(updated || []);
      setRecordModal(false);
    } catch (err) { setRecErr(err.message || 'Failed to save.'); }
    finally { setRecSaving(false); }
  }

  // ── Harvest ────────────────────────────────────────────────────────────────
  function openHarvestCreate() {
    setHarvestForm({ ...BLANK_HARVEST, birds_harvested: String(batch.current_count || ''), price_per_kg: String(getStoredMarketPrice()) });
    setHarvestEditMode(false); setHarvestErr(''); setHarvestModal(true);
  }
  function openHarvestEdit() {
    setHarvestForm({ harvest_date: harvest.harvest_date, birds_harvested: String(harvest.birds_harvested), total_weight_kg: String(harvest.total_weight_kg), price_per_kg: String(harvest.price_per_kg), buyer_name: harvest.buyer_name || '', notes: harvest.notes || '' });
    setHarvestEditMode(true); setHarvestErr(''); setHarvestModal(true);
  }
  async function handleHarvestSave() {
    if (!harvestForm.birds_harvested || !harvestForm.total_weight_kg || !harvestForm.price_per_kg) {
      setHarvestErr('Birds harvested, total weight, and price per kg are required.'); return;
    }
    setHarvestSaving(true); setHarvestErr('');
    try {
      const data = { harvest_date: harvestForm.harvest_date, birds_harvested: parseInt(harvestForm.birds_harvested), total_weight_kg: parseFloat(harvestForm.total_weight_kg), price_per_kg: parseFloat(harvestForm.price_per_kg), buyer_name: harvestForm.buyer_name || null, notes: harvestForm.notes || null };
      const saved = harvestEditMode ? await harvestApi.update(id, data) : await harvestApi.create(id, data);
      setHarvest(saved);
      const [updatedBatch, updatedPnl] = await Promise.all([batchesApi.get(id), harvestApi.pnl(id)]);
      setBatch(updatedBatch); setHarvestPnl(updatedPnl); setHarvestModal(false);
    } catch (e) { setHarvestErr(e.message || 'Failed to save harvest record.'); }
    finally { setHarvestSaving(false); }
  }

  // ── Financial Plan ─────────────────────────────────────────────────────────
  function openPlanModal() {
    if (plan) {
      setPlanForm({
        supplier_name:           plan.supplier_name || '',
        bird_cost_per_head:      plan.bird_cost_per_head ?? '',
        delivery_cost_per_head:  plan.delivery_cost_per_head ?? '',
        infrastructure_cost:     plan.infrastructure_cost ?? '',
        contract_price_per_head: plan.contract_price_per_head ?? '',
        notes:                   plan.notes || '',
        feed_phases: plan.feed_phases.map(p => ({ feed_type_name: p.feed_type_name, grams_per_day: String(p.grams_per_day), duration_days: String(p.duration_days), cost_per_50kg: String(p.cost_per_50kg) })),
        expense_items: plan.expense_items.map(e => ({ category: e.category, qty: String(e.qty), period: e.period || '', unit_cost: String(e.unit_cost), notes: e.notes || '' })),
      });
    } else { setPlanForm(BLANK_PLAN); }
    setPlanErr(''); setPlanModal(true);
  }
  async function handlePlanSave() {
    setPlanSaving(true); setPlanErr('');
    try {
      const saved = await batchPlansApi.upsert(id, {
        bird_cost_per_head:      parseFloat(planForm.bird_cost_per_head) || 0,
        delivery_cost_per_head:  parseFloat(planForm.delivery_cost_per_head) || 0,
        infrastructure_cost:     parseFloat(planForm.infrastructure_cost) || 0,
        contract_price_per_head: planForm.contract_price_per_head ? parseFloat(planForm.contract_price_per_head) : null,
        supplier_name:           planForm.supplier_name || null,
        notes:                   planForm.notes || null,
        feed_phases:  planForm.feed_phases.filter(p => p.feed_type_name).map((p, i) => ({ phase_order: i, feed_type_name: p.feed_type_name, grams_per_day: parseInt(p.grams_per_day) || 0, duration_days: parseInt(p.duration_days) || 0, cost_per_50kg: parseFloat(p.cost_per_50kg) || 0 })),
        expense_items: planForm.expense_items.filter(e => e.category).map(e => ({ category: e.category, qty: parseFloat(e.qty) || 0, period: e.period || null, unit_cost: parseFloat(e.unit_cost) || 0, notes: e.notes || null })),
      });
      setPlan(saved); setPlanModal(false);
    } catch (e) { setPlanErr(e.message || 'Failed to save plan.'); }
    finally { setPlanSaving(false); }
  }
  async function handlePlanDelete() {
    setPlanDeleting(true);
    try {
      await batchPlansApi.delete(id);
      setPlan(null); setPlanDeleteModal(false);
    } catch (e) { setPageErr(e.message || 'Failed to delete plan.'); }
    finally { setPlanDeleting(false); }
  }

  const lf = k => e => setLogForm(p     => ({ ...p, [k]: e.target.value }));
  const vf = k => e => setVaccForm(p   => ({ ...p, [k]: e.target.value }));
  const ef = k => e => setExpForm(p    => ({ ...p, [k]: e.target.value }));
  const rf = k => e => setRecForm(p    => ({ ...p, [k]: e.target.value }));
  const pf = k => e => setPlanForm(p   => ({ ...p, [k]: e.target.value }));
  const hf = k => e => setHarvestForm(p => ({ ...p, [k]: e.target.value }));

  function updatePhase(idx, key, val) { setPlanForm(p => { const a = [...p.feed_phases]; a[idx] = { ...a[idx], [key]: val }; return { ...p, feed_phases: a }; }); }
  function addPhase()    { setPlanForm(p => ({ ...p, feed_phases: [...p.feed_phases, { ...BLANK_PHASE }] })); }
  function removePhase(i){ setPlanForm(p => ({ ...p, feed_phases: p.feed_phases.filter((_, j) => j !== i) })); }
  function updateExpItem(idx, key, val) { setPlanForm(p => { const a = [...p.expense_items]; a[idx] = { ...a[idx], [key]: val }; return { ...p, expense_items: a }; }); }
  function addExpItem()    { setPlanForm(p => ({ ...p, expense_items: [...p.expense_items, { ...BLANK_EXPENSE_ITEM }] })); }
  function removeExpItem(i){ setPlanForm(p => ({ ...p, expense_items: p.expense_items.filter((_, j) => j !== i) })); }

  // ── Finance handlers ───────────────────────────────────────────────────────
  const ff  = k => e => setFinExpForm(p => ({ ...p, [k]: e.target.value }));
  const frf = k => e => setFinRevForm(p => ({ ...p, [k]: e.target.value }));

  function openFinExpAdd() {
    setFinEditExp(null);
    setFinExpForm({ expense_date: TODAY, category_code: finCategories[0]?.code || 'LABOR', amount: '', qty: '', unit: '', description: '' });
    setFinExpErr(''); setFinExpModal(true);
  }
  function openFinExpEdit(row) {
    setFinEditExp(row.id);
    setFinExpForm({ expense_date: String(row.expense_date), category_code: row.category_code, amount: String(row.amount), qty: row.qty != null ? String(row.qty) : '', unit: row.unit || '', description: row.description || '' });
    setFinExpErr(''); setFinExpModal(true);
  }
  async function handleFinExpSave() {
    if (!finExpForm.amount || !finExpForm.expense_date) { setFinExpErr('Amount and date are required.'); return; }
    setFinExpSaving(true); setFinExpErr('');
    try {
      const payload = {
        expense_date:  finExpForm.expense_date,
        category_code: finExpForm.category_code,
        amount:        parseFloat(finExpForm.amount),
        qty:           finExpForm.qty ? parseFloat(finExpForm.qty) : null,
        unit:          finExpForm.unit || null,
        description:   finExpForm.description || null,
      };
      if (finEditExp) {
        await batchFinanceApi.editExpense(id, finEditExp, payload);
      } else {
        await batchFinanceApi.addExpense(id, payload);
      }
      loadFinance();
      setFinExpModal(false); setFinEditExp(null);
    } catch (e) { setFinExpErr(e.message || 'Failed to save.'); }
    finally { setFinExpSaving(false); }
  }
  async function handleFinExpVoid(exp) {
    if (!window.confirm(`Void expense: ${exp.category_name} — ₱${Number(exp.amount).toLocaleString()}?`)) return;
    try {
      await batchFinanceApi.voidExpense(id, exp.id, 'Voided by user');
      loadFinance();
    } catch (e) { setPageErr(e.message || 'Failed to void.'); }
  }
  async function handleFinRevSave() {
    if (!finRevForm.amount || !finRevForm.revenue_date) { setFinRevErr('Amount and date are required.'); return; }
    setFinRevSaving(true); setFinRevErr('');
    try {
      const payload = {
        revenue_date: finRevForm.revenue_date,
        category:     finRevForm.category,
        amount:       parseFloat(finRevForm.amount),
        qty_kg:       finRevForm.qty_kg ? parseFloat(finRevForm.qty_kg) : null,
        price_per_kg: finRevForm.price_per_kg ? parseFloat(finRevForm.price_per_kg) : null,
        description:  finRevForm.description || null,
      };
      await batchFinanceApi.addRevenue(id, payload);
      loadFinance();
      setFinRevModal(false);
    } catch (e) { setFinRevErr(e.message || 'Failed to save.'); }
    finally { setFinRevSaving(false); }
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14 }}>Loading batch...</div>;
  if (notFound || !batch) {
    return (
      <div style={{ padding: 24 }}>
        <Button variant="ghost" size="sm" icon={<I.chevronRight w={15} style={{ transform: 'rotate(180deg)' }} />} onClick={() => navigate('/batches')}>Back</Button>
        <div style={{ marginTop: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>Batch not found.</div>
      </div>
    );
  }

  const progress    = Math.round((batch.age_days / batch.cycle_length_days) * 100);
  const avgWeightKg = batch.avg_weight_g ? (batch.avg_weight_g / 1000).toFixed(2) : 'N/A';
  const survivalPct = batch.current_count && batch.initial_count ? `${((batch.current_count / batch.initial_count) * 100).toFixed(1)}%` : '—';
  const weightData   = logs.slice(-7).map(l => l.avg_weight_g ? l.avg_weight_g / 1000 : 0);
  const weightLabels = logs.slice(-7).map(l => String(l.log_date));
  const healthRows   = events.map(e => ({ ...e, type: EVENT_LABEL[e.event_type] || e.event_type, detail: e.description || '—', by: '—', statusLabel: e.status === 'done' ? 'Done' : e.status === 'upcoming' ? 'Upcoming' : 'Missed' }));
  const totalExpActual = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);
  const upcomingVaccs  = vaccinations.filter(v => v.status === 'upcoming').length;

  const estHarvest = (() => {
    const d = new Date(batch.placed_date);
    d.setDate(d.getDate() + batch.cycle_length_days);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  })();

  // Plan preview helpers
  function previewPhases() {
    const heads = batch.initial_count; let feedTotal = 0;
    const rows = planForm.feed_phases.map((p, i) => {
      const kg = heads * (parseInt(p.grams_per_day) || 0) * (parseInt(p.duration_days) || 0) / 1000;
      const cost = (kg / 50) * (parseFloat(p.cost_per_50kg) || 0);
      feedTotal += cost;
      return { i, ...p, kg: kg.toFixed(1), cost: cost.toFixed(2) };
    });
    return { rows, feedTotal };
  }
  function previewExpItems() {
    let total = 0;
    const rows = planForm.expense_items.map((e, i) => {
      const t = (parseFloat(e.qty) || 0) * (parseFloat(e.unit_cost) || 0);
      total += t; return { i, ...e, total: t.toFixed(2) };
    });
    return { rows, total };
  }
  const { rows: phasePreview, feedTotal: previewFeedTotal } = previewPhases();
  const { rows: expItemPreview, total: previewExpItemTotal } = previewExpItems();
  const previewCapital  = ((parseFloat(planForm.bird_cost_per_head)||0) + (parseFloat(planForm.delivery_cost_per_head)||0)) * batch.initial_count + (parseFloat(planForm.infrastructure_cost)||0);
  const previewRevenue  = (parseFloat(planForm.contract_price_per_head)||0) * batch.initial_count;
  const previewNet      = previewRevenue - previewFeedTotal - previewExpItemTotal - (parseFloat(planForm.infrastructure_cost)||0);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {pageErr && <div style={{ padding: '12px 16px', background: 'var(--danger-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: 'var(--danger)', fontSize: 13 }}>⚠ {pageErr}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Button variant="ghost" size="sm" icon={<I.chevronRight w={15} style={{ transform: 'rotate(180deg)' }} />} onClick={() => navigate('/batches')}>Back</Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>{batch.batch_no}</h2>
              <Badge tone={STATUS_TONE[batch.status] || 'neutral'} dot>{STATUS_LABEL[batch.status] || batch.status}</Badge>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
              {batch.house} · {batch.farm} · placed {batch.placed_date}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" size="md" icon={<I.plus w={16} />} onClick={() => { setLogForm({ ...BLANK_LOG, current_count: String(batch.current_count || '') }); setLogErr(''); setEditLogId(null); setLogModal(true); }}>Log Today</Button>
          <Button variant="secondary" size="md" icon={<I.syringe w={16} />} onClick={() => { setRecForm(BLANK_EVENT); setRecErr(''); setRecordModal(true); }}>Add Record</Button>
          {batch.status !== 'harvested' && (
            <Button variant="primary" size="md" icon={<I.harvest w={16} />} onClick={openHarvestCreate}>Mark Harvest</Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
        <StatCard label="Current Birds"    value={(batch.current_count || 0).toLocaleString()} icon={<I.birds w={22} />}   caption={`of ${batch.initial_count?.toLocaleString()} placed`} />
        <StatCard label="Avg. Weight"      value={avgWeightKg === 'N/A' ? 'N/A' : `${avgWeightKg} kg`} tone="blue" icon={<I.scale w={22} />} />
        <StatCard label="FCR"              value={(batch.fcr || 0).toFixed(2)} tone="amber" icon={<I.feed w={22} />}       caption="feed conversion" />
        <StatCard label="Survival Rate"    value={survivalPct}                 icon={<I.percent w={22} />} />
        <StatCard label="Actual Expenses"  value={fmt(totalExpActual)}         tone={totalExpActual > 0 ? 'red' : undefined} icon={<I.wallet w={22} />} caption="this batch" />
      </div>

      {/* Charts */}
      <div className="chart-split" style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, alignItems: 'start' }}>
        <Card title="Weight Gain — last 7 recorded entries (kg)">
          <LineChart data={weightData.length ? weightData : [0]} color="var(--info)" labels={weightLabels.length ? weightLabels : ['—']} />
        </Card>
        <Card title="Batch Progress" bodyStyle={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 24px' }}>
          <ProgressRing value={Math.min(progress, 100)} label={`of ${batch.cycle_length_days}-day cycle`} size={120} />
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
            {batch.age_days < 0
              ? <>Starts in <b style={{ color: 'var(--text-strong)' }}>{Math.abs(batch.age_days)}</b> days · est. harvest <b style={{ color: 'var(--text-strong)' }}>{estHarvest}</b></>
              : <>Day <b style={{ color: 'var(--text-strong)' }}>{batch.age_days}</b> of {batch.cycle_length_days} · est. harvest <b style={{ color: 'var(--text-strong)' }}>{estHarvest}</b></>
            }
          </div>
        </Card>
      </div>

      {/* ── Harvest Summary ──────────────────────────────────────────────── */}
      {harvest && (
        <Card title="Harvest Summary" action={
          <Button variant="secondary" size="sm" icon={<I.pencil w={15} />} onClick={openHarvestEdit}>Edit</Button>
        }>
          <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <div style={kpiChip}>
              <span style={chipLabel}>Harvest Date</span>
              <span style={chipVal}>{harvest.harvest_date}</span>
            </div>
            <div style={kpiChip}>
              <span style={chipLabel}>Birds Sold</span>
              <span style={chipVal}>{Number(harvest.birds_harvested).toLocaleString()}</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>of {(batch.initial_count ?? 0).toLocaleString()} placed</span>
            </div>
            <div style={kpiChip}>
              <span style={chipLabel}>Total Weight</span>
              <span style={chipVal}>{parseFloat(harvest.total_weight_kg).toLocaleString()} kg</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>@ ₱{parseFloat(harvest.price_per_kg).toFixed(2)}/kg</span>
            </div>
            <div style={{ ...kpiChip, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 10 }}>
              <span style={chipLabel}>Gross Revenue</span>
              <span style={{ ...chipVal, color: 'var(--success)' }}>{fmt(harvest.total_revenue)}</span>
              {harvest.buyer_name && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{harvest.buyer_name}</span>}
            </div>
          </div>
        </Card>
      )}

      {/* ── Batch P&L ────────────────────────────────────────────────────── */}
      {harvestPnl && (() => {
        const mortalityLoss = harvestPnl.mortality_weight_kg * getStoredMarketPrice();
        const netProfit     = harvestPnl.revenue - harvestPnl.total_expenses - mortalityLoss;
        const margin        = harvestPnl.revenue > 0 ? (netProfit / harvestPnl.revenue * 100) : 0;
        return (
          <Card title="Batch P&L Summary">
            <div style={{ display: 'grid', gridTemplateColumns: plan ? '1fr 1fr' : '1fr', gap: 24 }}>
              <div>
                <PlanSectionTitle>Revenue vs Costs</PlanSectionTitle>
                <PlanTable><tbody>
                  <PlanRow label="Gross Revenue" value={<span style={{ color: 'var(--success)', fontWeight: 700 }}>{fmt(harvestPnl.revenue)}</span>} />
                  {Object.entries(harvestPnl.expense_detail).map(([cat, amt]) => (
                    <PlanRow key={cat} label={`  ${EXP_LABEL[cat] || cat}`} value={<span style={{ color: 'var(--danger)' }}>−{fmt(amt)}</span>} />
                  ))}
                  {harvestPnl.mortality_deaths > 0 && (
                    <PlanRow label={`  Est. Mortality Loss (${harvestPnl.mortality_deaths} birds)`} value={<span style={{ color: 'var(--danger)' }}>−{fmt(mortalityLoss)}</span>} />
                  )}
                  <PlanTotalRow label="Net Profit / Loss" value={fmt(netProfit)} valueColor={pColor(netProfit)} />
                </tbody></PlanTable>
                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Profit Margin: <b style={{ color: pColor(margin) }}>{margin.toFixed(1)}%</b>
                  {harvestPnl.mortality_deaths > 0 && <span style={{ fontSize: 11, marginLeft: 8 }}>· Mortality loss at ₱{getStoredMarketPrice().toFixed(0)}/kg</span>}
                </div>
              </div>
              {plan && (
                <div>
                  <PlanSectionTitle>Plan vs Actual</PlanSectionTitle>
                  <PlanTable><tbody>
                    <PlanRow label="Expected Revenue (plan)" value={fmt(plan.expected_revenue)} />
                    <PlanRow label="Actual Revenue" value={fmt(harvestPnl.revenue)} />
                    <PlanRow label="Revenue Variance" value={<span style={{ color: pColor(harvestPnl.revenue - plan.expected_revenue) }}>{fmt(harvestPnl.revenue - plan.expected_revenue)}</span>} />
                    <PlanRow label="Budgeted Expenses (plan)" value={fmt(plan.total_expenses)} />
                    <PlanRow label="Actual Expenses + Losses" value={fmt(harvestPnl.total_expenses + mortalityLoss)} />
                    <PlanRow label="Expected Net Profit (plan)" value={fmt(plan.gross_profit)} />
                    <PlanTotalRow label="Actual Net Profit" value={fmt(netProfit)} valueColor={pColor(netProfit)} />
                  </tbody></PlanTable>
                </div>
              )}
            </div>
          </Card>
        );
      })()}

      {/* ── Daily Logs ──────────────────────────────────────────────────── */}
      <Card title="Daily Logs" action={
        <Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={() => { setLogForm({ ...BLANK_LOG, current_count: String(batch.current_count || '') }); setLogErr(''); setEditLogId(null); setLogModal(true); }}>
          Log Today
        </Button>
      }>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            No daily logs yet. Click <b>Log Today</b> to record today's count and weight.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'log_date',        header: 'Date',       strong: true },
              { key: 'current_count',   header: 'Live Birds', align: 'right', numeric: true, render: r => (r.current_count ?? 0).toLocaleString() },
              { key: 'mortality_count', header: 'Deaths',     align: 'right', numeric: true, render: r => r.mortality_count > 0 ? <span style={{ color: 'var(--danger)' }}>{r.mortality_count}</span> : '0' },
              { key: 'culls',           header: 'Culls',      align: 'right', numeric: true },
              { key: 'avg_weight_g',    header: 'Avg Weight', align: 'right', render: r => r.avg_weight_g ? `${(r.avg_weight_g / 1000).toFixed(3)} kg` : '—' },
              { key: 'notes',           header: 'Notes',      render: r => r.notes || '—' },
              { key: '_actions', header: '', render: r => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" icon={<I.pencil w={13} />} onClick={() => openEditLog(r)} />
                  {([1, 5].includes(user?.role_id) || user?.id === r.recorded_by) && (
                    <Button variant="ghost" size="sm" icon={<I.trash w={13} />} onClick={() => { setDeleteLogTarget(r); setDeleteLogModal(true); }} style={{ color: 'var(--danger)' }} />
                  )}
                </div>
              )},
            ]}
            rows={logs}
            rowKey="id"
          />
        )}
      </Card>

      {/* ── Vaccination Schedule ─────────────────────────────────────────── */}
      <Card
        title={`Vaccination Schedule ${upcomingVaccs > 0 ? `· ${upcomingVaccs} upcoming` : ''}`}
        action={<Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={() => { setVaccForm(BLANK_VACC); setVaccErr(''); setEditVaccId(null); setVaccModal(true); }}>Schedule</Button>}
      >
        {vaccinations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            No vaccinations scheduled. Click <b>Schedule</b> to add one.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'scheduled_date', header: 'Scheduled',   strong: true },
              { key: 'vaccine_name',   header: 'Vaccine',     render: r => medications.find(m => m.id === r.vaccine_id)?.name || `Vaccine #${r.vaccine_id}` },
              { key: 'route',          header: 'Route',       render: r => r.route.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) },
              { key: 'dose_per_bird',  header: 'Dose/Bird',   render: r => r.dose_per_bird || '—' },
              { key: 'completed_date', header: 'Completed',   render: r => r.completed_date || '—' },
              { key: 'status', header: 'Status', render: r => <Badge tone={VACC_TONE[r.status] || 'neutral'} dot>{r.status.charAt(0).toUpperCase() + r.status.slice(1)}</Badge> },
              { key: '_action', header: '', render: r => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', alignItems: 'center' }}>
                  {r.status === 'upcoming' && <Button variant="secondary" size="sm" onClick={() => markVaccDone(r)}>Mark Done</Button>}
                  <Button variant="ghost" size="sm" icon={<I.pencil w={13} />} onClick={() => openEditVacc(r)} />
                  {([1, 5].includes(user?.role_id) || user?.id === r.created_by) && (
                    <Button variant="ghost" size="sm" icon={<I.trash w={13} />} onClick={() => { setDeleteVaccTarget(r); setDeleteVaccModal(true); }} style={{ color: 'var(--danger)' }} />
                  )}
                </div>
              )},
            ]}
            rows={vaccinations}
            rowKey="id"
          />
        )}
      </Card>

      {/* ── Batch Expenses ───────────────────────────────────────────────── */}
      <Card
        title="Actual Expenses"
        action={<Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={() => { setExpForm(BLANK_EXP); setExpErr(''); setExpModal(true); }}>Add Expense</Button>}
      >
        {/* Budget vs Actual summary bar */}
        {plan && plan.total_expenses > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={kpiChip}>
              <span style={chipLabel}>Budgeted</span>
              <span style={{ ...chipVal, color: 'var(--text-secondary)' }}>{fmt(plan.total_expenses)}</span>
            </div>
            <div style={kpiChip}>
              <span style={chipLabel}>Spent So Far</span>
              <span style={{ ...chipVal, color: totalExpActual > plan.total_expenses ? 'var(--danger)' : 'var(--success)' }}>{fmt(totalExpActual)}</span>
            </div>
            <div style={kpiChip}>
              <span style={chipLabel}>Remaining Budget</span>
              <span style={{ ...chipVal, color: pColor(plan.total_expenses - totalExpActual) }}>{fmt(plan.total_expenses - totalExpActual)}</span>
            </div>
          </div>
        )}
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 14 }}>
            No expenses recorded yet. Click <b>Add Expense</b> to log actual costs.
          </div>
        ) : (
          <DataTable
            columns={[
              { key: 'expense_date', header: 'Date',        strong: true },
              { key: 'category',     header: 'Category',    render: r => <Badge tone="neutral">{EXP_LABEL[r.category] || r.category}</Badge> },
              { key: 'amount',       header: 'Amount',      align: 'right', render: r => <b style={{ color: 'var(--danger)' }}>{fmt(r.amount)}</b> },
              { key: 'description',  header: 'Description', render: r => r.description || '—' },
            ]}
            rows={expenses}
            rowKey="id"
          />
        )}
        {expenses.length > 0 && (
          <div style={{ marginTop: 10, textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>
            Total: {fmt(totalExpActual)}
          </div>
        )}
      </Card>

      {/* ── Financial Plan ───────────────────────────────────────────────── */}
      <Card title="Financial Plan" action={
        <div style={{ display: 'flex', gap: 8 }}>
          {plan && (
            <Button variant="ghost" size="sm" icon={<I.trash w={14} />} onClick={() => setPlanDeleteModal(true)}>
              Delete
            </Button>
          )}
          <Button variant="secondary" size="sm" icon={<I.pencil w={15} />} onClick={openPlanModal}>
            {plan ? 'Edit Plan' : 'Setup Plan'}
          </Button>
        </div>
      }>
        {planLoading ? (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>Loading plan…</p>
        ) : !plan ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px' }}>No financial plan yet. Click <b>Setup Plan</b> to enter your capital, feed phases, and expense budget.</p>
            <Button variant="primary" size="sm" onClick={openPlanModal}>Setup Financial Plan</Button>
          </div>
        ) : (
          <>
            {plan.supplier_name && <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)' }}>Supplier: <b style={{ color: 'var(--text-strong)' }}>{plan.supplier_name}</b> · {plan.initial_count} birds placed</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <PlanSectionTitle>Capital Overview</PlanSectionTitle>
                <PlanTable><tbody>
                  <PlanRow label={`RTL Chickens (₱${plan.bird_cost_per_head}/head × ${plan.initial_count})`} value={fmt(plan.bird_total)} />
                  <PlanRow label={`Delivery Charge (₱${plan.delivery_cost_per_head}/head)`} value={fmt(plan.delivery_total)} />
                  <PlanRow label="Infrastructure / Building" value={fmt(plan.infrastructure_cost)} />
                  <PlanTotalRow label="TOTAL INITIAL CAPITAL" value={fmt(plan.total_capital)} />
                </tbody></PlanTable>
              </div>
              <div>
                <PlanSectionTitle>Revenue Projections</PlanSectionTitle>
                <PlanTable><tbody>
                  <PlanRow label="Contract Price per Head" value={plan.contract_price_per_head ? fmt(plan.contract_price_per_head) : '—'} />
                  <PlanRow label="Initial Head Count" value={(plan.initial_count ?? 0).toLocaleString()} />
                  <PlanRow label="Expected Total Revenue" value={fmt(plan.expected_revenue)} />
                  <PlanRow label="Total Assumed Expenses" value={fmt(plan.total_expenses)} />
                  <PlanTotalRow label="EXPECTED GROSS PROFIT" value={fmt(plan.gross_profit)} valueColor={pColor(plan.gross_profit)} />
                </tbody></PlanTable>
              </div>
            </div>
            {plan.feed_phases.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <PlanSectionTitle>Feed Expense Plan</PlanSectionTitle>
                <table style={tblStyle}>
                  <thead><tr>{['Feed Type','Heads','g/day','Days','Total (kg)','Bags (50kg)','Cost/50kg','Total'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>{plan.feed_phases.map((p, i) => (
                    <tr key={i} style={{ background: i%2===0?'transparent':'var(--surface-raised,rgba(0,0,0,.02))' }}>
                      <td style={tdStyle}>{p.feed_type_name}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{plan.initial_count}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{p.grams_per_day}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{p.duration_days}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{p.total_kg}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{p.bags}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{fmt(p.cost_per_50kg)}</td>
                      <td style={{ ...tdStyle, textAlign:'right', fontWeight:600 }}>{fmt(p.cost)}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background:'var(--surface-raised,rgba(0,0,0,.04))' }}>
                    <td colSpan={7} style={{ ...tdStyle, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>TOTAL FEED COST</td>
                    <td style={{ ...tdStyle, textAlign:'right', fontWeight:700 }}>{fmt(plan.total_feed_cost)}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
            {plan.expense_items.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <PlanSectionTitle>Other Operational Expenses</PlanSectionTitle>
                <table style={tblStyle}>
                  <thead><tr>{['Category','Unit/Qty','Period','Unit Cost','Total','Notes'].map(h => <th key={h} style={thStyle}>{h}</th>)}</tr></thead>
                  <tbody>{plan.expense_items.map((e, i) => (
                    <tr key={i} style={{ background: i%2===0?'transparent':'var(--surface-raised,rgba(0,0,0,.02))' }}>
                      <td style={tdStyle}>{e.category}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{e.qty||0}</td>
                      <td style={{ ...tdStyle, textAlign:'center' }}>{e.period||'—'}</td>
                      <td style={{ ...tdStyle, textAlign:'right' }}>{fmt(e.unit_cost)}</td>
                      <td style={{ ...tdStyle, textAlign:'right', fontWeight:600 }}>{fmt(e.total)}</td>
                      <td style={{ ...tdStyle, color:'var(--text-secondary)', fontSize:12 }}>{e.notes||''}</td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{ background:'var(--surface-raised,rgba(0,0,0,.04))' }}>
                    <td colSpan={4} style={{ ...tdStyle, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>TOTAL OTHER EXPENSES</td>
                    <td style={{ ...tdStyle, textAlign:'right', fontWeight:700 }}>{fmt(plan.total_other)}</td>
                    <td/>
                  </tr></tfoot>
                </table>
              </div>
            )}
            <PlanSectionTitle>Profitability Summary</PlanSectionTitle>
            <PlanTable><tbody>
              <PlanRow label="Expected Total Revenue"    value={fmt(plan.expected_revenue)} />
              <PlanRow label="Total Feed Cost"           value={fmt(plan.total_feed_cost)} />
              <PlanRow label="Other Operational Expenses" value={fmt(plan.total_other)} />
              <PlanRow label="Total Expenses"            value={fmt(plan.total_expenses)} />
              <tr style={{ background:'rgba(34,197,94,0.08)' }}>
                <td style={{ ...tdStyle, fontWeight:700, color:pColor(plan.gross_profit) }}>EXPECTED GROSS PROFIT</td>
                <td style={{ ...tdStyle, textAlign:'right', fontWeight:700, color:pColor(plan.gross_profit) }}>{fmt(plan.gross_profit)}</td>
              </tr>
              {plan.infrastructure_cost > 0 && <PlanRow label="Building / Infrastructure (to recover)" value={fmt(plan.infrastructure_cost)} />}
              <tr style={{ background:'rgba(34,197,94,0.12)' }}>
                <td style={{ ...tdStyle, fontWeight:700, color:pColor(plan.net_profit) }}>NET PROFIT (after capital recovery)</td>
                <td style={{ ...tdStyle, textAlign:'right', fontWeight:700, color:pColor(plan.net_profit) }}>{fmt(plan.net_profit)}</td>
              </tr>
            </tbody></PlanTable>
            {/* Actual vs Plan comparison */}
            {totalExpActual > 0 && (
              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--surface-raised,rgba(0,0,0,.03))', borderRadius: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>Actual vs Plan</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Expenses Budgeted</span><br/><b>{fmt(plan.total_expenses)}</b></div>
                  <div><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Expenses Recorded</span><br/><b style={{ color: totalExpActual > plan.total_expenses ? 'var(--danger)' : 'var(--success)' }}>{fmt(totalExpActual)}</b></div>
                  <div><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Variance</span><br/><b style={{ color: pColor(plan.total_expenses - totalExpActual) }}>{fmt(plan.total_expenses - totalExpActual)}</b></div>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Health & Activity Log ─────────────────────────────────────────── */}
      <Card title="Health & Activity Log" action={<Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={() => { setRecForm(BLANK_EVENT); setRecErr(''); setRecordModal(true); }}>Add Record</Button>}>
        <DataTable
          columns={[
            { key: 'event_date', header: 'Date',   strong: true },
            { key: 'type',       header: 'Type',   render: r => <Badge tone={EVENT_TONE[r.event_type]||'neutral'}>{EVENT_LABEL[r.event_type]||r.event_type}</Badge> },
            { key: 'detail',     header: 'Detail' },
            { key: 'statusLabel',header: 'Status', render: r => <Badge tone={r.status==='done'?'success':r.status==='upcoming'?'neutral':'danger'} dot>{r.statusLabel}</Badge> },
          ]}
          rows={healthRows}
          rowKey="id"
        />
      </Card>

      {/* ── Batch Finance ────────────────────────────────────────────────── */}
      <Card
        title="Batch Finance"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={openFinExpAdd}>Add Expense</Button>
            <Button variant="secondary" size="sm" icon={<I.plus w={15} />} onClick={() => { setFinRevForm({ revenue_date: TODAY, category: 'SALES', amount: '', qty_kg: '', price_per_kg: '', description: '' }); setFinRevErr(''); setFinRevModal(true); }}>Add Revenue</Button>
          </div>
        }
      >
        {finLoading ? (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading finance data…</div>
        ) : finPnl ? (
          <>
            {/* KPI Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Total Revenue',    value: fmt(finPnl.total_revenue),    color: 'var(--success)' },
                { label: 'Total Expenses',   value: fmt(finPnl.total_expenses),   color: 'var(--danger)' },
                { label: 'Gross Profit',     value: fmt(finPnl.gross_profit),     color: pColor(finPnl.gross_profit) },
                { label: 'Profit Margin',    value: finPnl.profit_margin_pct != null ? `${finPnl.profit_margin_pct.toFixed(1)}%` : '—', color: pColor(finPnl.profit_margin_pct) },
                { label: 'ROI',              value: finPnl.roi_pct != null ? `${finPnl.roi_pct.toFixed(1)}%` : '—',                    color: pColor(finPnl.roi_pct) },
              ].map(c => (
                <div key={c.label} style={{ background: 'var(--surface-raised,rgba(0,0,0,.03))', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--border-subtle,rgba(0,0,0,.06))' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{c.value}</div>
                </div>
              ))}
            </div>

            {/* Two-column: breakdown + per-bird */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Expense breakdown */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>Expense Breakdown</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {finPnl.by_category.map(c => (
                      <tr key={c.code}>
                        <td style={{ padding: '5px 0', color: 'var(--text-primary)' }}>{c.name}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600, color: 'var(--danger)' }}>{fmt(c.amount)}</td>
                        <td style={{ padding: '5px 0 5px 8px', textAlign: 'right', color: 'var(--text-muted)', fontSize: 11 }}>
                          {finPnl.total_expenses > 0 ? `${((c.amount / finPnl.total_expenses) * 100).toFixed(0)}%` : ''}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: '1px solid var(--border-subtle,rgba(0,0,0,.1))' }}>
                      <td style={{ padding: '7px 0', fontWeight: 700, fontSize: 12 }}>TOTAL EXPENSES</td>
                      <td style={{ padding: '7px 0', textAlign: 'right', fontWeight: 700, color: 'var(--danger)' }}>{fmt(finPnl.total_expenses)}</td>
                      <td/>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Per-bird metrics */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>Per-Bird Metrics</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <tbody>
                    {[
                      ['Birds Placed',      `${finPnl.initial_count.toLocaleString()} heads`],
                      ['Mortality',         `${finPnl.mortality_count.toLocaleString()} birds`],
                      ['Surviving',         `${finPnl.surviving_count.toLocaleString()} birds`],
                      ['Feed Consumed',     `${finPnl.total_feed_kg.toLocaleString()} kg`],
                      ['FCR',               finPnl.fcr != null ? finPnl.fcr.toFixed(2) : '—'],
                      ['Cost / Bird',       fmt(finPnl.cost_per_bird)],
                      ['Cost / Surviving',  fmt(finPnl.cost_per_surviving)],
                      ['Feed Cost / Bird',  fmt(finPnl.feed_cost_per_bird)],
                      ['Revenue / Bird',    fmt(finPnl.revenue_per_bird)],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td style={{ padding: '5px 0', color: 'var(--text-secondary)' }}>{label}</td>
                        <td style={{ padding: '5px 0', textAlign: 'right', fontWeight: 600, color: 'var(--text-strong)' }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Ledger */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>
                Expense Ledger
                <span style={{ marginLeft: 8, fontWeight: 400, fontSize: 11, color: 'var(--text-muted)' }}>(auto-posted + manual entries)</span>
              </div>
              {finExpenses.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No expense entries yet. Add expenses using the button above.</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'expense_date',  header: 'Date',     strong: true },
                    { key: 'category_name', header: 'Category' },
                    { key: 'amount',        header: 'Amount',   render: r => <span style={{ color: 'var(--danger)', fontWeight: 600 }}>{fmt(r.amount)}</span> },
                    { key: 'description',   header: 'Description', render: r => r.description || '—' },
                    { key: 'source_module', header: 'Source',  render: r => <Badge tone={r.source_module === 'MANUAL' ? 'neutral' : 'info'}>{r.source_module || '—'}</Badge> },
                    { key: 'actions',       header: '',         render: r => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {r.source_module === 'MANUAL' && !r.is_voided && (
                          <Button variant="ghost" size="sm" onClick={() => openFinExpEdit(r)}>Edit</Button>
                        )}
                        {!r.is_voided && (
                          <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }} onClick={() => handleFinExpVoid(r)}>Void</Button>
                        )}
                        {r.is_voided && <Badge tone="danger" dot>Voided</Badge>}
                      </div>
                    )},
                  ]}
                  rows={finExpenses}
                  rowKey="id"
                />
              )}
            </div>

            {/* Revenue Ledger */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: 10 }}>Revenue Ledger</div>
              {finRevenues.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>No revenue entries yet. Sales order approvals auto-post here.</div>
              ) : (
                <DataTable
                  columns={[
                    { key: 'revenue_date', header: 'Date',     strong: true },
                    { key: 'category',     header: 'Category' },
                    { key: 'amount',       header: 'Amount',  render: r => <span style={{ color: 'var(--success)', fontWeight: 600 }}>{fmt(r.amount)}</span> },
                    { key: 'qty_kg',       header: 'Qty (kg)', render: r => r.qty_kg != null ? `${Number(r.qty_kg).toLocaleString()} kg` : '—' },
                    { key: 'price_per_kg', header: 'Price/kg', render: r => r.price_per_kg != null ? `₱${Number(r.price_per_kg).toFixed(2)}` : '—' },
                    { key: 'description',  header: 'Description', render: r => r.description || '—' },
                  ]}
                  rows={finRevenues}
                  rowKey="id"
                />
              )}
            </div>
          </>
        ) : (
          <div style={{ padding: '16px 0', color: 'var(--text-muted)', fontSize: 13 }}>Finance data unavailable.</div>
        )}
      </Card>

      {/* ══ MODALS ══════════════════════════════════════════════════════════ */}

      {/* Daily Log Modal */}
      <Modal open={logModal} title={editLogId ? 'Edit Daily Log' : 'Log Daily Update'} onClose={() => { setLogModal(false); setEditLogId(null); }} onConfirm={handleLogSave} confirmLabel={editLogId ? 'Update Log' : 'Save Log'} loading={logSaving}>
        {logErr && <ErrBox>{logErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Date" required><FieldInput type="date" value={logForm.log_date} onChange={lf('log_date')} /></FormRow>
          <FormRow label="Current Bird Count" required><FieldInput type="number" value={logForm.current_count} onChange={lf('current_count')} min="0" /></FormRow>
          <FormRow label="Mortality Count"><FieldInput type="number" value={logForm.mortality_count} onChange={lf('mortality_count')} min="0" /></FormRow>
          <FormRow label="Culls"><FieldInput type="number" value={logForm.culls} onChange={lf('culls')} min="0" /></FormRow>
          <FormRow label="Avg Weight (grams)"><FieldInput type="number" value={logForm.avg_weight_g} onChange={lf('avg_weight_g')} min="0" placeholder="e.g. 1200" /></FormRow>
          <FormRow label="Notes"><FieldInput value={logForm.notes} onChange={lf('notes')} placeholder="Optional…" /></FormRow>
        </div>
      </Modal>

      {/* Vaccination Modal */}
      <Modal open={vaccModal} title={editVaccId ? 'Edit Vaccination' : 'Schedule Vaccination'} onClose={() => { setVaccModal(false); setEditVaccId(null); }} onConfirm={handleVaccSave} confirmLabel={editVaccId ? 'Update' : 'Schedule'} loading={vaccSaving}>
        {vaccErr && <ErrBox>{vaccErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Vaccine / Medication" required>
            <FieldSelect value={vaccForm.vaccine_id} onChange={vf('vaccine_id')}>
              <option value="">Select vaccine…</option>
              {medications.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Scheduled Date" required><FieldInput type="date" value={vaccForm.scheduled_date} onChange={vf('scheduled_date')} /></FormRow>
          <FormRow label="Route">
            <FieldSelect value={vaccForm.route} onChange={vf('route')}>
              <option value="water">Water</option>
              <option value="spray">Spray</option>
              <option value="injection">Injection</option>
              <option value="eye_drop">Eye Drop</option>
              <option value="wing_web">Wing Web</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Dose per Bird"><FieldInput value={vaccForm.dose_per_bird} onChange={vf('dose_per_bird')} placeholder="e.g. 1 drop" /></FormRow>
          <FormRow label="Cost / Dose (SAR)"><FieldInput type="number" value={vaccForm.cost_per_dose} onChange={vf('cost_per_dose')} placeholder="e.g. 0.50" min="0" step="0.01" /></FormRow>
          <FormRow label="Total Cost (SAR)"><FieldInput type="number" value={vaccForm.total_cost} onChange={vf('total_cost')} placeholder="Auto-fill or enter manually" min="0" step="0.01" /></FormRow>
          <FormRow label="Notes" style={{ gridColumn: '1/-1' }}><FieldInput value={vaccForm.notes} onChange={vf('notes')} placeholder="Optional…" /></FormRow>
        </div>
      </Modal>

      {/* Expense Modal */}
      <Modal open={expModal} title="Add Expense" onClose={() => setExpModal(false)} onConfirm={handleExpSave} confirmLabel="Save Expense" loading={expSaving}>
        {expErr && <ErrBox>{expErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Category">
            <FieldSelect value={expForm.category} onChange={ef('category')}>
              <option value="labor">Labor</option>
              <option value="utilities">Utilities</option>
              <option value="maintenance">Maintenance</option>
              <option value="transport">Transport</option>
              <option value="chicks">Chicks</option>
              <option value="other">Other</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Amount (₱)" required><FieldInput type="number" value={expForm.amount} onChange={ef('amount')} min="0" step="0.01" placeholder="e.g. 9000" /></FormRow>
          <FormRow label="Date" required><FieldInput type="date" value={expForm.expense_date} onChange={ef('expense_date')} /></FormRow>
          <FormRow label="Description"><FieldInput value={expForm.description} onChange={ef('description')} placeholder="What was this for?" /></FormRow>
        </div>
      </Modal>

      {/* Health Event Modal */}
      <Modal open={recordModal} title="Add Health Record" onClose={() => setRecordModal(false)} onConfirm={handleRecord} confirmLabel="Save Record" loading={recSaving}>
        {recErr && <ErrBox>{recErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Event Type" required>
            <FieldSelect value={recForm.event_type} onChange={rf('event_type')}>
              <option value="observation">Observation</option>
              <option value="vaccination">Vaccination</option>
              <option value="medication">Medication</option>
              <option value="weighing">Weighing</option>
              <option value="vet_visit">Vet Visit</option>
              <option value="culling">Culling</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Date" required><FieldInput type="date" value={recForm.event_date} onChange={rf('event_date')} /></FormRow>
          <FormRow label="Status">
            <FieldSelect value={recForm.status} onChange={rf('status')}>
              <option value="done">Done</option>
              <option value="upcoming">Upcoming</option>
              <option value="missed">Missed</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Description"><FieldInput value={recForm.description} onChange={rf('description')} placeholder="Optional notes…" /></FormRow>
          <FormRow label="Cost (SAR)"><FieldInput type="number" value={recForm.cost} onChange={rf('cost')} placeholder="e.g. 250 — posts to MEDICINE expense" min="0" step="0.01" /></FormRow>
        </div>
      </Modal>

      {/* Harvest Modal */}
      <Modal open={harvestModal} title={harvestEditMode ? 'Edit Harvest Record' : `Record Harvest — ${batch?.batch_no}`} onClose={() => setHarvestModal(false)} onConfirm={handleHarvestSave} confirmLabel={harvestEditMode ? 'Update Harvest' : 'Confirm Harvest'} loading={harvestSaving} width={520}>
        {harvestErr && <ErrBox>{harvestErr}</ErrBox>}
        {!harvestEditMode && (
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Enter the harvest details below. The batch will be marked as <b>Harvested</b> and a P&L summary will be generated.
          </p>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Harvest Date" required><FieldInput type="date" value={harvestForm.harvest_date} onChange={hf('harvest_date')} /></FormRow>
          <FormRow label="Birds Harvested (head)" required><FieldInput type="number" value={harvestForm.birds_harvested} onChange={hf('birds_harvested')} min="0" placeholder={`e.g. ${batch?.current_count || 1000}`} /></FormRow>
          <FormRow label="Total Live Weight (kg)" required><FieldInput type="number" value={harvestForm.total_weight_kg} onChange={hf('total_weight_kg')} min="0" step="0.01" placeholder="e.g. 2850.5" /></FormRow>
          <FormRow label="Price per kg (₱)" required><FieldInput type="number" value={harvestForm.price_per_kg} onChange={hf('price_per_kg')} min="0" step="0.01" placeholder="e.g. 120" /></FormRow>
          <FormRow label="Buyer Name"><FieldInput value={harvestForm.buyer_name} onChange={hf('buyer_name')} placeholder="e.g. SM Hypermarket" /></FormRow>
          <FormRow label="Notes"><FieldInput value={harvestForm.notes} onChange={hf('notes')} placeholder="Optional…" /></FormRow>
        </div>
        {harvestForm.total_weight_kg && harvestForm.price_per_kg && (
          <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(34,197,94,0.08)', borderRadius: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Estimated Revenue</span>
              <b style={{ color: 'var(--success)', fontSize: 16 }}>{fmt(parseFloat(harvestForm.total_weight_kg || 0) * parseFloat(harvestForm.price_per_kg || 0))}</b>
            </div>
          </div>
        )}
      </Modal>

      {/* Financial Plan Edit Modal */}
      <Modal open={planModal} title={plan ? `Edit Financial Plan — ${batch.batch_no}` : `Setup Financial Plan — ${batch.batch_no}`} onClose={() => setPlanModal(false)} onConfirm={handlePlanSave} confirmLabel="Save Plan" loading={planSaving} width={780}>
        {planErr && <ErrBox>{planErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          <div>
            <ModalSectionLabel>Capital</ModalSectionLabel>
            <FormRow label="Supplier Name"><FieldInput value={planForm.supplier_name} onChange={pf('supplier_name')} placeholder="e.g. JM Poultry Supply" /></FormRow>
            <FormRow label="Bird Cost / Head (₱)"><FieldInput type="number" value={planForm.bird_cost_per_head} onChange={pf('bird_cost_per_head')} placeholder="e.g. 80" /></FormRow>
            <FormRow label="Delivery Cost / Head (₱)"><FieldInput type="number" value={planForm.delivery_cost_per_head} onChange={pf('delivery_cost_per_head')} placeholder="e.g. 5" /></FormRow>
            <FormRow label="Infrastructure / Building (₱)"><FieldInput type="number" value={planForm.infrastructure_cost} onChange={pf('infrastructure_cost')} placeholder="e.g. 50000" /></FormRow>
          </div>
          <div>
            <ModalSectionLabel>Revenue</ModalSectionLabel>
            <FormRow label="Contract Price / Head (₱)"><FieldInput type="number" value={planForm.contract_price_per_head} onChange={pf('contract_price_per_head')} placeholder="e.g. 400" /></FormRow>
            <FormRow label="Notes"><FieldInput value={planForm.notes} onChange={pf('notes')} placeholder="Any plan notes…" /></FormRow>
            <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--surface-raised,rgba(0,0,0,.04))', borderRadius: 8, fontSize: 13 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ color:'var(--text-secondary)' }}>Total Capital</span><b>{fmt(previewCapital)}</b></div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}><span style={{ color:'var(--text-secondary)' }}>Expected Revenue</span><b style={{ color:'var(--success)' }}>{fmt(previewRevenue)}</b></div>
              <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, borderTop:'1px solid var(--border-soft)', paddingTop:6 }}><span style={{ fontWeight:600 }}>Net Profit (est.)</span><b style={{ color:pColor(previewNet) }}>{fmt(previewNet)}</b></div>
            </div>
          </div>
        </div>
        <ModalSectionLabel style={{ marginTop: 20 }}>Feed Phases</ModalSectionLabel>
        <table style={{ ...tblStyle, marginBottom: 6 }}>
          <thead><tr>{['Feed Type','g/day','Days','Cost/50kg (₱)','Est. kg','Est. Cost',''].map(h => <th key={h} style={{ ...thStyle, fontSize:11 }}>{h}</th>)}</tr></thead>
          <tbody>{phasePreview.map((p, i) => (
            <tr key={i}>
              <td style={tdStyle}><input style={inlineInput} value={p.feed_type_name} onChange={e => updatePhase(i,'feed_type_name',e.target.value)} placeholder="Feed name" /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:60, textAlign:'right' }} type="number" value={p.grams_per_day} onChange={e => updatePhase(i,'grams_per_day',e.target.value)} /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:60, textAlign:'right' }} type="number" value={p.duration_days} onChange={e => updatePhase(i,'duration_days',e.target.value)} /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:80, textAlign:'right' }} type="number" value={p.cost_per_50kg} onChange={e => updatePhase(i,'cost_per_50kg',e.target.value)} /></td>
              <td style={{ ...tdStyle, textAlign:'right', color:'var(--text-secondary)', fontSize:12 }}>{p.kg} kg</td>
              <td style={{ ...tdStyle, textAlign:'right', fontWeight:600, fontSize:12 }}>{fmt(p.cost)}</td>
              <td style={tdStyle}><button onClick={() => removePhase(i)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--danger)', fontSize:16 }}>×</button></td>
            </tr>
          ))}</tbody>
          <tfoot><tr><td colSpan={5} style={{ ...tdStyle, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>TOTAL FEED COST</td><td style={{ ...tdStyle, textAlign:'right', fontWeight:700 }}>{fmt(previewFeedTotal)}</td><td/></tr></tfoot>
        </table>
        <button onClick={addPhase} style={{ fontSize:13, color:'var(--text-brand)', background:'none', border:'none', cursor:'pointer', padding:'2px 0', marginBottom:16 }}>+ Add Feed Phase</button>
        <ModalSectionLabel>Other Operational Expenses</ModalSectionLabel>
        <table style={{ ...tblStyle, marginBottom: 6 }}>
          <thead><tr>{['Category','Unit/Qty','Period','Unit Cost (₱)','Total (₱)','Notes',''].map(h => <th key={h} style={{ ...thStyle, fontSize:11 }}>{h}</th>)}</tr></thead>
          <tbody>{expItemPreview.map((e, i) => (
            <tr key={i}>
              <td style={tdStyle}><input style={inlineInput} value={e.category} onChange={ev => updateExpItem(i,'category',ev.target.value)} placeholder="Category" /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:60, textAlign:'right' }} type="number" value={e.qty} onChange={ev => updateExpItem(i,'qty',ev.target.value)} /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:70 }} value={e.period} onChange={ev => updateExpItem(i,'period',ev.target.value)} placeholder="Days…" /></td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:80, textAlign:'right' }} type="number" value={e.unit_cost} onChange={ev => updateExpItem(i,'unit_cost',ev.target.value)} /></td>
              <td style={{ ...tdStyle, textAlign:'right', fontWeight:600, fontSize:12 }}>{fmt(e.total)}</td>
              <td style={tdStyle}><input style={{ ...inlineInput, width:130 }} value={e.notes} onChange={ev => updateExpItem(i,'notes',ev.target.value)} placeholder="Notes…" /></td>
              <td style={tdStyle}><button onClick={() => removeExpItem(i)} style={{ border:'none', background:'none', cursor:'pointer', color:'var(--danger)', fontSize:16 }}>×</button></td>
            </tr>
          ))}</tbody>
          <tfoot><tr><td colSpan={4} style={{ ...tdStyle, fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em' }}>TOTAL OTHER EXPENSES</td><td style={{ ...tdStyle, textAlign:'right', fontWeight:700 }}>{fmt(previewExpItemTotal)}</td><td/><td/></tr></tfoot>
        </table>
        <button onClick={addExpItem} style={{ fontSize:13, color:'var(--text-brand)', background:'none', border:'none', cursor:'pointer', padding:'2px 0' }}>+ Add Expense Row</button>
      </Modal>

      {/* Delete Plan Confirmation Modal */}
      <Modal open={planDeleteModal} title="Delete Financial Plan" onClose={() => setPlanDeleteModal(false)} onConfirm={handlePlanDelete} confirmLabel="Delete Plan" confirmVariant="danger" loading={planDeleting} width={420}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Are you sure you want to delete the financial plan for <b>{batch?.batch_no}</b>?<br />
          All feed phases and expense budgets will be permanently removed.
        </p>
      </Modal>

      {/* Delete Daily Log Confirmation Modal */}
      <Modal open={deleteLogModal} title="Delete Daily Log" onClose={() => { setDeleteLogModal(false); setDeleteLogTarget(null); }} onConfirm={handleDeleteLog} confirmLabel="Delete Log" confirmVariant="danger" loading={deletingLog} width={420}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Delete the daily log for <b>{deleteLogTarget?.log_date}</b>?<br />
          The batch bird count will be recalculated. This cannot be undone.
        </p>
      </Modal>

      {/* Delete Vaccination Confirmation Modal */}
      <Modal open={deleteVaccModal} title="Delete Vaccination Schedule" onClose={() => { setDeleteVaccModal(false); setDeleteVaccTarget(null); }} onConfirm={handleDeleteVacc} confirmLabel="Delete" confirmVariant="danger" loading={deletingVacc} width={420}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Delete the{' '}
          <b>{deleteVaccTarget && (medications.find(m => m.id === deleteVaccTarget.vaccine_id)?.name || `Vaccine #${deleteVaccTarget?.vaccine_id}`)}</b>{' '}
          scheduled for <b>{deleteVaccTarget?.scheduled_date}</b>? This cannot be undone.
        </p>
      </Modal>

      {/* Finance — Add/Edit Expense Modal */}
      <Modal open={finExpModal} title={finEditExp ? 'Edit Expense' : 'Add Batch Expense'} onClose={() => { setFinExpModal(false); setFinEditExp(null); }} onConfirm={handleFinExpSave} confirmLabel={finEditExp ? 'Save Changes' : 'Add Expense'} loading={finExpSaving}>
        {finExpErr && <ErrBox>{finExpErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Date" required>
            <FieldInput type="date" value={finExpForm.expense_date} onChange={ff('expense_date')} />
          </FormRow>
          <FormRow label="Category" required>
            <FieldSelect value={finExpForm.category_code} onChange={ff('category_code')}>
              {finCategories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Amount (₱)" required>
            <FieldInput type="number" value={finExpForm.amount} onChange={ff('amount')} min="0" step="0.01" placeholder="e.g. 5000" />
          </FormRow>
          <FormRow label="Qty">
            <FieldInput type="number" value={finExpForm.qty} onChange={ff('qty')} min="0" placeholder="Optional" />
          </FormRow>
          <FormRow label="Unit">
            <FieldInput value={finExpForm.unit} onChange={ff('unit')} placeholder="kg, hrs, heads…" />
          </FormRow>
          <FormRow label="Description">
            <FieldInput value={finExpForm.description} onChange={ff('description')} placeholder="What was this for?" />
          </FormRow>
        </div>
      </Modal>

      {/* Finance — Add Revenue Modal */}
      <Modal open={finRevModal} title="Add Revenue Entry" onClose={() => setFinRevModal(false)} onConfirm={handleFinRevSave} confirmLabel="Add Revenue" loading={finRevSaving}>
        {finRevErr && <ErrBox>{finRevErr}</ErrBox>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Date" required>
            <FieldInput type="date" value={finRevForm.revenue_date} onChange={frf('revenue_date')} />
          </FormRow>
          <FormRow label="Category">
            <FieldSelect value={finRevForm.category} onChange={frf('category')}>
              <option value="SALES">Sales</option>
              <option value="MANURE">Manure</option>
              <option value="CULLS">Culls</option>
              <option value="SALVAGE">Salvage</option>
              <option value="MISC">Miscellaneous</option>
            </FieldSelect>
          </FormRow>
          <FormRow label="Amount (₱)" required>
            <FieldInput type="number" value={finRevForm.amount} onChange={frf('amount')} min="0" step="0.01" placeholder="e.g. 50000" />
          </FormRow>
          <FormRow label="Qty (kg)">
            <FieldInput type="number" value={finRevForm.qty_kg} onChange={frf('qty_kg')} min="0" step="0.01" placeholder="Optional" />
          </FormRow>
          <FormRow label="Price / kg (₱)">
            <FieldInput type="number" value={finRevForm.price_per_kg} onChange={frf('price_per_kg')} min="0" step="0.01" placeholder="Optional" />
          </FormRow>
          <FormRow label="Description">
            <FieldInput value={finRevForm.description} onChange={frf('description')} placeholder="Optional notes" />
          </FormRow>
        </div>
      </Modal>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ErrBox({ children }) {
  return <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{children}</div>;
}
function PlanSectionTitle({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-brand)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, borderBottom: '2px solid var(--text-brand)', paddingBottom: 4 }}>{children}</div>;
}
function ModalSectionLabel({ children, style }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, ...style }}>{children}</div>;
}
function PlanTable({ children }) {
  return <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>{children}</table>;
}
function PlanRow({ label, value }) {
  return (
    <tr>
      <td style={{ padding: '5px 8px', color: 'var(--text-body)', borderBottom: '1px solid var(--border-soft)' }}>{label}</td>
      <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--text-strong)', fontWeight: 500, borderBottom: '1px solid var(--border-soft)', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
}
function PlanTotalRow({ label, value, valueColor }) {
  return (
    <tr style={{ background: 'var(--surface-raised,rgba(0,0,0,.04))' }}>
      <td style={{ padding: '7px 8px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</td>
      <td style={{ padding: '7px 8px', textAlign: 'right', fontWeight: 700, color: valueColor || 'var(--text-strong)', whiteSpace: 'nowrap' }}>{value}</td>
    </tr>
  );
}

const tblStyle    = { width: '100%', borderCollapse: 'collapse', fontSize: 13 };
const thStyle     = { padding: '6px 8px', background: 'var(--surface-raised,rgba(0,0,0,.06))', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', borderBottom: '2px solid var(--border-soft)', whiteSpace: 'nowrap' };
const tdStyle     = { padding: '6px 8px', borderBottom: '1px solid var(--border-soft)', verticalAlign: 'middle' };
const inlineInput = { width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid var(--border-soft)', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: 12 };
const kpiChip     = { display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--surface-raised,rgba(0,0,0,.03))', borderRadius: 8, padding: '8px 14px' };
const chipLabel   = { fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const chipVal     = { fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' };
