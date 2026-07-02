import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

const MODEL_LABEL = { broiler: 'Broiler', layer: 'Layer', rtl: 'RTL' };
const MODEL_COLOR = {
  broiler: { bg: '#fef3c7', color: '#92400e' },
  layer:   { bg: '#d1fae5', color: '#065f46' },
  rtl:     { bg: '#ede9fe', color: '#5b21b6' },
};

const INPUT = {
  width: '100%', height: 38, padding: '0 10px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const SEL = { ...INPUT, background: '#fff', cursor: 'pointer' };

const EMPTY_FORM = {
  name: '', plan_name: 'standard', expires_at: '', business_model: 'broiler',
};

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const [companies,  setCompanies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [subs,       setSubs]       = useState({});

  // Modal state
  const [modal,      setModal]      = useState(null); // null | 'add' | 'edit'
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [editId,     setEditId]     = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErr,    setFormErr]    = useState('');

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.listCompanies();
      setCompanies(data);
      const subMap = {};
      await Promise.all(data.map(async comp => {
        try { subMap[comp.id] = await superAdminApi.getSubscription(comp.id); } catch {}
      }));
      setSubs(subMap);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormErr('');
    setModal('add');
  };

  const openEdit = (comp) => {
    const sub = subs[comp.id];
    setEditId(comp.id);
    setForm({
      name:           comp.name,
      plan_name:      sub?.plan_name || 'standard',
      expires_at:     sub?.expires_at ? sub.expires_at.split('T')[0] : '',
      business_model: comp.business_model || 'broiler',
    });
    setFormErr('');
    setModal('edit');
  };

  const closeModal = () => { setModal(null); setFormErr(''); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Company name is required.'); return; }
    if (!form.expires_at)  { setFormErr('Expiry date is required.'); return; }
    setSubmitting(true);
    setFormErr('');
    try {
      const expiresIso = new Date(form.expires_at).toISOString();
      if (modal === 'add') {
        await superAdminApi.createCompany({
          name:           form.name.trim(),
          plan_name:      form.plan_name,
          expires_at:     expiresIso,
          business_model: form.business_model,
        });
      } else {
        await superAdminApi.updateCompany(editId, {
          name:           form.name.trim(),
          business_model: form.business_model,
        });
        await superAdminApi.updateSubscription(editId, {
          plan_name:  form.plan_name,
          expires_at: expiresIso,
        });
      }
      closeModal();
      fetchCompanies();
    } catch (err) {
      setFormErr(err.message || 'Failed to save company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (comp) => {
    const nextStatus = comp.status === 'active' ? 'suspended' : 'active';
    try {
      await superAdminApi.updateCompany(comp.id, { status: nextStatus });
      setCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, status: nextStatus } : c));
    } catch (err) {
      alert(err.message || 'Failed to update company status');
    }
  };

  const handleDelete = async (comp) => {
    if (!window.confirm(`Delete "${comp.name}"? This will permanently remove the company and all its data.`)) return;
    try {
      await superAdminApi.deleteCompany(comp.id);
      setCompanies(prev => prev.filter(c => c.id !== comp.id));
      setSubs(prev => { const n = { ...prev }; delete n[comp.id]; return n; });
    } catch (err) {
      alert(err.message || 'Failed to delete company');
    }
  };

  if (loading) return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading Super Admin Portal...</div>;

  const activeCount    = companies.filter(c => c.status === 'active').length;
  const suspendedCount = companies.filter(c => c.status === 'suspended').length;

  const BTN = (extra) => ({
    background: 'none', border: '1px solid var(--border)', borderRadius: 6,
    padding: '4px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
    ...extra,
  });

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Companies',     value: companies.length, color: 'var(--text-strong)' },
          { label: 'Active Companies',    value: activeCount,      color: 'var(--success)' },
          { label: 'Suspended Companies', value: suspendedCount,   color: 'var(--danger)' },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 150 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0 }}>Registered Companies</h2>
        <button onClick={openAdd} style={{ background: 'var(--green-500)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Add New Company
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Company ID</th>
              <th style={{ padding: '12px 16px' }}>Company Name</th>
              <th style={{ padding: '12px 16px' }}>Business Model</th>
              <th style={{ padding: '12px 16px' }}>Active Subscription Plan</th>
              <th style={{ padding: '12px 16px' }}>Subscription Expires</th>
              <th style={{ padding: '12px 16px' }}>Created Date</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No companies registered yet.</td></tr>
            ) : companies.map(c => {
              const sub  = subs[c.id];
              const mdl  = c.business_model || 'broiler';
              const mclr = MODEL_COLOR[mdl] || MODEL_COLOR.broiler;
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>#{c.id}</td>
                  <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.name}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 8px', background: mclr.bg, color: mclr.color, borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {MODEL_LABEL[mdl] || mdl}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 8px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>
                      {sub?.plan_name || 'No Plan'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>{sub?.expires_at ? fmtDate(sub.expires_at) : '—'}</td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{fmtDate(c.created_at)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                      background: c.status === 'active' ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color:      c.status === 'active' ? 'var(--success)'    : 'var(--danger)' }}>
                      {c.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(c)} style={BTN({ color: 'var(--text-brand)' })}>Edit</button>
                      <button onClick={() => handleToggleStatus(c)} style={BTN({ color: c.status === 'active' ? 'var(--danger)' : 'var(--success)' })}>
                        {c.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(c)} style={BTN({ color: 'var(--danger)' })}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal && (
        <ModalShell title={modal === 'add' ? 'Register New Company' : 'Edit Company'} onClose={closeModal}>
          <form onSubmit={handleSave}>
            {formErr && <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 7, fontSize: 13, marginBottom: 14 }}>{formErr}</div>}

            <FormField label="Company Name" required>
              <input type="text" required value={form.name} onChange={f('name')} placeholder="e.g. Acme Farms Ltd" style={INPUT} />
            </FormField>

            <FormField label="Business Model" required>
              <select value={form.business_model} onChange={f('business_model')} style={SEL}>
                <option value="broiler">Broiler (Meat / Grow-out)</option>
                <option value="layer">Layer (Egg Production)</option>
                <option value="rtl">RTL (Raise-to-Lay)</option>
              </select>
            </FormField>

            <FormField label="Subscription Plan" required>
              <select value={form.plan_name} onChange={f('plan_name')} style={SEL}>
                <option value="starter">Starter</option>
                <option value="standard">Standard</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </FormField>

            <FormField label="Subscription Expiry Date" required>
              <input type="date" required value={form.expires_at} onChange={f('expires_at')} style={INPUT} />
            </FormField>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button type="button" onClick={closeModal}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                style={{ background: 'var(--green-500)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Saving...' : (modal === 'add' ? 'Register Company' : 'Save Changes')}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
