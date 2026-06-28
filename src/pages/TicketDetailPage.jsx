import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supportApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

const ADMIN_ROLES = new Set([1, 2, 5]);

const STATUS_COLORS = {
  new:              { bg: '#dbeafe', color: '#1e40af' },
  assigned:         { bg: '#ede9fe', color: '#5b21b6' },
  in_progress:      { bg: '#fef3c7', color: '#92400e' },
  waiting_for_user: { bg: '#ffedd5', color: '#9a3412' },
  waiting_on_user:  { bg: '#ffedd5', color: '#9a3412' },
  open:             { bg: '#dbeafe', color: '#1e40af' },
  resolved:         { bg: '#d1fae5', color: '#065f46' },
  closed:           { bg: '#f3f4f6', color: '#374151' },
  reopened:         { bg: '#fce7f3', color: '#9d174d' },
  cancelled:        { bg: '#fee2e2', color: '#991b1b' },
  escalated:        { bg: '#fee2e2', color: '#7f1d1d' },
};

const PRIORITY_COLORS = {
  low:      { bg: '#f3f4f6', color: '#374151' },
  medium:   { bg: '#fef3c7', color: '#92400e' },
  high:     { bg: '#ffedd5', color: '#9a3412' },
  critical: { bg: '#fee2e2', color: '#991b1b' },
};

const CATEGORY_LABELS = {
  login_problem:    'Login Problem',
  account_issue:    'Account Issue',
  inventory_issue:  'Inventory Issue',
  procurement_issue:'Procurement Issue',
  sales_issue:      'Sales Issue',
  report_issue:     'Report Issue',
  dashboard_issue:  'Dashboard Issue',
  button_not_working:'Button Not Working',
  data_not_saving:  'Data Not Saving',
  calculation_issue:'Calculation Issue',
  permission_issue: 'Permission Issue',
  system_error:     'System Error',
  feature_request:  'Feature Request',
  other:            'Other',
  bug:              'Bug',
  access_request:   'Access Request',
  general:          'General',
};

const ADMIN_STATUSES = [
  { value: 'new',              label: 'New' },
  { value: 'assigned',         label: 'Assigned' },
  { value: 'in_progress',      label: 'In Progress' },
  { value: 'waiting_for_user', label: 'Waiting for User' },
  { value: 'resolved',         label: 'Resolved' },
  { value: 'closed',           label: 'Closed' },
  { value: 'cancelled',        label: 'Cancelled' },
  { value: 'escalated',        label: 'Escalated' },
];

function Badge({ value, map, fallbackBg = '#e5e7eb', fallbackColor = '#374151' }) {
  const style = map[value] || { bg: fallbackBg, color: fallbackColor };
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
      background: style.bg, color: style.color, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {value?.replace(/_/g, ' ')}
    </span>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = (name || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6'];
  const bg = colors[(name || '').charCodeAt(0) % colors.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

function TimeAgo({ dt }) {
  if (!dt) return null;
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  const diff = (Date.now() - d.getTime()) / 1000;
  const fmt = diff < 60 ? 'just now'
    : diff < 3600  ? `${Math.floor(diff / 60)}m ago`
    : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
    : `${Math.floor(diff / 86400)}d ago`;
  return <span title={d.toLocaleString()} style={{ color: '#9ca3af', fontSize: 12 }}>{fmt}</span>;
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.has(user?.role_id);

  const [ticket, setTicket]     = useState(null);
  const [staff,  setStaff]      = useState([]);
  const [loading, setLoading]   = useState(true);
  const [err, setErr]           = useState('');

  const [reply, setReply]       = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending]   = useState(false);
  const [replyErr, setReplyErr] = useState('');

  const [statusNote, setStatusNote]   = useState('');
  const [showStatusDrop, setShowStatusDrop] = useState(false);
  const [changing, setChanging]       = useState(false);
  const [actionErr, setActionErr]     = useState('');

  const [showActivity, setShowActivity] = useState(false);

  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [aiError,      setAiError]      = useState('');

  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [t, s] = await Promise.all([
        supportApi.getTicket(id),
        isAdmin ? supportApi.getStaff() : Promise.resolve([]),
      ]);
      setTicket(t);
      setStaff(s);
    } catch (e) {
      setErr(e?.detail || e?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.comments?.length]);

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiError('');
    try {
      const res = await supportApi.aiSuggest(id);
      setAiSuggestion(res.suggestion);
    } catch (e) {
      setAiError(e?.message || 'Failed to get AI suggestion');
    } finally {
      setAiLoading(false);
    }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setReplyErr('');
    try {
      await supportApi.addComment(id, { comment: reply.trim(), is_internal: internal });
      setReply('');
      setInternal(false);
      await load();
    } catch (e) {
      setReplyErr(e?.detail || e?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }

  async function handleAssign(userId) {
    setChanging(true);
    setActionErr('');
    try {
      await supportApi.assignTicket(id, { user_id: userId || null });
      await load();
    } catch (e) {
      setActionErr(e?.detail || e?.message || 'Failed to assign');
    } finally {
      setChanging(false);
    }
  }

  async function handleStatus(status) {
    setChanging(true);
    setActionErr('');
    setShowStatusDrop(false);
    try {
      await supportApi.changeStatus(id, { status, notes: statusNote || undefined });
      setStatusNote('');
      await load();
    } catch (e) {
      setActionErr(e?.detail || e?.message || 'Failed to update status');
    } finally {
      setChanging(false);
    }
  }

  async function handlePriority(priority) {
    setChanging(true);
    setActionErr('');
    try {
      await supportApi.updateTicket(id, { priority });
      await load();
    } catch (e) {
      setActionErr(e?.detail || e?.message || 'Failed to update priority');
    } finally {
      setChanging(false);
    }
  }

  const backPath = isAdmin ? '/helpdesk' : '/support';

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading ticket…</div>;
  if (err)     return <div style={{ padding: 40, color: '#dc2626' }}>{err}</div>;
  if (!ticket) return null;

  const isClosed = ['closed', 'cancelled'].includes(ticket.status);
  const canReopen = !isAdmin && ticket.status === 'resolved';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => navigate(backPath)} style={{
          background: 'none', border: '1px solid #d1d5db', borderRadius: 8,
          padding: '6px 14px', cursor: 'pointer', fontSize: 13, color: '#374151',
        }}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, color: '#6b7280', fontSize: 13 }}>{ticket.ticket_no}</span>
            <Badge value={ticket.status}   map={STATUS_COLORS} />
            <Badge value={ticket.priority} map={PRIORITY_COLORS} />
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {CATEGORY_LABELS[ticket.category] || ticket.category}
            </span>
          </div>
          <h2 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 700, color: '#111827' }}>
            {ticket.subject}
          </h2>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ── Left column: description + conversation ── */}
        <div style={{ flex: '1 1 520px', minWidth: 0 }}>

          {/* Original description */}
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
            padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <Avatar name={ticket.submitter_name} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{ticket.submitter_name || 'User'}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  Submitted <TimeAgo dt={ticket.created_at} />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {ticket.description}
            </div>
            {ticket.affected_module && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#6b7280' }}>
                <strong>Affected module:</strong> {ticket.affected_module}
              </div>
            )}
          </div>

          {/* AI Suggestion panel — admin only */}
          {isAdmin && (
            <div style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
              padding: 20, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: aiSuggestion ? 14 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>✨</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#5b21b6' }}>AI Suggestion</span>
                  <span style={{ fontSize: 11, color: '#7c3aed', background: '#f5f3ff', padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>Powered by Claude</span>
                </div>
                <button
                  onClick={handleAiSuggest}
                  disabled={aiLoading}
                  style={{
                    background: aiLoading ? '#e9d5ff' : '#7c3aed',
                    color: '#fff', border: 'none', borderRadius: 8,
                    padding: '6px 14px', fontSize: 13, fontWeight: 600,
                    cursor: aiLoading ? 'default' : 'pointer',
                    opacity: aiLoading ? 0.8 : 1,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {aiLoading ? (
                    <>
                      <span style={{ display: 'inline-block', width: 12, height: 12, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                      Thinking…
                    </>
                  ) : aiSuggestion ? '↺ Refresh' : 'Get Suggestion'}
                </button>
              </div>
              {aiLoading && !aiSuggestion && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#7c3aed' }}>Analyzing your ticket, please wait…</p>
              )}
              {aiError && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#dc2626' }}>{aiError}</p>
              )}
              {aiSuggestion && !aiLoading && (
                <div style={{
                  background: '#f5f3ff', border: '1px solid #ddd6fe',
                  borderRadius: 10, padding: '14px 16px',
                  fontSize: 14, color: '#1e1b4b', lineHeight: 1.75,
                  whiteSpace: 'pre-wrap',
                }}>
                  {aiSuggestion}
                </div>
              )}
              {!aiSuggestion && !aiLoading && !aiError && (
                <p style={{ margin: '10px 0 0', fontSize: 13, color: '#9ca3af' }}>
                  Click "Get Suggestion" to get AI-powered troubleshooting steps for this ticket.
                </p>
              )}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          {/* Comments thread */}
          {ticket.comments?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              {ticket.comments.map(c => {
                const isOwnComment = c.user_id === user?.id;
                const isSupport    = c.is_internal || (isAdmin && !isOwnComment);
                return (
                  <div key={c.id} style={{
                    display: 'flex', gap: 12, flexDirection: isOwnComment ? 'row-reverse' : 'row',
                  }}>
                    <Avatar name={c.author_name} size={28} />
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{
                        background: c.is_internal ? '#fefce8' : isOwnComment ? '#eff6ff' : '#fff',
                        border: `1px solid ${c.is_internal ? '#fde68a' : isOwnComment ? '#bfdbfe' : '#e5e7eb'}`,
                        borderRadius: 12, padding: '10px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>
                            {c.author_name}
                            {c.is_internal && (
                              <span style={{ marginLeft: 6, fontSize: 10, background: '#fde68a', color: '#92400e', padding: '1px 6px', borderRadius: 6 }}>
                                Internal Note
                              </span>
                            )}
                          </span>
                          <TimeAgo dt={c.created_at} />
                        </div>
                        <div style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {c.comment}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}

          {/* Reply form */}
          {!isClosed ? (
            <form onSubmit={handleReply} style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16,
            }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Write a reply…"
                rows={4}
                style={{
                  width: '100%', border: '1px solid #d1d5db', borderRadius: 8,
                  padding: '10px 12px', fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
              {isAdmin && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                  <input type="checkbox" checked={internal} onChange={e => setInternal(e.target.checked)} />
                  Internal note (not visible to user)
                </label>
              )}
              {replyErr && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 6 }}>{replyErr}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="submit" disabled={sending || !reply.trim()} style={{
                  background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: sending || !reply.trim() ? 0.5 : 1,
                }}>
                  {sending ? 'Sending…' : internal ? 'Add Note' : 'Send Reply'}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px', background: '#f9fafb', borderRadius: 12, color: '#6b7280', fontSize: 14 }}>
              This ticket is {ticket.status}. No further replies can be added.
              {canReopen && (
                <button onClick={() => handleStatus('reopened')} style={{
                  marginLeft: 12, background: '#7c3aed', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer',
                }}>
                  Reopen Ticket
                </button>
              )}
            </div>
          )}

          {canReopen && !isClosed && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button onClick={() => handleStatus('reopened')} style={{
                background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8,
                padding: '7px 16px', fontSize: 13, cursor: 'pointer',
              }}>
                Reopen Ticket
              </button>
            </div>
          )}

          {/* Activity Log (admin only, collapsible) */}
          {isAdmin && ticket.activity?.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowActivity(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 13, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {showActivity ? '▼' : '▶'} Activity Log ({ticket.activity.length})
              </button>
              {showActivity && (
                <div style={{
                  marginTop: 8, background: '#f9fafb', border: '1px solid #e5e7eb',
                  borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6,
                }}>
                  {ticket.activity.map(a => (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12 }}>
                      <span style={{ color: '#9ca3af', whiteSpace: 'nowrap' }}><TimeAgo dt={a.created_at} /></span>
                      <span style={{ color: '#374151' }}>
                        <strong>{a.actor_name || `User #${a.performed_by}`}</strong>{' '}
                        {a.action_type.replace(/_/g, ' ')}
                        {a.old_value && a.new_value && ` (${a.old_value} → ${a.new_value})`}
                        {a.notes && <span style={{ color: '#6b7280' }}> — {a.notes}</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right column: metadata + admin controls ── */}
        <div style={{ width: 280, flexShrink: 0 }}>

          {/* Ticket Info Card */}
          <div style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 16,
          }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Ticket Info</h3>
            <Row label="Ticket #"    value={ticket.ticket_no} />
            <Row label="Status"      value={<Badge value={ticket.status}   map={STATUS_COLORS} />} />
            <Row label="Priority"    value={<Badge value={ticket.priority} map={PRIORITY_COLORS} />} />
            <Row label="Category"    value={CATEGORY_LABELS[ticket.category] || ticket.category} />
            <Row label="Submitted by" value={ticket.submitter_name || '—'} />
            <Row label="Assigned to"  value={ticket.assignee_name  || 'Unassigned'} />
            {ticket.department && <Row label="Department" value={ticket.department} />}
            {ticket.contact_info && <Row label="Contact"    value={ticket.contact_info} />}
            <Row label="Created"  value={ticket.created_at ? new Date(ticket.created_at + 'Z').toLocaleDateString() : '—'} />
            {ticket.resolved_at && <Row label="Resolved" value={new Date(ticket.resolved_at + 'Z').toLocaleDateString()} />}
            {ticket.closed_at   && <Row label="Closed"   value={new Date(ticket.closed_at + 'Z').toLocaleDateString()}   />}
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div style={{
              background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18,
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151' }}>Admin Controls</h3>

              {actionErr && (
                <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 10 }}>
                  {actionErr}
                </div>
              )}

              {/* Assign */}
              <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Assign To</label>
              <select
                value={ticket.assigned_to || ''}
                onChange={e => handleAssign(e.target.value ? parseInt(e.target.value) : null)}
                disabled={changing}
                style={{
                  display: 'block', width: '100%', marginTop: 4, marginBottom: 14,
                  border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: 13,
                }}
              >
                <option value="">— Unassigned —</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>

              {/* Priority */}
              <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Priority</label>
              <select
                value={ticket.priority}
                onChange={e => handlePriority(e.target.value)}
                disabled={changing}
                style={{
                  display: 'block', width: '100%', marginTop: 4, marginBottom: 14,
                  border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px', fontSize: 13,
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              {/* Status note */}
              <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>Note (for status change)</label>
              <textarea
                value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                rows={2}
                placeholder="Resolution notes, escalation reason…"
                style={{
                  display: 'block', width: '100%', marginTop: 4, marginBottom: 10,
                  border: '1px solid #d1d5db', borderRadius: 8, padding: '7px 10px',
                  fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit',
                }}
              />

              {/* Status buttons */}
              <label style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 6 }}>Change Status</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ADMIN_STATUSES.filter(s => s.value !== ticket.status).map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStatus(s.value)}
                    disabled={changing}
                    style={{
                      fontSize: 12, padding: '5px 10px', borderRadius: 8, cursor: 'pointer',
                      border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151',
                      opacity: changing ? 0.5 : 1,
                    }}
                  >
                    → {s.label}
                  </button>
                ))}
              </div>

              {/* Resolution notes display */}
              {ticket.resolution_notes && (
                <div style={{ marginTop: 14, padding: '10px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#065f46' }}>
                  <strong>Resolution:</strong> {ticket.resolution_notes}
                </div>
              )}
              {ticket.escalation_notes && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 13, color: '#9a3412' }}>
                  <strong>Escalation:</strong> {ticket.escalation_notes}
                </div>
              )}
            </div>
          )}

          {/* User reopen (if resolved but not admin) */}
          {!isAdmin && ticket.status === 'resolved' && (
            <button onClick={() => handleStatus('reopened')} style={{
              width: '100%', background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: 10, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 8,
            }}>
              Reopen Ticket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  );
}
