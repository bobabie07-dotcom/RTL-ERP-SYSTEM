import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { supportApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const I = Icons;

const PRIORITY_TONE = { low: 'neutral', medium: 'info', high: 'warning', critical: 'danger' };
const STATUS_TONE   = { open: 'info', in_progress: 'warning', waiting_on_user: 'neutral', resolved: 'success', closed: 'neutral' };
const STATUS_LABEL  = { open: 'Open', in_progress: 'In Progress', waiting_on_user: 'Waiting on You', resolved: 'Resolved', closed: 'Closed' };
const CATEGORY_LABEL = { bug: 'Bug / Error', access_request: 'Access Request', feature_request: 'Feature Request', general: 'General Inquiry' };

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PriorityDot({ p }) {
  const colors = { low: '#6b7280', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444' };
  return <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: colors[p] || '#6b7280', marginRight: 6 }} />;
}

export default function SupportPage() {
  const { user } = useAuth();
  const [tab, setTab]         = useState('tickets'); // 'tickets' | 'submit'
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [comments, setComments] = useState([]);
  const [commLoading, setCommLoading] = useState(false);

  // Submit form
  const [form, setForm] = useState({ subject: '', category: 'bug', priority: 'medium', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr]   = useState('');
  const [submitOk, setSubmitOk]     = useState(false);

  // Reply
  const [reply, setReply]     = useState('');
  const [replying, setReplying] = useState(false);

  async function loadTickets() {
    setLoading(true);
    try { setTickets(await supportApi.listTickets()); }
    catch { } finally { setLoading(false); }
  }

  useEffect(() => { loadTickets(); }, []);

  async function openTicket(t) {
    setSelected(t); setComments([]); setReply('');
    setCommLoading(true);
    try { setComments(await supportApi.getComments(t.id)); }
    catch { } finally { setCommLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) { setSubmitErr('Subject and description are required.'); return; }
    setSubmitting(true); setSubmitErr('');
    try {
      await supportApi.createTicket(form);
      setSubmitOk(true);
      setForm({ subject: '', category: 'bug', priority: 'medium', description: '' });
      await loadTickets();
      setTimeout(() => { setSubmitOk(false); setTab('tickets'); }, 2000);
    } catch (e) { setSubmitErr(e.message || 'Failed to submit ticket.'); }
    finally { setSubmitting(false); }
  }

  async function handleReply(e) {
    e.preventDefault();
    if (!reply.trim()) return;
    setReplying(true);
    try {
      const c = await supportApi.addComment(selected.id, { comment: reply });
      setComments(p => [...p, c]);
      setReply('');
    } catch { } finally { setReplying(false); }
  }

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const openCount   = tickets.filter(t => t.status === 'open').length;
  const activeCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>IT Support</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Submit issues or requests and track their status.</p>
      </div>

      {/* Quick stats */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Open Tickets', value: openCount, tone: 'info' },
          { label: 'In Progress', value: activeCount, tone: 'warning' },
          { label: 'Total Submitted', value: tickets.length, tone: 'neutral' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 20px', minWidth: 110 }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.tone === 'info' ? 'var(--text-brand)' : s.tone === 'warning' ? '#f59e0b' : 'var(--text-secondary)', fontFamily: 'var(--font-display)' }}>{s.value}</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
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
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* List */}
          <div style={{ flex: '0 0 420px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading tickets…</div>
            ) : tickets.length === 0 ? (
              <Card>
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <I.wrench w={32} style={{ opacity: 0.3, marginBottom: 10 }} />
                  <div style={{ fontSize: 14 }}>No tickets yet. Submit one using the tab above.</div>
                </div>
              </Card>
            ) : tickets.map(t => (
              <div key={t.id}
                onClick={() => openTicket(t)}
                style={{
                  background: 'var(--surface-card)', border: `1px solid ${selected?.id === t.id ? 'var(--green-500)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color 120ms',
                }}
                onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = 'var(--border-focus, #4ade80)'; }}
                onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{t.ticket_no}</span>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-strong)', marginBottom: 4 }}>{t.subject}</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <PriorityDot p={t.priority} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{t.priority}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>· {CATEGORY_LABEL[t.category]}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{fmt(t.created_at)}</div>
              </div>
            ))}
          </div>

          {/* Detail */}
          {selected && (
            <div style={{ flex: 1, background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{selected.ticket_no}</div>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-strong)' }}>{selected.subject}</h3>
                </div>
                <button onClick={() => setSelected(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                <Badge tone={PRIORITY_TONE[selected.priority]} style={{ textTransform: 'capitalize' }}>{selected.priority} priority</Badge>
                <Badge tone="neutral">{CATEGORY_LABEL[selected.category]}</Badge>
              </div>

              <div style={{ background: 'var(--gray-50)', borderRadius: 8, padding: 14, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {selected.description}
              </div>

              {selected.resolution_notes && (
                <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-200, #bbf7d0)', borderRadius: 8, padding: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>RESOLUTION NOTES</div>
                  <div style={{ fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>{selected.resolution_notes}</div>
                </div>
              )}

              {/* Comments */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>Activity</div>
                {commLoading ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading…</div>
                ) : comments.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No replies yet.</div>
                ) : comments.map(c => (
                  <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--green-100, #dcfce7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--green-700, #15803d)', flexShrink: 0 }}>
                      {(c.author_name || 'U')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>{c.author_name}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmt(c.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, background: 'var(--gray-50)', padding: '8px 12px', borderRadius: 8 }}>{c.comment}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reply box */}
              {selected.status !== 'closed' && selected.status !== 'resolved' && (
                <form onSubmit={handleReply} style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    value={reply} onChange={e => setReply(e.target.value)}
                    placeholder="Add a reply or more details…"
                    rows={2}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none' }}
                  />
                  <Button type="submit" variant="primary" size="sm" disabled={replying || !reply.trim()}>
                    {replying ? '…' : 'Send'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Submit form */}
      {tab === 'submit' && (
        <Card title="Submit a Support Ticket" subtitle="Describe your issue and we'll get back to you shortly.">
          {submitOk ? (
            <div style={{ padding: '24px 0', textAlign: 'center' }}>
              <I.check w={36} style={{ color: 'var(--success)', marginBottom: 10 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--success)' }}>Ticket submitted successfully!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>Redirecting to your tickets…</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {submitErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{submitErr}</div>}

              {/* Auto-tag info */}
              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 16 }}>
                <span><b>Submitted by:</b> {user?.full_name}</span>
                <span><b>Date:</b> {new Date().toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Subject <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input value={form.subject} onChange={f('subject')} placeholder="Brief description of your issue"
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Category</label>
                  <select value={form.category} onChange={f('category')}
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}>
                    <option value="bug">Bug / Error</option>
                    <option value="access_request">Access Request</option>
                    <option value="feature_request">Feature Request</option>
                    <option value="general">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Priority</label>
                  <select value={form.priority} onChange={f('priority')}
                    style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', background: 'var(--white)', cursor: 'pointer' }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>Description <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea value={form.description} onChange={f('description')} rows={6}
                  placeholder="Please describe the issue in detail. Include steps to reproduce, what you expected, and what actually happened."
                  style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-body)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
              </div>

              <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Ticket'}
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
