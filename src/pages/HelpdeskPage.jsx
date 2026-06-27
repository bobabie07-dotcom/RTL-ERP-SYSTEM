import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { supportApi } from '../api/client';
import Icons from '../icons';

const I = Icons;

const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };
const STATUS_TONE   = { open: 'info', in_progress: 'warning', waiting_on_user: 'neutral', resolved: 'success', closed: 'neutral' };
const STATUS_LABEL  = { open: 'Open', in_progress: 'In Progress', waiting_on_user: 'Waiting on User', resolved: 'Resolved', closed: 'Closed' };
const STATUS_OPTIONS = ['open', 'in_progress', 'waiting_on_user', 'resolved', 'closed'];
const CATEGORY_LABEL = { bug: 'Bug / Error', access_request: 'Access Request', feature_request: 'Feature Request', general: 'General Inquiry' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PriorityDot({ p }) {
  const colors = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[p] || '#6b7280', marginRight: 6 }} />;
}

function StatCard({ label, value, sub, tone }) {
  const colors = { info: 'var(--text-brand)', warning: '#f59e0b', danger: '#ef4444', success: 'var(--success)', neutral: 'var(--text-secondary)' };
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: colors[tone] || 'var(--text-brand)', fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function HelpdeskPage() {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [loadErr, setLoadErr]   = useState('');
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commLoading, setCommLoading] = useState(false);
  const [updateErr, setUpdateErr] = useState('');
  const [commentErr, setCommentErr] = useState('');

  // Filters
  const [statusFilter,   setStatusF]   = useState('');
  const [priorityFilter, setPriorityF] = useState('');
  const [search, setSearch]            = useState('');

  // Update form
  const [newStatus,   setNewStatus]   = useState('');
  const [resolution,  setResolution]  = useState('');
  const [updating,    setUpdating]    = useState(false);

  // Comment form
  const [commentText, setCommentText] = useState('');
  const [isInternal,  setIsInternal]  = useState(false);
  const [commenting,  setCommenting]  = useState(false);

  async function loadTickets() {
    setLoading(true);
    setLoadErr('');
    try {
      const data = await supportApi.listTickets({ status: statusFilter || undefined, priority: priorityFilter || undefined });
      setTickets(data || []);
    } catch (e) {
      setLoadErr(e.message || 'Failed to load tickets.');
    } finally { setLoading(false); }
  }

  useEffect(() => { loadTickets(); }, [statusFilter, priorityFilter]);

  async function openTicket(t) {
    setSelected(t);
    setNewStatus(t.status);
    setResolution(t.resolution_notes || '');
    setCommentText(''); setIsInternal(false);
    setCommLoading(true);
    try { setComments(await supportApi.getComments(t.id)); }
    catch { } finally { setCommLoading(false); }
  }

  async function handleUpdate() {
    setUpdating(true);
    setUpdateErr('');
    try {
      const updated = await supportApi.updateTicket(selected.id, {
        status: newStatus,
        resolution_notes: resolution || null,
      });
      setSelected(updated);
      setTickets(p => p.map(t => t.id === updated.id ? updated : t));
    } catch (e) {
      setUpdateErr(e.message || 'Failed to update ticket.');
    } finally { setUpdating(false); }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommenting(true);
    setCommentErr('');
    try {
      const c = await supportApi.addComment(selected.id, { comment: commentText, is_internal: isInternal });
      setComments(p => [...p, c]);
      setCommentText(''); setIsInternal(false);
    } catch (e) {
      setCommentErr(e.message || 'Failed to post comment.');
    } finally { setCommenting(false); }
  }

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase();
    return !q || t.subject.toLowerCase().includes(q) || t.ticket_no.toLowerCase().includes(q) || (t.submitter_name || '').toLowerCase().includes(q);
  });

  const stats = {
    open:     tickets.filter(t => t.status === 'open').length,
    progress: tickets.filter(t => t.status === 'in_progress').length,
    critical: tickets.filter(t => t.priority === 'critical' && t.status !== 'resolved' && t.status !== 'closed').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>IT Helpdesk</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage all support tickets, update statuses, and respond to users.</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatCard label="Open" value={stats.open} sub="Awaiting action" tone="info" />
        <StatCard label="In Progress" value={stats.progress} sub="Currently being worked" tone="warning" />
        <StatCard label="Critical" value={stats.critical} sub="Unresolved critical tickets" tone="danger" />
        <StatCard label="Resolved" value={stats.resolved} sub="Closed or resolved" tone="success" />
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Ticket list */}
        <div style={{ flex: '0 0 480px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '1 1 160px' }}>
                <I.search w={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tickets…"
                  style={{ width: '100%', height: 34, paddingLeft: 28, paddingRight: 10, border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none' }} />
              </div>
              <select value={statusFilter} onChange={e => { setStatusF(e.target.value); setSelected(null); }}
                style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}>
                <option value="">All Status</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <select value={priorityFilter} onChange={e => { setPriorityF(e.target.value); setSelected(null); }}
                style={{ height: 34, padding: '0 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}>
                <option value="">All Priority</option>
                {['critical', 'high', 'medium', 'low'].map(p => <option key={p} value={p} style={{ textTransform: 'capitalize' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>

            {loadErr && (
              <div style={{ margin: '0 0 12px', padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{loadErr}</div>
            )}
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No tickets found.</div>
            ) : filtered.map(t => (
              <div key={t.id}
                onClick={() => openTicket(t)}
                style={{
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer', marginBottom: 6,
                  border: `1px solid ${selected?.id === t.id ? 'var(--green-500)' : 'var(--border)'}`,
                  background: selected?.id === t.id ? 'var(--green-50)' : 'var(--white)',
                  transition: 'all 120ms',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{t.ticket_no}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {t.priority === 'critical' && <Badge tone="danger">CRITICAL</Badge>}
                    {t.priority === 'high' && <Badge tone="warning">HIGH</Badge>}
                    <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)', marginBottom: 4 }}>{t.subject}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 500 }}>{t.submitter_name}</span>
                  <span style={{ color: 'var(--text-muted)' }}> · {CATEGORY_LABEL[t.category]} · {fmt(t.created_at)}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Detail panel */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Ticket info */}
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.ticket_no}</div>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-strong)' }}>{selected.subject}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: '4px 8px' }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                <Badge tone={PRIORITY_TONE[selected.priority]} style={{ textTransform: 'capitalize' }}>{selected.priority} priority</Badge>
                <Badge tone="neutral">{CATEGORY_LABEL[selected.category]}</Badge>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14, fontSize: 12 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Submitted by</span><br /><b>{selected.submitter_name}</b></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Created</span><br /><b>{fmt(selected.created_at)}</b></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Last updated</span><br /><b>{fmt(selected.updated_at)}</b></div>
              </div>

              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 0 }}>
                {selected.description}
              </div>
            </Card>

            {/* Update status */}
            <Card title="Update Ticket">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Status</label>
                  <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Resolution Notes</label>
                <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows={3}
                  placeholder="Describe the resolution or action taken…"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {updateErr && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{updateErr}</div>
              )}
              <div style={{ marginTop: 12 }}>
                <Button variant="primary" size="sm" onClick={handleUpdate} disabled={updating}>
                  {updating ? 'Saving…' : 'Save Update'}
                </Button>
              </div>
            </Card>

            {/* Comments */}
            <Card title="Comments & Activity">
              {commLoading ? (
                <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              ) : comments.length === 0 ? (
                <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</div>
              ) : comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14, opacity: c.is_internal ? 0.8 : 1 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: c.is_internal ? '#fef3c7' : 'var(--green-100, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c.is_internal ? '#92400e' : 'var(--green-700, #15803d)', flexShrink: 0 }}>
                    {(c.author_name || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>{c.author_name}</span>
                      {c.is_internal && <Badge tone="warning" style={{ fontSize: 10 }}>Internal</Badge>}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(c.created_at)}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, background: c.is_internal ? '#fef9c3' : 'var(--gray-50)', padding: '8px 12px', borderRadius: 8, border: c.is_internal ? '1px dashed #fcd34d' : '1px solid var(--border-subtle)' }}>
                      {c.comment}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add comment */}
              <form onSubmit={handleComment} style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
                <textarea value={commentText} onChange={e => setCommentText(e.target.value)} rows={3}
                  placeholder="Write a comment or update for the user…"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }} />
                {commentErr && (
                  <div style={{ marginBottom: 8, padding: '8px 12px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{commentErr}</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                    Internal note (hidden from user)
                  </label>
                  <Button type="submit" variant="primary" size="sm" disabled={commenting || !commentText.trim()}>
                    {commenting ? 'Posting…' : 'Post Comment'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'var(--surface-card)', border: '1px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
            <div>
              <I.wrench w={36} style={{ opacity: 0.25, marginBottom: 12 }} />
              <div>Select a ticket to view details and take action.</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
