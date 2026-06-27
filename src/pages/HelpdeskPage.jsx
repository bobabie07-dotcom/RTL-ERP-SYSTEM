import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { supportApi } from '../api/client';
import Icons from '../icons';

const I = Icons;

const STATUS_TONE = {
  new: 'info', open: 'info', assigned: 'info',
  in_progress: 'warning', waiting_for_user: 'neutral', waiting_on_user: 'neutral',
  resolved: 'success', closed: 'neutral', reopened: 'info', cancelled: 'danger', escalated: 'danger',
};
const STATUS_LABEL = {
  new: 'New', open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
  waiting_for_user: 'Waiting', waiting_on_user: 'Waiting',
  resolved: 'Resolved', closed: 'Closed', reopened: 'Reopened',
  cancelled: 'Cancelled', escalated: 'Escalated',
};
const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };

const STATUS_OPTIONS = [
  { value: 'new',              label: 'New' },
  { value: 'assigned',         label: 'Assigned' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'resolved',         label: 'Resolved' },
  { value: 'closed',           label: 'Closed' },
  { value: 'escalated',        label: 'Escalated' },
  { value: 'cancelled',        label: 'Cancelled' },
];

const CATEGORY_LABELS = {
  login_problem: 'Login Problem', account_issue: 'Account Issue',
  inventory_issue: 'Inventory Issue', procurement_issue: 'Procurement Issue',
  sales_issue: 'Sales Issue', report_issue: 'Report Issue',
  dashboard_issue: 'Dashboard Issue', button_not_working: 'Button Not Working',
  data_not_saving: 'Data Not Saving', calculation_issue: 'Calculation Issue',
  permission_issue: 'Permission Issue', system_error: 'System Error',
  feature_request: 'Feature Request', other: 'Other',
  bug: 'Bug', access_request: 'Access Request', general: 'General',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt.endsWith('Z') ? dt : dt + 'Z')
    .toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface-card)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '16px 20px',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function HelpdeskPage() {
  const navigate = useNavigate();
  const [tickets,  setTickets]  = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [loadErr,  setLoadErr]  = useState('');

  const [statusFilter,   setStatusFilter]   = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch]                 = useState('');

  async function load(status, priority) {
    setLoading(true);
    setLoadErr('');
    try {
      const [t, d] = await Promise.all([
        supportApi.listTickets({ status: status || undefined, priority: priority || undefined }),
        supportApi.getDashboard(),
      ]);
      setTickets(t || []);
      setDashboard(d);
    } catch (e) {
      setLoadErr(e?.detail || e?.message || 'Failed to load tickets.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(statusFilter, priorityFilter); }, [statusFilter, priorityFilter]);

  const filtered = tickets.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.subject.toLowerCase().includes(q) ||
      t.ticket_no.toLowerCase().includes(q) ||
      (t.submitter_name || '').toLowerCase().includes(q) ||
      (t.assignee_name  || '').toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>
          IT Helpdesk
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage all support tickets — assign, update, and resolve.
        </p>
      </div>

      {/* Dashboard Stats */}
      {dashboard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
          <StatCard label="Total"     value={dashboard.total}     color="var(--text-secondary)" sub="All tickets" />
          <StatCard label="Open"      value={dashboard.open}      color="#2563eb"               sub="Needs attention" />
          <StatCard label="Waiting"   value={dashboard.waiting}   color="#f59e0b"               sub="Waiting for user" />
          <StatCard label="Escalated" value={dashboard.escalated} color="#dc2626"               sub="High urgency" />
          <StatCard label="Resolved"  value={dashboard.resolved}  color="#16a34a"               sub="Completed" />
          <StatCard label="Critical"  value={dashboard.critical}  color="#dc2626"               sub="Critical priority" />
        </div>
      )}

      {/* Filters + Ticket List */}
      <Card>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <I.search w={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tickets, submitter…"
              style={{
                width: '100%', height: 36, paddingLeft: 28, paddingRight: 10,
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none',
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); }}
            style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={priorityFilter}
            onChange={e => { setPriorityFilter(e.target.value); }}
            style={{ height: 36, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}
          >
            <option value="">All Priority</option>
            {['critical', 'high', 'medium', 'low'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={() => load(statusFilter, priorityFilter)}
            style={{
              height: 36, padding: '0 14px', border: '1px solid var(--border)',
              borderRadius: 8, fontSize: 13, background: 'var(--surface-card)',
              cursor: 'pointer', color: 'var(--text-secondary)',
            }}
          >
            Refresh
          </button>
        </div>

        {loadErr && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#991b1b', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
            {loadErr}
          </div>
        )}

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No tickets found.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Ticket #', 'Subject', 'Submitter', 'Category', 'Priority', 'Status', 'Assigned To', 'Created', ''].map(h => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left', fontSize: 11,
                      color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/helpdesk/tickets/${t.id}`)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 80ms' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover, #f9fafb)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t.ticket_no}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 260 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.subject}
                      </div>
                      {t.affected_module && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{t.affected_module}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{t.submitter_name || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                      {CATEGORY_LABELS[t.category] || t.category}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge tone={PRIORITY_TONE[t.priority] || 'neutral'} style={{ textTransform: 'capitalize' }}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge tone={STATUS_TONE[t.status] || 'neutral'}>
                        {STATUS_LABEL[t.status] || t.status}
                      </Badge>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {t.assignee_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmt(t.created_at)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontSize: 12, color: 'var(--text-brand)', fontWeight: 600,
                        padding: '4px 10px', border: '1px solid var(--border)', borderRadius: 6,
                        whiteSpace: 'nowrap',
                      }}>
                        Open →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', textAlign: 'right' }}>
            {filtered.length} ticket{filtered.length !== 1 ? 's' : ''}
          </div>
        )}
      </Card>
    </div>
  );
}
