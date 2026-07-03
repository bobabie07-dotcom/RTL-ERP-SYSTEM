import React, { useCallback, useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MODEL_LABEL = { broiler: 'Broiler', layer: 'Layer', rtl: 'RTL' };
const MODEL_COLOR = {
  broiler: { bg: '#fef3c7', color: '#92400e' },
  layer:   { bg: '#d1fae5', color: '#065f46' },
  rtl:     { bg: '#ede9fe', color: '#5b21b6' },
};

const PRIORITY_COLOR = {
  low:      { bg: '#f3f4f6', color: '#6b7280' },
  medium:   { bg: '#fef3c7', color: '#92400e' },
  high:     { bg: '#fee2e2', color: '#991b1b' },
  critical: { bg: '#7f1d1d', color: '#fff' },
};

const STATUS_COLOR = {
  active:           { bg: '#d1fae5', color: '#065f46' },
  suspended:        { bg: '#fee2e2', color: '#991b1b' },
  inactive:         { bg: '#f3f4f6', color: '#6b7280' },
  expired:          { bg: '#fef3c7', color: '#92400e' },
  new:              { bg: '#eff6ff', color: '#1d4ed8' },
  open:             { bg: '#eff6ff', color: '#1d4ed8' },
  in_progress:      { bg: '#fef3c7', color: '#92400e' },
  waiting_on_user:  { bg: '#ede9fe', color: '#5b21b6' },
  resolved:         { bg: '#d1fae5', color: '#065f46' },
  closed:           { bg: '#f3f4f6', color: '#6b7280' },
};

// ── Shared micro-components ───────────────────────────────────────────────────

function Badge({ value, map, fallback }) {
  const s = (map || STATUS_COLOR)[value] || { bg: '#f3f4f6', color: '#6b7280' };
  const label = (fallback || value || '').toString().replace(/_/g, ' ').toUpperCase();
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {label}
    </span>
  );
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
      {msg}
    </div>
  );
}

function Spinner() {
  return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>;
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || 'var(--text-strong)', lineHeight: 1.2 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function STable({ headers, rows, empty = 'No data.' }) {
  return (
    <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
            {headers.map((h, i) => <th key={i} style={{ padding: '10px 14px' }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={headers.length} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>{empty}</td></tr>
            : rows
          }
        </tbody>
      </table>
    </div>
  );
}

function Pager({ total, skip, limit, onPage }) {
  if (total <= limit) return null;
  const page  = Math.floor(skip / limit);
  const pages = Math.ceil(total / limit);
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>
        {skip + 1}–{Math.min(skip + limit, total)} of {total}
      </span>
      <Btn disabled={page === 0}        onClick={() => onPage((page - 1) * limit)}>← Prev</Btn>
      <Btn disabled={page >= pages - 1} onClick={() => onPage((page + 1) * limit)}>Next →</Btn>
    </div>
  );
}

function Btn({ onClick, disabled, children, variant, type = 'button' }) {
  const base = { border: '1px solid var(--border)', borderRadius: 7, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1 };
  const variants = {
    primary:  { background: 'var(--green-500)', color: '#fff', border: 'none' },
    danger:   { background: 'none', color: 'var(--danger)' },
    default:  { background: 'none', color: 'var(--text-strong)' },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{ ...base, ...(variants[variant] || variants.default) }}>
      {children}
    </button>
  );
}

const FIELD_STYLE  = { width: '100%', height: 36, padding: '0 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
const SELECT_STYLE = { ...FIELD_STYLE, background: '#fff', cursor: 'pointer' };

function FormField({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  );
}

function ModalShell({ title, onClose, children }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 500, maxHeight: '92vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ── Companies Tab ──────────────────────────────────────────────────────────────

const EMPTY_CO_FORM = { name: '', plan_name: 'standard', expires_at: '', business_model: 'broiler' };

const KNOWN_FLAGS = [
  { key: 'procurement',     label: 'Procurement Module' },
  { key: 'hr',              label: 'HR & Payroll' },
  { key: 'site_management', label: 'Site Management' },
  { key: 'finance',         label: 'Finance / Batch P&L' },
  { key: 'reports',         label: 'Reports & Analytics' },
];

function CompaniesTab() {
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [modal,      setModal]      = useState(null); // null | 'add' | 'edit' | 'flags'
  const [form,       setForm]       = useState(EMPTY_CO_FORM);
  const [editId,     setEditId]     = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [formErr,    setFormErr]    = useState('');
  const [selected,   setSelected]   = useState(new Set());
  const [bulkBusy,   setBulkBusy]   = useState(false);
  const [flagsData,  setFlagsData]  = useState(null);  // { company_id, company_name, flags }
  const [flagsSaving,setFlagsSaving]= useState(false);

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi.listCompanies()
      .then(data => { setCompanies(data); setError(''); })
      .catch(err => setError(err.message || 'Failed to load companies'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => { setEditId(null); setForm(EMPTY_CO_FORM); setFormErr(''); setModal('add'); };

  const openEdit = (c) => {
    const sub = c.subscription;
    setEditId(c.id);
    setForm({
      name:           c.name,
      plan_name:      sub?.plan_name || 'standard',
      expires_at:     sub?.expires_at ? sub.expires_at.split('T')[0] : '',
      business_model: c.business_model || 'broiler',
    });
    setFormErr('');
    setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Company name is required.'); return; }
    if (!form.expires_at)  { setFormErr('Expiry date is required.'); return; }
    setSaving(true); setFormErr('');
    try {
      const expiresIso = new Date(form.expires_at).toISOString();
      if (modal === 'add') {
        await superAdminApi.createCompany({ name: form.name.trim(), plan_name: form.plan_name, expires_at: expiresIso, business_model: form.business_model });
      } else {
        await superAdminApi.updateCompany(editId, { name: form.name.trim(), business_model: form.business_model });
        await superAdminApi.updateSubscription(editId, { plan_name: form.plan_name, expires_at: expiresIso });
      }
      setModal(null);
      load();
    } catch (err) { setFormErr(err.message || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (c) => {
    const next = c.status === 'active' ? 'suspended' : 'active';
    try {
      await superAdminApi.updateCompany(c.id, { status: next });
      setCompanies(prev => prev.map(x => x.id === c.id ? { ...x, status: next } : x));
    } catch (err) { setError(err.message || 'Failed to update status'); }
  };

  const handleDelete = async (c) => {
    const hasUsers = c.user_count > 0;
    const msg = hasUsers
      ? `"${c.name}" has ${c.user_count} user(s).\n\nDelete the company and all its data? This cannot be undone.`
      : `Delete "${c.name}"? This cannot be undone.`;
    if (!window.confirm(msg)) return;
    try {
      await superAdminApi.deleteCompany(c.id, hasUsers);
      setCompanies(prev => prev.filter(x => x.id !== c.id));
    } catch (err) { setError(err.message || 'Failed to delete company.'); }
  };

  const handleExport = async () => {
    try { await superAdminApi.exportCompanies(); }
    catch (err) { setError(err.message || 'Export failed'); }
  };

  const handleExportCompany = async (c) => {
    try { await superAdminApi.exportCompanyData(c.id); }
    catch (err) { setError(`Export failed for ${c.name}: ${err.message}`); }
  };

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () => {
    if (selected.size === companies.length) setSelected(new Set());
    else setSelected(new Set(companies.map(c => c.id)));
  };

  const handleBulk = async (action) => {
    if (!selected.size) return;
    const label = action === 'suspend' ? 'suspend' : 'activate';
    if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selected.size} company(ies)?`)) return;
    setBulkBusy(true);
    try {
      await superAdminApi.bulkCompanyAction([...selected], action);
      setSelected(new Set());
      load();
    } catch (err) { setError(err.message || 'Bulk action failed'); }
    finally { setBulkBusy(false); }
  };

  const openFlags = async (c) => {
    try {
      const data = await superAdminApi.getFeatureFlags(c.id);
      setFlagsData(data);
      setModal('flags');
    } catch (err) { setError(err.message || 'Failed to load feature flags'); }
  };

  const handleFlagToggle = (key) => {
    setFlagsData(prev => ({
      ...prev,
      flags: { ...prev.flags, [key]: !(prev.flags[key] !== false) },
    }));
  };

  const handleFlagsSave = async () => {
    setFlagsSaving(true);
    try {
      await superAdminApi.updateFeatureFlags(flagsData.company_id, flagsData.flags);
      setModal(null);
      setFlagsData(null);
    } catch (err) { setError(err.message || 'Failed to save flags'); }
    finally { setFlagsSaving(false); }
  };

  const activeCount    = companies.filter(c => c.status === 'active').length;
  const suspendedCount = companies.filter(c => c.status === 'suspended').length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total Companies"     value={companies.length} />
        <KpiCard label="Active"              value={activeCount}      color="var(--success)" />
        <KpiCard label="Suspended"           value={suspendedCount}   color="var(--danger)" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Registered Companies</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={handleExport}>Export CSV</Btn>
          <Btn variant="primary" onClick={openAdd}>+ Add Company</Btn>
        </div>
      </div>

      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1d4ed8' }}>{selected.size} selected</span>
          <Btn variant="danger"   disabled={bulkBusy} onClick={() => handleBulk('suspend')}>Suspend All</Btn>
          <Btn                    disabled={bulkBusy} onClick={() => handleBulk('activate')}>Activate All</Btn>
          <Btn onClick={() => setSelected(new Set())}>Clear</Btn>
        </div>
      )}

      <ErrBanner msg={error} />
      {loading ? <Spinner /> : (
        <STable
          headers={[
            <input type="checkbox" key="chk"
              checked={selected.size === companies.length && companies.length > 0}
              onChange={toggleAll}
              style={{ cursor: 'pointer' }}
            />,
            '#', 'Company Name', 'Model', 'Plan', 'Expires', 'Users', 'Farms', 'Created', 'Status', ''
          ]}
          empty="No companies registered yet."
          rows={companies.map(c => {
            const sub = c.subscription;
            const mdl = c.business_model || 'broiler';
            const mclr = MODEL_COLOR[mdl] || MODEL_COLOR.broiler;
            const now = new Date();
            const exp = sub?.expires_at ? new Date(sub.expires_at) : null;
            const expiring = exp && exp > now && exp < new Date(now.getTime() + 30 * 86400000);
            const isSel = selected.has(c.id);
            return (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isSel ? '#f0f9ff' : 'transparent' }}>
                <td style={{ padding: '12px 14px' }}>
                  <input type="checkbox" checked={isSel} onChange={() => toggleSelect(c.id)} style={{ cursor: 'pointer' }} />
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>#{c.id}</td>
                <td style={{ padding: '12px 14px', fontWeight: 600 }}>{c.name}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span style={{ padding: '2px 7px', background: mclr.bg, color: mclr.color, borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                    {MODEL_LABEL[mdl] || mdl}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  {sub ? (
                    <span style={{ padding: '2px 7px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                      {sub.plan_name}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '12px 14px', color: expiring ? '#92400e' : 'inherit', fontWeight: expiring ? 600 : 400 }}>
                  {fmtDate(sub?.expires_at)}{expiring ? ' ⚠' : ''}
                </td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{c.user_count}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{c.farm_count}</td>
                <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{fmtDate(c.created_at)}</td>
                <td style={{ padding: '12px 14px' }}><Badge value={c.status} /></td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Btn onClick={() => openEdit(c)}>Edit</Btn>
                    <Btn onClick={() => openFlags(c)}>Flags</Btn>
                    <Btn onClick={() => handleExportCompany(c)}>↓ Export</Btn>
                    <Btn variant={c.status === 'active' ? 'danger' : 'default'} onClick={() => handleToggle(c)}>
                      {c.status === 'active' ? 'Suspend' : 'Activate'}
                    </Btn>
                    <Btn variant="danger" onClick={() => handleDelete(c)}>Delete</Btn>
                  </div>
                </td>
              </tr>
            );
          })}
        />
      )}

      {modal === 'flags' && flagsData && (
        <ModalShell title={`Feature Flags — ${flagsData.company_name}`} onClose={() => { setModal(null); setFlagsData(null); }}>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-muted)' }}>
            Disabled flags hide the module from all users in this company. Defaults to enabled if not set.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {KNOWN_FLAGS.map(({ key, label }) => {
              const enabled = flagsData.flags[key] !== false;
              return (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div
                    onClick={() => handleFlagToggle(key)}
                    style={{
                      width: 40, height: 22, borderRadius: 11, background: enabled ? 'var(--green-500)' : '#d1d5db',
                      position: 'relative', flexShrink: 0, cursor: 'pointer', transition: 'background 0.2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, left: enabled ? 21 : 3, width: 16, height: 16,
                      borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                    <div style={{ fontSize: 11, color: enabled ? '#065f46' : '#9ca3af', marginTop: 1 }}>{enabled ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Btn onClick={() => { setModal(null); setFlagsData(null); }}>Cancel</Btn>
            <Btn variant="primary" disabled={flagsSaving} onClick={handleFlagsSave}>
              {flagsSaving ? 'Saving…' : 'Save Flags'}
            </Btn>
          </div>
        </ModalShell>
      )}

      {(modal === 'add' || modal === 'edit') && (
        <ModalShell title={modal === 'add' ? 'Register New Company' : 'Edit Company'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave}>
            <ErrBanner msg={formErr} />
            {modal === 'edit' && editId && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                Company ID: <strong style={{ color: 'var(--text-strong)', fontFamily: 'monospace' }}>#{editId}</strong>
              </div>
            )}
            <FormField label="Company Name" required>
              <input type="text" value={form.name} onChange={f('name')} placeholder="e.g. Acme Farms" style={FIELD_STYLE} />
            </FormField>
            <FormField label="Business Model" required>
              <select value={form.business_model} onChange={f('business_model')} style={SELECT_STYLE}>
                <option value="broiler">Broiler (Meat / Grow-out)</option>
                <option value="layer">Layer (Egg Production)</option>
                <option value="rtl">RTL (Raise-to-Lay)</option>
              </select>
            </FormField>
            <FormField label="Subscription Plan" required>
              <select value={form.plan_name} onChange={f('plan_name')} style={SELECT_STYLE}>
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </FormField>
            <FormField label="Subscription Expiry Date" required>
              <input type="date" value={form.expires_at} onChange={f('expires_at')} style={FIELD_STYLE} />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Btn onClick={() => setModal(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving…' : modal === 'add' ? 'Register Company' : 'Save Changes'}
              </Btn>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

// ── All Users Tab ─────────────────────────────────────────────────────────────

function UsersTab({ companies }) {
  const [data,         setData]         = useState({ total: 0, items: [] });
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [impData,      setImpData]      = useState(null);  // { access_token, user }
  const [impBusy,      setImpBusy]      = useState(null);  // user_id being impersonated
  const [search,       setSearch]       = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [coFilter, setCoFilter] = useState('');
  const [stFilter, setStFilter] = useState('');
  const [skip,    setSkip]    = useState(0);
  const LIMIT = 50;

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi.listAllUsers({ search: committedSearch || undefined, company_id: coFilter || undefined, status: stFilter || undefined, skip, limit: LIMIT })
      .then(d => { setData(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load users'))
      .finally(() => setLoading(false));
  }, [committedSearch, coFilter, stFilter, skip]);

  useEffect(() => { load(); }, [load]);

  // Committing search resets page and triggers load via useEffect (no double request)
  const applyFilter = () => { setCommittedSearch(search); setSkip(0); };

  const handleImpersonate = async (u) => {
    setImpBusy(u.id);
    try {
      const result = await superAdminApi.impersonateUser(u.id);
      setImpData(result);
    } catch (err) { setError(err.message || 'Impersonation failed'); }
    finally { setImpBusy(null); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
          <input
            style={FIELD_STYLE}
            placeholder="Name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilter()}
          />
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Company</label>
          <select style={SELECT_STYLE} value={coFilter} onChange={e => { setCoFilter(e.target.value); setSkip(0); }}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
          <select style={SELECT_STYLE} value={stFilter} onChange={e => { setStFilter(e.target.value); setSkip(0); }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <Btn variant="primary" onClick={applyFilter}>Search</Btn>
      </div>

      <ErrBanner msg={error} />
      {loading ? <Spinner /> : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{data.total} user(s) found</div>
          <STable
            headers={['#', 'Full Name', 'Email', 'Company', 'Role', 'Status', 'Last Login', 'Joined', '']}
            empty="No users found."
            rows={data.items.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{u.id}</td>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{u.full_name}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>
                  {u.company_name
                    ? <span>{u.company_name}<span style={{ marginLeft: 5, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{u.company_id}</span></span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{u.role_name || `Role ${u.role_id}`}</td>
                <td style={{ padding: '10px 14px' }}><Badge value={u.status} /></td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{fmtDateTime(u.last_login_at)}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{fmtDate(u.created_at)}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Btn disabled={impBusy === u.id} onClick={() => handleImpersonate(u)}>
                    {impBusy === u.id ? '…' : 'Login As'}
                  </Btn>
                </td>
              </tr>
            ))}
          />
          <Pager total={data.total} skip={skip} limit={LIMIT} onPage={setSkip} />
        </>
      )}

      {impData && (
        <ModalShell title="Impersonation Session" onClose={() => setImpData(null)}>
          <div style={{ marginBottom: 14, padding: 14, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, fontSize: 13 }}>
            <strong>Impersonating:</strong> {impData.user.full_name} ({impData.user.email})
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-body)', margin: '0 0 12px' }}>
            A 2-hour session token has been generated. To view the system as this user:
          </p>
          <ol style={{ fontSize: 13, color: 'var(--text-body)', margin: '0 0 16px', paddingLeft: 20, lineHeight: 1.8 }}>
            <li>Open a <strong>private/incognito window</strong></li>
            <li>Navigate to the ERP login page</li>
            <li>Open DevTools → Console and run:</li>
          </ol>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px', marginBottom: 16, position: 'relative' }}>
            <code style={{ fontSize: 12, color: '#86efac', wordBreak: 'break-all' }}>
              {`localStorage.setItem('erp_token', '${impData.access_token}')`}
            </code>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => {
              navigator.clipboard.writeText(`localStorage.setItem('erp_token', '${impData.access_token}')`);
            }}>Copy Command</Btn>
            <Btn onClick={() => {
              navigator.clipboard.writeText(impData.access_token);
            }}>Copy Token Only</Btn>
            <Btn variant="primary" onClick={() => setImpData(null)}>Done</Btn>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ── Audit Logs Tab ────────────────────────────────────────────────────────────

function AuditLogsTab({ companies }) {
  const [data,       setData]       = useState({ total: 0, items: [] });
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [coFilter,   setCoFilter]   = useState('');
  const [actFilter,  setActFilter]  = useState('');
  const [skip,       setSkip]       = useState(0);
  const LIMIT = 100;

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi.getAuditLogs({ company_id: coFilter || undefined, action_type: actFilter || undefined, skip, limit: LIMIT })
      .then(d => { setData(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  }, [coFilter, actFilter, skip]);

  useEffect(() => { load(); }, [load]);

  const ACTION_TYPES = ['create', 'update', 'delete', 'status_change', 'reset_password', 'login', 'assign_farm'];

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Company</label>
          <select style={SELECT_STYLE} value={coFilter} onChange={e => { setCoFilter(e.target.value); setSkip(0); }}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Action Type</label>
          <select style={SELECT_STYLE} value={actFilter} onChange={e => { setActFilter(e.target.value); setSkip(0); }}>
            <option value="">All actions</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <ErrBanner msg={error} />
      {loading ? <Spinner /> : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{data.total} log entries</div>
          <STable
            headers={['When', 'Company', 'Target User', 'Action', 'Performed By', 'Old Value', 'New Value', 'Notes']}
            empty="No audit logs."
            rows={data.items.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(log.created_at)}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>
                  {log.company_name
                    ? <span>{log.company_name}<span style={{ marginLeft: 4, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{log.company_id}</span></span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{log.target_name || `#${log.target_user_id}`}</td>
                <td style={{ padding: '10px 14px' }}>
                  <code style={{ fontSize: 12, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{log.action_type}</code>
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{log.actor_name || `#${log.performed_by}`}</td>
                <td style={{ padding: '10px 14px', color: '#991b1b', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.old_value || '—'}</td>
                <td style={{ padding: '10px 14px', color: '#065f46', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.new_value || '—'}</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{log.notes || '—'}</td>
              </tr>
            ))}
          />
          <Pager total={data.total} skip={skip} limit={LIMIT} onPage={setSkip} />
        </>
      )}
    </div>
  );
}

// ── System Health Tab ─────────────────────────────────────────────────────────

function HealthTab() {
  const [health,  setHealth]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    superAdminApi.getHealth()
      .then(d => { setHealth(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load health data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  if (error)   return <ErrBanner msg={error} />;
  if (!health) return null;

  const warnings = [];
  if (health.subscriptions.expired_but_active > 0)
    warnings.push(`⚠ ${health.subscriptions.expired_but_active} subscription(s) have passed their expiry date but are still marked active.`);
  if (health.subscriptions.expiring_soon_30d > 0)
    warnings.push(`⏰ ${health.subscriptions.expiring_soon_30d} subscription(s) expiring within 30 days.`);
  if (health.activity.open_tickets > 0)
    warnings.push(`🎫 ${health.activity.open_tickets} open support ticket(s) awaiting resolution.`);

  return (
    <div>
      {warnings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {warnings.map((w, i) => (
            <div key={i} style={{ padding: '10px 14px', background: '#fef3c7', color: '#92400e', borderRadius: 8, fontSize: 13, marginBottom: 8 }}>
              {w}
            </div>
          ))}
        </div>
      )}

      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Companies</h4>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total"     value={health.companies.total} />
        <KpiCard label="Active"    value={health.companies.active}    color="var(--success)" />
        <KpiCard label="Suspended" value={health.companies.suspended} color="var(--danger)" />
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Users</h4>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total Users"  value={health.users.total} />
        <KpiCard label="Active Users" value={health.users.active}  color="var(--success)" />
        <KpiCard label="Inactive"     value={health.users.total - health.users.active} color="var(--text-muted)" />
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Operations</h4>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Total Farms"    value={health.farms.total} />
        <KpiCard label="Active Batches" value={health.batches.active} />
        <KpiCard label="Logins (24h)"   value={health.activity.logins_24h} color="var(--text-brand)" />
        <KpiCard label="Open Tickets"   value={health.activity.open_tickets}
          color={health.activity.open_tickets > 0 ? 'var(--danger)' : 'var(--text-strong)'} />
      </div>

      <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>Subscriptions</h4>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <KpiCard label="Expiring Soon (30d)" value={health.subscriptions.expiring_soon_30d}
          color={health.subscriptions.expiring_soon_30d > 0 ? '#92400e' : 'var(--text-strong)'} />
        <KpiCard label="Expired but Active"  value={health.subscriptions.expired_but_active}
          color={health.subscriptions.expired_but_active > 0 ? 'var(--danger)' : 'var(--text-strong)'} />
      </div>
    </div>
  );
}

// ── Support Tickets Tab ───────────────────────────────────────────────────────

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13 }}>
      <span style={{ minWidth: 130, fontWeight: 600, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-body)', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function TicketsTab({ companies }) {
  const [data,            setData]            = useState({ total: 0, summary: null, items: [] });
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState('');
  const [stFilter,        setStFilter]        = useState('');
  const [priFilter,       setPriFilter]       = useState('');
  const [coFilter,        setCoFilter]        = useState('');
  const [search,          setSearch]          = useState('');
  const [committedSearch, setCommittedSearch] = useState('');
  const [skip,            setSkip]            = useState(0);
  const [viewTkt,         setViewTkt]         = useState(null);
  const [editTkt,         setEditTkt]         = useState(null);
  const [tktForm,         setTktForm]         = useState({ status: '', priority: '', resolution_notes: '', escalation_notes: '', assigned_to: '' });
  const [tktSaving,       setTktSaving]       = useState(false);
  const [tktErr,          setTktErr]          = useState('');
  const [quickBusy,       setQuickBusy]       = useState(null);
  const [admins,          setAdmins]          = useState([]);
  const LIMIT = 50;

  useEffect(() => {
    superAdminApi.listAllUsers({ role_id: 6, limit: 50 })
      .then(d => setAdmins(d.items || []))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi.listSupportTickets({
      status:     stFilter         || undefined,
      priority:   priFilter        || undefined,
      company_id: coFilter         || undefined,
      search:     committedSearch  || undefined,
      skip, limit: LIMIT,
    })
      .then(d => { setData(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load tickets'))
      .finally(() => setLoading(false));
  }, [stFilter, priFilter, coFilter, committedSearch, skip]);

  useEffect(() => { load(); }, [load]);

  const applySearch = () => { setCommittedSearch(search); setSkip(0); };

  const openEdit = (t) => {
    setEditTkt(t);
    setTktForm({
      status:           t.status,
      priority:         t.priority,
      resolution_notes: t.resolution_notes  || '',
      escalation_notes: t.escalation_notes  || '',
      assigned_to:      t.assigned_to       || '',
    });
    setTktErr('');
  };

  const handleTktSave = async (e) => {
    e.preventDefault();
    setTktSaving(true); setTktErr('');
    try {
      const payload = { ...tktForm };
      if (payload.assigned_to === '') payload.assigned_to = null;
      else if (payload.assigned_to) payload.assigned_to = Number(payload.assigned_to);
      await superAdminApi.updateSupportTicket(editTkt.id, payload);
      setEditTkt(null);
      load();
    } catch (err) { setTktErr(err.message || 'Failed to update ticket.'); }
    finally { setTktSaving(false); }
  };

  const handleQuick = async (t, newStatus) => {
    setQuickBusy(`${t.id}-${newStatus}`);
    try {
      await superAdminApi.quickTicketStatus(t.id, newStatus);
      load();
    } catch (err) { setError(err.message || 'Failed to update'); }
    finally { setQuickBusy(null); }
  };

  const tf = k => e => setTktForm(p => ({ ...p, [k]: e.target.value }));
  const s  = data.summary;

  const isClosed = t => t.status === 'closed';
  const isResolved = t => t.status === 'resolved' || t.status === 'closed';

  return (
    <div>
      {/* KPI cards */}
      {s && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard label="New"              value={s.new}              color={s.new > 0 ? 'var(--text-brand)' : undefined} />
          <KpiCard label="Open / In Progress" value={s.open_in_progress} color={s.open_in_progress > 0 ? '#92400e' : undefined} />
          <KpiCard label="Critical (open)"  value={s.critical}         color={s.critical > 0 ? 'var(--danger)' : undefined} />
          <KpiCard label="Resolved Today"   value={s.resolved_today}   color={s.resolved_today > 0 ? 'var(--success)' : undefined} />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Search</label>
          <input style={FIELD_STYLE} placeholder="Ticket # or subject…" value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && applySearch()} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
          <select style={SELECT_STYLE} value={stFilter} onChange={e => { setStFilter(e.target.value); setSkip(0); }}>
            <option value="">All statuses</option>
            <option value="new">New</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="waiting_on_user">Waiting on User</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Priority</label>
          <select style={SELECT_STYLE} value={priFilter} onChange={e => { setPriFilter(e.target.value); setSkip(0); }}>
            <option value="">All priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Company</label>
          <select style={SELECT_STYLE} value={coFilter} onChange={e => { setCoFilter(e.target.value); setSkip(0); }}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
          </select>
        </div>
        <Btn variant="primary" onClick={applySearch}>Search</Btn>
      </div>

      <ErrBanner msg={error} />
      {loading ? <Spinner /> : (
        <>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>{data.total} ticket(s)</div>
          <STable
            headers={['Ticket #', 'Company', 'Subject', 'Priority', 'Status', 'Assignee', 'Submitted By', 'Date', '']}
            empty="No tickets found."
            rows={data.items.map(t => {
              const isCrit = t.priority === 'critical' && !isResolved(t);
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isCrit ? '#fff7f7' : 'transparent' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-brand)', whiteSpace: 'nowrap' }}>{t.ticket_no}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>
                    {t.company_name
                      ? <span>{t.company_name}<span style={{ marginLeft: 4, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{t.company_id}</span></span>
                      : '—'}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.subject}>{t.subject}</td>
                  <td style={{ padding: '10px 14px' }}><Badge value={t.priority} map={PRIORITY_COLOR} /></td>
                  <td style={{ padding: '10px 14px' }}><Badge value={t.status} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>{t.assignee_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{t.submitter_name || `#${t.user_id}`}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(t.created_at)}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      <Btn onClick={() => setViewTkt(t)}>View</Btn>
                      <Btn onClick={() => openEdit(t)}>Edit</Btn>
                      {!isResolved(t) && (
                        <Btn
                          disabled={quickBusy === `${t.id}-resolved`}
                          onClick={() => handleQuick(t, 'resolved')}
                        >
                          {quickBusy === `${t.id}-resolved` ? '…' : '✓ Resolve'}
                        </Btn>
                      )}
                      {!isClosed(t) && (
                        <Btn
                          variant="danger"
                          disabled={quickBusy === `${t.id}-closed`}
                          onClick={() => handleQuick(t, 'closed')}
                        >
                          {quickBusy === `${t.id}-closed` ? '…' : 'Close'}
                        </Btn>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          />
          <Pager total={data.total} skip={skip} limit={LIMIT} onPage={setSkip} />
        </>
      )}

      {/* View modal */}
      {viewTkt && (
        <ModalShell title={`Ticket ${viewTkt.ticket_no}`} onClose={() => setViewTkt(null)}>
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Badge value={viewTkt.priority} map={PRIORITY_COLOR} />
            <Badge value={viewTkt.status} />
            {viewTkt.company_name && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{viewTkt.company_name} #{viewTkt.company_id}</span>
            )}
          </div>
          <h4 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: 'var(--text-strong)' }}>{viewTkt.subject}</h4>
          {viewTkt.description && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, fontSize: 13, color: 'var(--text-body)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {viewTkt.description}
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginBottom: 14 }}>
            <DetailRow label="Category"        value={viewTkt.category} />
            <DetailRow label="Affected Module" value={viewTkt.affected_module} />
            <DetailRow label="Department"      value={viewTkt.department} />
            <DetailRow label="Farm ID"         value={viewTkt.farm_id ? `#${viewTkt.farm_id}` : null} />
            <DetailRow label="Contact Info"    value={viewTkt.contact_info} />
            <DetailRow label="Submitted By"    value={viewTkt.submitter_name} />
            <DetailRow label="Assigned To"     value={viewTkt.assignee_name || 'Unassigned'} />
          </div>
          {viewTkt.resolution_notes && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#065f46', marginBottom: 4 }}>Resolution Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', background: '#f0fdf4', padding: '10px 12px', borderRadius: 6, whiteSpace: 'pre-wrap' }}>{viewTkt.resolution_notes}</div>
            </div>
          )}
          {viewTkt.escalation_notes && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>Escalation Notes</div>
              <div style={{ fontSize: 13, color: 'var(--text-body)', background: '#fffbeb', padding: '10px 12px', borderRadius: 6, whiteSpace: 'pre-wrap' }}>{viewTkt.escalation_notes}</div>
            </div>
          )}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8, display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
            <span>Created: {fmtDateTime(viewTkt.created_at)}</span>
            <span>Updated: {fmtDateTime(viewTkt.updated_at)}</span>
            {viewTkt.resolved_at && <span style={{ color: '#065f46' }}>Resolved: {fmtDateTime(viewTkt.resolved_at)}</span>}
            {viewTkt.closed_at   && <span style={{ color: '#6b7280' }}>Closed: {fmtDateTime(viewTkt.closed_at)}</span>}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Btn onClick={() => { setViewTkt(null); openEdit(viewTkt); }}>Edit This Ticket</Btn>
            <Btn variant="primary" onClick={() => setViewTkt(null)}>Close</Btn>
          </div>
        </ModalShell>
      )}

      {/* Edit modal */}
      {editTkt && (
        <ModalShell title={`Edit Ticket ${editTkt.ticket_no}`} onClose={() => setEditTkt(null)}>
          <form onSubmit={handleTktSave}>
            <ErrBanner msg={tktErr} />
            <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>{editTkt.subject}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <FormField label="Status">
                <select style={SELECT_STYLE} value={tktForm.status} onChange={tf('status')}>
                  <option value="new">New</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_on_user">Waiting on User</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </FormField>
              <FormField label="Priority">
                <select style={SELECT_STYLE} value={tktForm.priority} onChange={tf('priority')}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
            </div>
            <FormField label="Assign To">
              <select style={SELECT_STYLE} value={tktForm.assigned_to} onChange={tf('assigned_to')}>
                <option value="">— Unassigned —</option>
                {admins.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
              </select>
            </FormField>
            <FormField label="Resolution Notes">
              <textarea rows={3} value={tktForm.resolution_notes} onChange={tf('resolution_notes')}
                placeholder="Steps taken, fix applied, or answer provided…"
                style={{ ...FIELD_STYLE, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
            </FormField>
            <FormField label="Escalation Notes">
              <textarea rows={2} value={tktForm.escalation_notes} onChange={tf('escalation_notes')}
                placeholder="Escalation context, next steps, or handoff notes…"
                style={{ ...FIELD_STYLE, height: 'auto', padding: '8px 10px', resize: 'vertical' }} />
            </FormField>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Btn onClick={() => setEditTkt(null)}>Cancel</Btn>
              <Btn type="submit" variant="primary" disabled={tktSaving}>{tktSaving ? 'Saving…' : 'Save Changes'}</Btn>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────

const EMPTY_ANN = { title: '', body: '', target: 'all', company_id: '', expires_at: '' };

function AnnouncementsTab({ companies }) {
  const [anns,    setAnns]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState(EMPTY_ANN);
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');

  const load = () => {
    superAdminApi.listAnnouncements()
      .then(d => { setAnns(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load announcements'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const af = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormErr('Title is required.'); return; }
    if (!form.body.trim())  { setFormErr('Body is required.'); return; }
    setSaving(true); setFormErr('');
    try {
      await superAdminApi.createAnnouncement({
        title:      form.title.trim(),
        body:       form.body.trim(),
        target:     form.target,
        company_id: form.target === 'company' && form.company_id ? Number(form.company_id) : undefined,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : undefined,
      });
      setForm(EMPTY_ANN);
      load();
    } catch (err) { setFormErr(err.message || 'Failed to create announcement.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await superAdminApi.deleteAnnouncement(id);
      setAnns(prev => prev.filter(a => a.id !== id));
    } catch (err) { setError(err.message || 'Failed to delete.'); }
  };

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* Create form */}
      <div style={{ flex: 1, minWidth: 280, background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <h4 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700 }}>New Announcement</h4>
        <form onSubmit={handleCreate}>
          <ErrBanner msg={formErr} />
          <FormField label="Title" required>
            <input type="text" value={form.title} onChange={af('title')} placeholder="e.g. Scheduled Maintenance" style={FIELD_STYLE} />
          </FormField>
          <FormField label="Message" required>
            <textarea
              rows={4}
              value={form.body}
              onChange={af('body')}
              placeholder="Announcement details…"
              style={{ ...FIELD_STYLE, height: 'auto', padding: '8px 10px', resize: 'vertical' }}
            />
          </FormField>
          <FormField label="Target">
            <select style={SELECT_STYLE} value={form.target} onChange={af('target')}>
              <option value="all">All Companies</option>
              <option value="company">Specific Company</option>
            </select>
          </FormField>
          {form.target === 'company' && (
            <FormField label="Company">
              <select style={SELECT_STYLE} value={form.company_id} onChange={af('company_id')}>
                <option value="">— Select —</option>
                {companies.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
              </select>
            </FormField>
          )}
          <FormField label="Expires At (optional)">
            <input type="date" value={form.expires_at} onChange={af('expires_at')} style={FIELD_STYLE} />
          </FormField>
          <Btn type="submit" variant="primary" disabled={saving}>{saving ? 'Posting…' : 'Post Announcement'}</Btn>
        </form>
      </div>

      {/* List */}
      <div style={{ flex: 2, minWidth: 300 }}>
        <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700 }}>Posted Announcements</h4>
        <ErrBanner msg={error} />
        {loading ? <Spinner /> : anns.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No announcements yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anns.map(a => {
              const expired = a.expires_at && new Date(a.expires_at) < new Date();
              return (
                <div key={a.id} style={{ background: '#fff', border: `1px solid ${expired ? '#e5e7eb' : 'var(--border)'}`, borderRadius: 10, padding: 16, opacity: expired ? 0.6 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                        {a.title}
                        {a.target === 'company' && a.company_name && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '2px 6px', borderRadius: 5 }}>
                            {a.company_name}
                          </span>
                        )}
                        {expired && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>[expired]</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>{a.body}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Posted {fmtDateTime(a.created_at)}
                        {a.expires_at && ` · Expires ${fmtDate(a.expires_at)}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
                      title="Delete"
                    >×</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Subscriptions Tab ─────────────────────────────────────────────────────────

const PLAN_COLOR = {
  starter:    { bg: '#f3f4f6', color: '#374151' },
  standard:   { bg: '#eff6ff', color: '#1d4ed8' },
  enterprise: { bg: '#fdf4ff', color: '#7e22ce' },
};

function SubscriptionsTab() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [stFilter,   setStFilter]   = useState('');

  const load = useCallback(() => {
    setLoading(true);
    superAdminApi.listSubscriptions({ plan_name: planFilter || undefined, status: stFilter || undefined })
      .then(d => { setData(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load subscriptions'))
      .finally(() => setLoading(false));
  }, [planFilter, stFilter]);

  useEffect(() => { load(); }, [load]);

  const s = data?.summary;
  const fmt = n => n?.toLocaleString('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }) ?? '—';

  return (
    <div>
      {s && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <KpiCard label="Total"          value={s.total} />
          <KpiCard label="Active"         value={s.active}        color="var(--success)" />
          <KpiCard label="Expiring ≤30d"  value={s.expiring_soon} color={s.expiring_soon > 0 ? '#92400e' : undefined} />
          <KpiCard label="Expired"        value={s.expired}       color={s.expired > 0 ? 'var(--danger)' : undefined} />
          <KpiCard label="Est. MRR"       value={fmt(s.mrr_estimate)} color="var(--text-brand)"
            sub={Object.entries(s.plan_counts || {}).map(([p, n]) => `${n} ${p}`).join(' · ')} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Plan</label>
          <select style={SELECT_STYLE} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
            <option value="">All plans</option>
            <option value="starter">Starter</option>
            <option value="standard">Standard</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Status</label>
          <select style={SELECT_STYLE} value={stFilter} onChange={e => setStFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      <ErrBanner msg={error} />
      {loading ? <Spinner /> : (
        <STable
          headers={['Company', 'Plan', 'Sub Status', 'Co. Status', 'Expires', 'Days Left', '']}
          empty="No subscriptions."
          rows={(data?.items || []).map(sub => {
            const urgent   = sub.days_left !== null && sub.days_left <= 7 && sub.status === 'active';
            const warning  = sub.days_left !== null && sub.days_left <= 30 && sub.days_left > 7 && sub.status === 'active';
            const pc       = PLAN_COLOR[sub.plan_name] || PLAN_COLOR.standard;
            return (
              <tr key={sub.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: urgent ? '#fff7f7' : 'transparent' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                  {sub.company_name}
                  <span style={{ marginLeft: 5, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{sub.company_id}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', background: pc.bg, color: pc.color }}>
                    {sub.plan_name}
                  </span>
                </td>
                <td style={{ padding: '11px 14px' }}><Badge value={sub.status} /></td>
                <td style={{ padding: '11px 14px' }}><Badge value={sub.company_status} /></td>
                <td style={{ padding: '11px 14px', color: urgent ? '#991b1b' : warning ? '#92400e' : 'inherit', fontWeight: (urgent || warning) ? 600 : 400 }}>
                  {fmtDate(sub.expires_at)}
                </td>
                <td style={{ padding: '11px 14px', fontWeight: 700, color: urgent ? '#991b1b' : warning ? '#92400e' : sub.days_left < 0 ? '#6b7280' : 'inherit' }}>
                  {sub.days_left === null ? '—' : sub.days_left < 0 ? `${Math.abs(sub.days_left)}d ago` : `${sub.days_left}d`}
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {(urgent || warning) && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: urgent ? '#991b1b' : '#92400e' }}>
                      {urgent ? '🔴 URGENT' : '⚠ EXPIRING'}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        />
      )}
    </div>
  );
}


// ── Login History Tab ─────────────────────────────────────────────────────────

function LoginHistoryTab({ companies }) {
  const [data,      setData]      = useState({ total: 0, items: [] });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [coFilter,  setCoFilter]  = useState('');
  const [okFilter,  setOkFilter]  = useState('');
  const [skip,      setSkip]      = useState(0);
  const LIMIT = 100;

  const load = useCallback(() => {
    setLoading(true);
    const params = { skip, limit: LIMIT };
    if (coFilter) params.company_id = coFilter;
    if (okFilter !== '') params.success = okFilter;
    superAdminApi.getLoginHistory(params)
      .then(d => { setData(d); setError(''); })
      .catch(err => setError(err.message || 'Failed to load login history'))
      .finally(() => setLoading(false));
  }, [coFilter, okFilter, skip]);

  useEffect(() => { load(); }, [load]);

  const failCount = data.items.filter(i => !i.success).length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 140 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Company</label>
          <select style={SELECT_STYLE} value={coFilter} onChange={e => { setCoFilter(e.target.value); setSkip(0); }}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>#{c.id} — {c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Result</label>
          <select style={SELECT_STYLE} value={okFilter} onChange={e => { setOkFilter(e.target.value); setSkip(0); }}>
            <option value="">All</option>
            <option value="true">Successful</option>
            <option value="false">Failed</option>
          </select>
        </div>
      </div>

      <ErrBanner msg={error} />
      {!loading && data.total > 0 && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
          {data.total} entries · <span style={{ color: '#991b1b', fontWeight: 600 }}>{failCount} failed</span> on this page
        </div>
      )}
      {loading ? <Spinner /> : (
        <>
          <STable
            headers={['When', 'User', 'Company', 'Result', 'IP Address', 'Failure Reason']}
            empty="No login history."
            rows={data.items.map(l => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: !l.success ? '#fff7f7' : 'transparent' }}>
                <td style={{ padding: '9px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(l.created_at)}</td>
                <td style={{ padding: '9px 14px', fontWeight: 500 }}>{l.user_name || `#${l.user_id}`}</td>
                <td style={{ padding: '9px 14px', fontSize: 12 }}>
                  {l.company_name
                    ? <span>{l.company_name}<span style={{ marginLeft: 4, color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{l.company_id}</span></span>
                    : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ padding: '9px 14px' }}>
                  {l.success
                    ? <span style={{ color: '#065f46', fontWeight: 700, fontSize: 12 }}>✓ OK</span>
                    : <span style={{ color: '#991b1b', fontWeight: 700, fontSize: 12 }}>✗ FAIL</span>}
                </td>
                <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)' }}>{l.ip_address || '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#991b1b' }}>{l.failure_reason || '—'}</td>
              </tr>
            ))}
          />
          <Pager total={data.total} skip={skip} limit={LIMIT} onPage={setSkip} />
        </>
      )}
    </div>
  );
}


// ── Main Page ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'companies',     label: 'Companies' },
  { id: 'users',         label: 'All Users' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'audit',         label: 'Audit Logs' },
  { id: 'health',        label: 'System Health' },
  { id: 'tickets',       label: 'Support Tickets' },
  { id: 'announcements', label: 'Announcements' },
  { id: 'login-history', label: 'Login History' },
];

export default function SuperAdminPage() {
  const [tab,       setTab]       = useState('companies');
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    superAdminApi.listCompanies().then(setCompanies).catch(() => {});
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, margin: '0 0 4px', color: 'var(--text-strong)' }}>
          Super Admin Portal
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          System-wide administration — companies, users, subscriptions, and monitoring.
        </p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, background: '#f3f4f6', padding: 4, borderRadius: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              minWidth: 100,
              padding: '8px 14px',
              border: 'none',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: tab === t.id ? '#fff' : 'transparent',
              color: tab === t.id ? 'var(--text-strong)' : 'var(--text-muted)',
              boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      {tab === 'companies'     && <CompaniesTab />}
      {tab === 'users'         && <UsersTab companies={companies} />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
      {tab === 'audit'         && <AuditLogsTab companies={companies} />}
      {tab === 'health'        && <HealthTab />}
      {tab === 'tickets'       && <TicketsTab companies={companies} />}
      {tab === 'announcements' && <AnnouncementsTab companies={companies} />}
      {tab === 'login-history' && <LoginHistoryTab companies={companies} />}
    </div>
  );
}
