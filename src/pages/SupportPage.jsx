import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { supportApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE   = {
  new: 'info', open: 'info', assigned: 'info',
  in_progress: 'warning', waiting_for_user: 'neutral', waiting_on_user: 'neutral',
  resolved: 'success', closed: 'neutral', reopened: 'info', cancelled: 'danger', escalated: 'danger',
};
const STATUS_LABEL  = {
  new: 'New', open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  waiting_for_user: 'Waiting', waiting_on_user: 'Waiting', resolved: 'Resolved',
  closed: 'Closed', reopened: 'Reopened', cancelled: 'Cancelled', escalated: 'Escalated',
};
const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };

const CATEGORIES = [
  { value: 'login_problem',     label: 'Login Problem' },
  { value: 'account_issue',     label: 'Account Issue' },
  { value: 'inventory_issue',   label: 'Inventory Issue' },
  { value: 'procurement_issue', label: 'Procurement Issue' },
  { value: 'sales_issue',       label: 'Sales Issue' },
  { value: 'report_issue',      label: 'Report Issue' },
  { value: 'dashboard_issue',   label: 'Dashboard Issue' },
  { value: 'button_not_working',label: 'Button Not Working' },
  { value: 'data_not_saving',   label: 'Data Not Saving' },
  { value: 'calculation_issue', label: 'Calculation Issue' },
  { value: 'permission_issue',  label: 'Permission Issue' },
  { value: 'system_error',      label: 'System Error' },
  { value: 'feature_request',   label: 'Feature Request' },
  { value: 'other',             label: 'Other' },
];

const MODULES = [
  'Dashboard', 'Batches', 'Feed Management', 'Inventory', 'Procurement',
  'Sales', 'Mortality', 'Health & Vaccination', 'Reports', 'User Management',
  'Sites', 'Maintenance', 'Login / Password', 'Other',
];

const DEPARTMENTS = ['Operations', 'Finance', 'Procurement', 'Sales', 'IT', 'Management', 'Other'];

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt.endsWith('Z') ? dt : dt + 'Z')
    .toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PriorityDot({ p }) {
  const colors = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: colors[p] || '#6b7280', marginRight: 5,
    }} />
  );
}

const EMPTY_FORM = {
  subject: '', category: 'other', priority: 'medium', description: '',
  affected_module: '', contact_info: '', department: '',
};

export default function SupportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]         = useState('tickets');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  const [form, setForm]         = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState('');
  const [submitOk, setSubmitOk]     = useState(false);

  async function loadTickets() {
    setLoading(true);
    setLoadErr('');
    try { setTickets(await supportApi.listTickets()); }
    catch (e) { setLoadErr(e?.detail || e?.message || 'Failed to load tickets'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTickets(); }, []);

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setSubmitErr('Subject and description are required.');
      return;
    }
    setSubmitting(true);
    setSubmitErr('');
    try {
      await supportApi.createTicket({
        subject:         form.subject.trim(),
        category:        form.category,
        priority:        form.priority,
        description:     form.description.trim(),
        affected_module: form.affected_module || undefined,
        contact_info:    form.contact_info    || undefined,
        department:      form.department      || undefined,
      });
      setSubmitOk(true);
      setForm(EMPTY_FORM);
      await loadTickets();
      setTimeout(() => { setSubmitOk(false); setTab('tickets'); }, 2000);
    } catch (e) {
      setSubmitErr(e?.detail || e?.message || 'Failed to submit ticket.');
    } finally {
      setSubmitting(false);
    }
  }

  const openCount   = tickets.filter(t => ['new','open','assigned','in_progress'].includes(t.status)).length;
  const waitCount   = tickets.filter(t => ['waiting_for_user','waiting_on_user'].includes(t.status)).length;
  const resolvedCount = tickets.filter(t => t.status === 'resolved').length;

  const sel = {
    base: {
      width: '100%', height: 40, padding: '0 12px',
      border: '1px solid var(--border)', borderRadius: 8,
      fontSize: 14, fontFamily: 'var(--font-body)',
      background: 'var(--white)', cursor: 'pointer',
    },
  };
  const inp = {
    width: '100%', height: 40, padding: '0 12px',
    border: '1px solid var(--border)', borderRadius: 8,
    fontSize: 14, fontFamily: 'var(--font-body)',
    boxSizing: 'border-box', outline: 'none',
  };
  const lbl = { fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>IT Support</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Submit issues or requests and track their status.</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Open / Active', value: openCount,    color: '#2563eb' },
          { label: 'Waiting',       value: waitCount,    color: '#f59e0b' },
          { label: 'Resolved',      value: resolvedCount,color: '#16a34a' },
          { label: 'Total',         value: tickets.length, color: '#6b7280' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--surface-card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 20px', minWidth: 100,
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border)' }}>
        {[{ key: 'tickets', label: 'My Tickets' }, { key: 'submit', label: '+ Submit New Ticket' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            border: 'none', background: 'none', cursor: 'pointer', padding: '10px 20px',
            fontSize: 14, fontWeight: tab === t.key ? 700 : 500,
            color: tab === t.key ? 'var(--text-brand)' : 'var(--text-secondary)',
            borderBottom: tab === t.key ? '2px solid var(--green-500)' : '2px solid transparent',
            marginBottom: -2, fontFamily: 'var(--font-body)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* My Tickets */}
      {tab === 'tickets' && (
        <div>
          {loadErr && (
            <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
              {loadErr}
            </div>
          )}
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
          ) : tickets.length === 0 ? (
            <Card>
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🎫</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No tickets yet</div>
                <div style={{ fontSize: 13 }}>Submit a support request using the tab above.</div>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tickets.map(t => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/support/tickets/${t.id}`)}
                  style={{
                    background: 'var(--surface-card)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                    transition: 'border-color 100ms, box-shadow 100ms',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#4ade80';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t.ticket_no}</span>
                        <Badge tone={STATUS_TONE[t.status] || 'neutral'}>{STATUS_LABEL[t.status] || t.status}</Badge>
                        <Badge tone={PRIORITY_TONE[t.priority] || 'neutral'} style={{ textTransform: 'capitalize' }}>{t.priority}</Badge>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-strong)', marginBottom: 3 }}>{t.subject}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {CATEGORIES.find(c => c.value === t.category)?.label || t.category}
                        {t.affected_module && ` · ${t.affected_module}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(t.created_at)}</div>
                      {t.assignee_name && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Assigned to {t.assignee_name}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Submit form */}
      {tab === 'submit' && (
        <Card title="Submit a Support Ticket" subtitle="Describe your issue and we'll get back to you shortly.">
          {submitOk ? (
            <div style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>Ticket submitted!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Redirecting to your tickets…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {submitErr && (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
                  {submitErr}
                </div>
              )}

              {/* Submitter info banner */}
              <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span><b>Submitted by:</b> {user?.full_name}</span>
                <span><b>Date:</b> {new Date().toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>

              {/* Subject — full width */}
              <div style={{ marginBottom: 16 }}>
                <label style={lbl}>Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input
                  value={form.subject} onChange={f('subject')}
                  placeholder="Brief description of your issue"
                  style={inp}
                />
              </div>

              {/* Category / Priority / Module */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Category</label>
                  <select value={form.category} onChange={f('category')} style={sel.base}>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Priority</label>
                  <select value={form.priority} onChange={f('priority')} style={sel.base}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical – System Down</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Affected Module</label>
                  <select value={form.affected_module} onChange={f('affected_module')} style={sel.base}>
                    <option value="">— Select module (optional) —</option>
                    {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Department / Contact */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={lbl}>Department</label>
                  <select value={form.department} onChange={f('department')} style={sel.base}>
                    <option value="">— Select department (optional) —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Contact Info (phone or extension)</label>
                  <input
                    value={form.contact_info} onChange={f('contact_info')}
                    placeholder="Optional"
                    style={inp}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea
                  value={form.description} onChange={f('description')} rows={6}
                  placeholder="Describe the issue in detail. Include steps to reproduce, what you expected, and what actually happened."
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)',
                    resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6,
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Ticket'}
                </Button>
                <button
                  type="button"
                  onClick={() => { setForm(EMPTY_FORM); setSubmitErr(''); }}
                  style={{ fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Clear form
                </button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
