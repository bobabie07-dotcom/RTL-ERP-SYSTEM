import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROLE_MAP = {
  1: { label: 'Administrator', color: '#dc2626', bg: '#fee2e2' },
  2: { label: 'Farm Manager',  color: '#2563eb', bg: '#dbeafe' },
  3: { label: 'Farm Worker',   color: '#374151', bg: '#f3f4f6' },
  4: { label: 'Veterinarian',  color: '#16a34a', bg: '#dcfce7' },
  5: { label: 'Owner',         color: '#92400e', bg: '#fef3c7' },
};

const STATUS_MAP = {
  active:    { label: 'Active',    color: '#16a34a', bg: '#dcfce7' },
  inactive:  { label: 'Inactive',  color: '#6b7280', bg: '#f3f4f6' },
  suspended: { label: 'Suspended', color: '#d97706', bg: '#fef3c7' },
  locked:    { label: 'Locked',    color: '#dc2626', bg: '#fee2e2' },
  archived:  { label: 'Archived',  color: '#4b5563', bg: '#e5e7eb' },
};

const DEPARTMENTS = ['Management','Operations','Finance','IT','Veterinary','Logistics','HR','Sales','Procurement'];
const POSITIONS   = ['Manager','Supervisor','Staff','Coordinator','Analyst','Officer','Assistant','Encoder','Specialist'];

const EMPTY_FORM = {
  full_name: '', email: '', username: '', employee_id: '',
  role_id: '3', department: '', position: '', phone: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
}
function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: status, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function RoleBadge({ roleId, roleName }) {
  const r = ROLE_MAP[roleId] || { label: roleName || `Role ${roleId}`, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 600, background: r.bg, color: r.color, marginRight: 3 }}>
      {r.label}
    </span>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: width, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function FieldRow({ label, required, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INP = {
  width: '100%', height: 38, padding: '0 10px', border: '1px solid #d1d5db',
  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};
const SEL = { ...INP, background: '#fff', cursor: 'pointer' };

function StatCard({ label, value, color = '#374151', sub }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 110 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function Toast({ msg, ok }) {
  if (!msg) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      background: ok ? '#16a34a' : '#dc2626', color: '#fff',
      padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
    }}>
      {msg}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const { user: me } = useAuth();

  const [users,  setUsers]  = useState([]);
  const [roles,  setRoles]  = useState([]);
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState('');

  // Filters
  const [search,     setSearch]     = useState('');
  const [statusFilt, setStatusFilt] = useState('');
  const [roleFilt,   setRoleFilt]   = useState('');
  const [deptFilt,   setDeptFilt]   = useState('');

  // Modals
  const [addModal,     setAddModal]     = useState(false);
  const [editUser,     setEditUser]     = useState(null);
  const [rolesUser,    setRolesUser]    = useState(null);
  const [histUser,     setHistUser]     = useState(null);
  const [auditUser,    setAuditUser]    = useState(null);
  const [statusAction, setStatusAction] = useState(null); // { user, targetStatus }

  // History/audit data
  const [loginHist,  setLoginHist]  = useState([]);
  const [auditLogs,  setAuditLogs]  = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // Role assignment state
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  // Form state
  const [form, setForm]         = useState(EMPTY_FORM);
  const [formErr, setFormErr]   = useState('');
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState({ msg: '', ok: true });
  const [tempPwd, setTempPwd]   = useState('');
  const [statusNote, setStatusNote] = useState('');

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: '', ok: true }), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const [u, r, s] = await Promise.all([
        usersApi.list({ include_archived: false }),
        usersApi.listRoles(),
        usersApi.stats(),
      ]);
      setUsers(u || []);
      setRoles(r || []);
      setStats(s);
    } catch (e) {
      setLoadErr(e?.detail || e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = users.filter(u => {
    if (statusFilt && u.status !== statusFilt) return false;
    if (roleFilt   && String(u.role_id) !== roleFilt) return false;
    if (deptFilt   && u.department !== deptFilt) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name   || '').toLowerCase().includes(q) ||
             (u.email       || '').toLowerCase().includes(q) ||
             (u.employee_id || '').toLowerCase().includes(q) ||
             (u.department  || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Create / Edit user ─────────────────────────────────────────────────────
  async function handleSaveUser(e) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      setFormErr('Full name and email are required.');
      return;
    }
    setSaving(true);
    setFormErr('');
    try {
      if (editUser) {
        await usersApi.update(editUser.id, {
          full_name:   form.full_name,
          email:       form.email,
          username:    form.username || undefined,
          employee_id: form.employee_id || undefined,
          role_id:     parseInt(form.role_id),
          department:  form.department || undefined,
          position:    form.position   || undefined,
          phone:       form.phone      || undefined,
        });
        showToast(`${form.full_name} updated`);
        setEditUser(null);
      } else {
        const res = await usersApi.create({
          full_name:   form.full_name,
          email:       form.email,
          username:    form.username || undefined,
          employee_id: form.employee_id || undefined,
          role_id:     parseInt(form.role_id),
          department:  form.department || undefined,
          position:    form.position   || undefined,
          phone:       form.phone      || undefined,
        });
        setTempPwd(res.temp_password || 'Welcome@123');
        showToast(`${form.full_name} created`);
        setAddModal(false);
      }
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      setFormErr(e?.detail || e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  // ── Status change ──────────────────────────────────────────────────────────
  async function handleStatusChange() {
    if (!statusAction) return;
    setSaving(true);
    try {
      await usersApi.setStatus(statusAction.user.id, {
        status: statusAction.targetStatus,
        notes:  statusNote || undefined,
      });
      showToast(`Account ${statusAction.targetStatus}`);
      setStatusAction(null);
      setStatusNote('');
      load();
    } catch (e) {
      showToast(e?.detail || e?.message || 'Failed', false);
    } finally {
      setSaving(false);
    }
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async function handleResetPwd(u) {
    if (!window.confirm(`Reset password for ${u.full_name}? They will receive a temporary password.`)) return;
    try {
      const res = await usersApi.resetPassword(u.id);
      setTempPwd(res.temp_password || 'Welcome@123');
      showToast(`Password reset for ${u.full_name}`);
      load();
    } catch (e) {
      showToast(e?.detail || e?.message || 'Reset failed', false);
    }
  }

  // ── Assign roles ───────────────────────────────────────────────────────────
  async function handleAssignRoles() {
    if (!rolesUser) return;
    setSaving(true);
    try {
      // Extra roles = all selected except the primary
      const extras = selectedRoleIds.filter(id => id !== rolesUser.role_id);
      await usersApi.assignRoles(rolesUser.id, extras);
      showToast('Roles updated');
      setRolesUser(null);
      load();
    } catch (e) {
      showToast(e?.detail || e?.message || 'Failed', false);
    } finally {
      setSaving(false);
    }
  }

  // ── Open edit modal ────────────────────────────────────────────────────────
  function openEdit(u) {
    setForm({
      full_name:   u.full_name   || '',
      email:       u.email       || '',
      username:    u.username    || '',
      employee_id: u.employee_id || '',
      role_id:     String(u.role_id || 3),
      department:  u.department  || '',
      position:    u.position    || '',
      phone:       u.phone       || '',
    });
    setFormErr('');
    setEditUser(u);
  }

  // ── Open assign roles modal ────────────────────────────────────────────────
  function openAssignRoles(u) {
    const all = u.all_role_ids || [u.role_id];
    setSelectedRoleIds(all);
    setRolesUser(u);
  }

  // ── Open login history ─────────────────────────────────────────────────────
  async function openHistory(u) {
    setHistUser(u);
    setLoginHist([]);
    setHistLoading(true);
    try {
      const h = await usersApi.loginHistory(u.id, 20);
      setLoginHist(h || []);
    } catch { }
    finally { setHistLoading(false); }
  }

  // ── Open audit log ─────────────────────────────────────────────────────────
  async function openAudit(u) {
    setAuditUser(u);
    setAuditLogs([]);
    setHistLoading(true);
    try {
      const a = await usersApi.auditLogs(u.id, 50);
      setAuditLogs(a || []);
    } catch { }
    finally { setHistLoading(false); }
  }

  const roleOptions = [
    ...Object.entries(ROLE_MAP).map(([id, r]) => ({ id: parseInt(id), label: r.label })),
    ...roles.filter(r => !ROLE_MAP[r.id]).map(r => ({ id: r.id, label: r.name })),
  ];

  // ── User form JSX ──────────────────────────────────────────────────────────
  function UserForm({ onCancel }) {
    return (
      <form onSubmit={handleSaveUser}>
        {formErr && (
          <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 14 }}>
            {formErr}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <FieldRow label="Full Name" required>
              <input style={INP} value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="e.g. Juan Dela Cruz" />
            </FieldRow>
          </div>
          <FieldRow label="Email Address" required>
            <input style={INP} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
          </FieldRow>
          <FieldRow label="Username">
            <input style={INP} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="Optional" />
          </FieldRow>
          <FieldRow label="Employee ID">
            <input style={INP} value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} placeholder="EMP-0001" />
          </FieldRow>
          <FieldRow label="Phone">
            <input style={INP} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="+63 9XX XXX XXXX" />
          </FieldRow>
          <FieldRow label="Primary Role">
            <select style={SEL} value={form.role_id} onChange={e => setForm(p => ({ ...p, role_id: e.target.value }))}>
              {roleOptions.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Department">
            <select style={SEL} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
              <option value="">— Select —</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </FieldRow>
          <FieldRow label="Position">
            <select style={SEL} value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))}>
              <option value="">— Select —</option>
              {POSITIONS.map(p => <option key={p}>{p}</option>)}
            </select>
          </FieldRow>
        </div>
        {!editUser && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#1e40af', marginTop: 4, marginBottom: 14 }}>
            Default password: <strong>Welcome@123</strong> — user must change on first login.
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
          <button type="submit" disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}
          </button>
          <button type="button" onClick={onCancel} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', maxWidth: 1400, margin: '0 auto' }}>
      <Toast msg={toast.msg} ok={toast.ok} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#111827' }}>User Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Create accounts, manage roles, monitor access and activity.</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setFormErr(''); setAddModal(true); }}
          style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          + Add User
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <StatCard label="Total Users"     value={stats.total}     color="#111827" />
          <StatCard label="Active"          value={stats.active}    color="#16a34a" sub="Can log in" />
          <StatCard label="Inactive"        value={stats.inactive}  color="#6b7280" sub="Deactivated" />
          <StatCard label="Suspended"       value={stats.suspended} color="#d97706" sub="Temporarily blocked" />
          <StatCard label="Locked"          value={stats.locked}    color="#dc2626" sub="Too many failures" />
          <StatCard label="Pending"         value={stats.pending}   color="#7c3aed" sub="Awaiting first login" />
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, employee ID…"
          style={{ ...INP, width: 260, height: 36 }}
        />
        <select value={statusFilt} onChange={e => setStatusFilt(e.target.value)} style={{ ...SEL, width: 150, height: 36 }}>
          <option value="">All Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={roleFilt} onChange={e => setRoleFilt(e.target.value)} style={{ ...SEL, width: 160, height: 36 }}>
          <option value="">All Roles</option>
          {roleOptions.map(r => <option key={r.id} value={String(r.id)}>{r.label}</option>)}
        </select>
        <select value={deptFilt} onChange={e => setDeptFilt(e.target.value)} style={{ ...SEL, width: 150, height: 36 }}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <button onClick={load} style={{ height: 36, padding: '0 14px', border: '1px solid #d1d5db', borderRadius: 8, background: '#f9fafb', cursor: 'pointer', fontSize: 13 }}>
          Refresh
        </button>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 'auto' }}>{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Error */}
      {loadErr && (
        <div style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13 }}>
          {loadErr}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>Loading users…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ background: '#f9fafb' }}>
                <tr>
                  {['Employee ID', 'Name / Email', 'Department', 'Role(s)', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No users found.</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>
                      {u.employee_id || <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#111827' }}>{u.full_name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{u.email}</div>
                      {u.username && <div style={{ fontSize: 11, color: '#9ca3af' }}>@{u.username}</div>}
                      {u.is_first_login && (
                        <span style={{ fontSize: 10, background: '#ede9fe', color: '#7c3aed', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          Pending first login
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>
                      <div>{u.department || '—'}</div>
                      {u.position && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.position}</div>}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        <RoleBadge roleId={u.role_id} roleName={u.role_name} />
                        {(u.all_role_ids || []).filter(id => id !== u.role_id).map(id => (
                          <RoleBadge key={id} roleId={id} roleName={(u.all_role_names || [])[u.all_role_ids?.indexOf(id)]} />
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={u.status} />
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {fmtDate(u.last_login_at)}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <ActionMenu u={u} me={me}
                        onEdit={() => openEdit(u)}
                        onRoles={() => openAssignRoles(u)}
                        onReset={() => handleResetPwd(u)}
                        onHistory={() => openHistory(u)}
                        onAudit={() => openAudit(u)}
                        onStatus={(s) => { setStatusAction({ user: u, targetStatus: s }); setStatusNote(''); }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Add User Modal ──────────────────────────────────────────────────── */}
      {addModal && (
        <Modal title="Add New User" onClose={() => setAddModal(false)} width={600}>
          <UserForm onCancel={() => setAddModal(false)} />
        </Modal>
      )}

      {/* ── Edit User Modal ─────────────────────────────────────────────────── */}
      {editUser && (
        <Modal title={`Edit User — ${editUser.full_name}`} onClose={() => setEditUser(null)} width={600}>
          <UserForm onCancel={() => setEditUser(null)} />
        </Modal>
      )}

      {/* ── Temp Password Banner ─────────────────────────────────────────────── */}
      {tempPwd && (
        <Modal title="Temporary Password" onClose={() => setTempPwd('')} width={440}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 20, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: '#1e40af', marginBottom: 8 }}>Share this temporary password with the user:</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'monospace', color: '#1e3a8a', letterSpacing: 2 }}>{tempPwd}</div>
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>
            The user will be required to change this password on first login.
          </div>
          <button onClick={() => setTempPwd('')} style={{ width: '100%', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Done
          </button>
        </Modal>
      )}

      {/* ── Assign Roles Modal ───────────────────────────────────────────────── */}
      {rolesUser && (
        <Modal title={`Assign Roles — ${rolesUser.full_name}`} onClose={() => setRolesUser(null)} width={480}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
            Primary role: <strong>{ROLE_MAP[rolesUser.role_id]?.label || rolesUser.role_name}</strong>
            <br />Select additional roles to assign to this account:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {roleOptions.map(r => {
              const isPrimary = r.id === rolesUser.role_id;
              const isChecked = selectedRoleIds.includes(r.id);
              return (
                <label key={r.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  border: `1px solid ${isChecked ? '#bfdbfe' : '#e5e7eb'}`,
                  borderRadius: 8, background: isChecked ? '#eff6ff' : '#fff',
                  cursor: isPrimary ? 'default' : 'pointer', opacity: 1,
                }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={isPrimary}
                    onChange={e => {
                      if (e.target.checked) setSelectedRoleIds(p => [...p, r.id]);
                      else setSelectedRoleIds(p => p.filter(id => id !== r.id));
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {r.label}
                      {isPrimary && <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>(Primary Role)</span>}
                    </div>
                    {ROLE_MAP[r.id]?.desc && <div style={{ fontSize: 11, color: '#9ca3af' }}>{ROLE_MAP[r.id].desc}</div>}
                  </div>
                </label>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleAssignRoles} disabled={saving} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save Roles'}
            </button>
            <button onClick={() => setSelectedRoleIds([rolesUser.role_id])} style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}>
              Clear All Extra
            </button>
            <button onClick={() => setRolesUser(null)} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Status Change Confirmation ────────────────────────────────────────── */}
      {statusAction && (
        <Modal title={`Confirm: ${statusAction.targetStatus.charAt(0).toUpperCase() + statusAction.targetStatus.slice(1)} Account`} onClose={() => setStatusAction(null)} width={440}>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 14 }}>
            Change <strong>{statusAction.user.full_name}</strong>'s account status to{' '}
            <StatusBadge status={statusAction.targetStatus} />?
          </p>
          <FieldRow label="Reason / Notes (optional)">
            <input style={INP} value={statusNote} onChange={e => setStatusNote(e.target.value)} placeholder="e.g. Employee on leave, account breach, etc." />
          </FieldRow>
          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={handleStatusChange} disabled={saving} style={{
              background: statusAction.targetStatus === 'active' ? '#16a34a' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.6 : 1,
            }}>
              {saving ? 'Updating…' : 'Confirm'}
            </button>
            <button onClick={() => setStatusAction(null)} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* ── Login History Modal ───────────────────────────────────────────────── */}
      {histUser && (
        <Modal title={`Login History — ${histUser.full_name}`} onClose={() => setHistUser(null)} width={600}>
          {histLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div>
          ) : loginHist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No login records found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {['Date & Time', 'Result', 'IP Address', 'User Agent'].map(h => (
                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, color: '#6b7280', fontWeight: 700 }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loginHist.map(h => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 10px', color: '#374151', whiteSpace: 'nowrap' }}>{fmt(h.created_at)}</td>
                    <td style={{ padding: '8px 10px' }}>
                      {h.success
                        ? <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ Success</span>
                        : <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ Failed</span>
                      }
                      {h.failure_reason && <div style={{ fontSize: 11, color: '#9ca3af' }}>{h.failure_reason}</div>}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#6b7280', fontSize: 12 }}>{h.ip_address || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {h.user_agent || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {/* ── Audit Log Modal ───────────────────────────────────────────────────── */}
      {auditUser && (
        <Modal title={`Audit Log — ${auditUser.full_name}`} onClose={() => setAuditUser(null)} width={650}>
          {histLoading ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading…</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No audit records.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {auditLogs.map(a => (
                <div key={a.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 12, color: '#111827', textTransform: 'capitalize' }}>
                      {a.action_type.replace(/_/g, ' ')}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmt(a.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    By: <strong>{a.actor_name || `User #${a.performed_by}`}</strong>
                    {a.ip_address && <span> · IP: {a.ip_address}</span>}
                  </div>
                  {a.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{a.notes}</div>}
                  {a.old_value && a.new_value && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {a.old_value.length < 80 && a.new_value.length < 80
                        ? <>{a.old_value} → {a.new_value}</>
                        : 'Values updated'
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── Action Menu ───────────────────────────────────────────────────────────────

function ActionMenu({ u, me, onEdit, onRoles, onReset, onHistory, onAudit, onStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isSelf = u.id === me?.id;
  const isActive    = u.status === 'active';
  const isLocked    = u.status === 'locked';
  const isSuspended = u.status === 'suspended';
  const isInactive  = u.status === 'inactive';
  const isArchived  = u.status === 'archived';

  const Item = ({ label, color = '#374151', onClick, disabled }) => (
    <button
      onClick={() => { if (!disabled) { onClick(); setOpen(false); } }}
      disabled={disabled}
      style={{
        display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px',
        background: 'none', border: 'none', fontSize: 13, color: disabled ? '#d1d5db' : color,
        cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
      }}
      onMouseEnter={e => { if (!disabled) e.target.style.background = '#f3f4f6'; }}
      onMouseLeave={e => { e.target.style.background = 'none'; }}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 7, padding: '5px 12px', fontSize: 13, cursor: 'pointer', color: '#374151' }}
      >
        Actions ▾
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4,
          background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)', zIndex: 50, minWidth: 180,
          overflow: 'hidden',
        }}>
          <Item label="Edit Details"     onClick={onEdit} />
          <Item label="Assign Roles"     onClick={onRoles} />
          <Item label="Reset Password"   onClick={onReset} disabled={isSelf} color="#d97706" />
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
          {!isActive   && <Item label="Activate"       onClick={() => onStatus('active')}   color="#16a34a" />}
          {isActive    && !isSelf && <Item label="Deactivate"   onClick={() => onStatus('inactive')} color="#6b7280" />}
          {!isSuspended && !isSelf && <Item label="Suspend"      onClick={() => onStatus('suspended')} color="#d97706" />}
          {isSuspended  && <Item label="Unsuspend"     onClick={() => onStatus('active')} color="#16a34a" />}
          {isLocked     && <Item label="Unlock Account" onClick={() => onStatus('active')} color="#16a34a" />}
          <div style={{ borderTop: '1px solid #f3f4f6', margin: '4px 0' }} />
          <Item label="Login History"   onClick={onHistory} />
          <Item label="Audit Log"       onClick={onAudit} />
          {!isArchived && !isSelf && (
            <Item label="Archive User" onClick={() => onStatus('archived')} color="#dc2626" />
          )}
        </div>
      )}
    </div>
  );
}
