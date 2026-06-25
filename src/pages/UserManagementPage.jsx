import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Avatar } from '../components/core/Avatar';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { authApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { useAuth } from '../context/AuthContext';
import Icons from '../icons';

const I = Icons;

const ROLES = [
  { id: 1, label: 'Administrator',  tone: 'danger',  desc: 'Full system access — users, settings, all data' },
  { id: 2, label: 'Farm Manager',   tone: 'info',    desc: 'Manage batches, feed, mortality, reports' },
  { id: 3, label: 'Farm Worker',    tone: 'neutral', desc: 'Log daily records and feed issues' },
  { id: 4, label: 'Veterinarian',   tone: 'success', desc: 'View health events, vaccinations, treatments' },
  { id: 5, label: 'Owner',          tone: 'warning', desc: 'Read-only access to reports and analytics' },
];

const DEPT_OPTIONS = ['Management','Operations','Finance','IT','Veterinary','Logistics','HR'];

function Toast({ msg, ok }) {
  return msg ? (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 999,
      background: ok ? 'var(--success)' : 'var(--danger)',
      color: '#fff', padding: '10px 18px', borderRadius: 8,
      fontSize: 13, fontWeight: 600, boxShadow: 'var(--shadow-lg)',
    }}>{msg}</div>
  ) : null;
}

function StatBox({ label, value, tone = 'neutral' }) {
  const colors = { neutral: 'var(--text-brand)', success: 'var(--success)', danger: 'var(--danger)', warning: '#f59e0b' };
  return (
    <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors[tone], fontFamily: 'var(--font-display)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const EMPTY_FORM = { full_name: '', email: '', username: '', role_id: '3', department: '', phone: '' };

export default function UserManagementPage() {
  const { farmId } = useFarm();
  const { user: me } = useAuth();

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRole]   = useState('');
  const [toast, setToast]       = useState(null);

  // Add modal
  const [addOpen, setAddOpen]       = useState(false);
  const [addForm, setAddForm]       = useState(EMPTY_FORM);
  const [addErr, setAddErr]         = useState('');
  const [addSaving, setAddSaving]   = useState(false);
  const [addResult, setAddResult]   = useState(null); // { email, temp_password }

  // Edit modal
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editErr, setEditErr]   = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [delUser, setDelUser]   = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Reset password confirm
  const [resetUser, setResetUser]   = useState(null);
  const [resetResult, setResetResult] = useState('');
  const [resetting, setResetting]   = useState(false);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadUsers() {
    try {
      const data = await authApi.users();
      setUsers(data);
    } catch { }
    finally { setLoading(false); }
  }

  useEffect(() => { loadUsers(); }, []);

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.department || '').toLowerCase().includes(q);
    const matchRole = !roleFilter || String(u.role_id) === roleFilter;
    return matchSearch && matchRole;
  });

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role_id === 1).length,
    pending: users.filter(u => u.is_first_login).length,
  };

  // ── Add User ──
  async function handleAdd() {
    if (!addForm.full_name || !addForm.email) {
      setAddErr('Full name and email are required.'); return;
    }
    setAddSaving(true); setAddErr('');
    try {
      const res = await authApi.createUser({ ...addForm, role_id: Number(addForm.role_id), farm_id: farmId });
      await loadUsers();
      setAddForm(EMPTY_FORM);
      setAddResult({ full_name: res.full_name, email: res.email, username: res.username, temp_password: res.temp_password || 'Welcome@123' });
    } catch (e) { setAddErr(e.message || 'Failed to create user.'); }
    finally { setAddSaving(false); }
  }

  // ── Edit User ──
  function openEdit(u) {
    setEditUser(u);
    setEditForm({ full_name: u.full_name, email: u.email, username: u.username || '', role_id: String(u.role_id), department: u.department || '', phone: u.phone || '' });
    setEditErr('');
  }
  async function handleEdit() {
    if (!editForm.full_name || !editForm.email) { setEditErr('Name and email are required.'); return; }
    setEditSaving(true); setEditErr('');
    try {
      await authApi.updateUser(editUser.id, { ...editForm, role_id: Number(editForm.role_id) });
      await loadUsers(); setEditUser(null);
      showToast('User updated successfully.');
    } catch (e) { setEditErr(e.message || 'Failed to update user.'); }
    finally { setEditSaving(false); }
  }

  // ── Toggle Active ──
  async function toggleActive(u) {
    try {
      await authApi.updateUser(u.id, { is_active: !u.is_active });
      await loadUsers();
      showToast(`${u.full_name} ${u.is_active ? 'deactivated' : 'activated'}.`);
    } catch (e) { showToast(e.message || 'Failed.', false); }
  }

  // ── Delete ──
  async function handleDelete() {
    setDeleting(true);
    try {
      await authApi.deleteUser(delUser.id);
      setUsers(p => p.filter(u => u.id !== delUser.id)); setDelUser(null);
      showToast('User removed.');
    } catch (e) { showToast(e.message || 'Failed.', false); }
    finally { setDeleting(false); }
  }

  // ── Reset Password ──
  async function handleReset() {
    setResetting(true);
    try {
      const res = await authApi.resetPassword(resetUser.id);
      setResetResult(res.temp_password || 'Welcome@123');
      await loadUsers();
    } catch (e) { showToast(e.message || 'Failed.', false); setResetUser(null); }
    finally { setResetting(false); }
  }

  const af = k => e => setAddForm(p => ({ ...p, [k]: e.target.value }));
  const ef = k => e => setEditForm(p => ({ ...p, [k]: e.target.value }));

  const roleOf = id => ROLES.find(r => r.id === id);

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>User Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Create accounts, assign roles, and manage team access.</p>
        </div>
        <Button variant="primary" icon={<I.plus w={14} />} onClick={() => { setAddErr(''); setAddForm(EMPTY_FORM); setAddOpen(true); }}>
          Add New User
        </Button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <StatBox label="Total Users" value={stats.total} />
        <StatBox label="Active" value={stats.active} tone="success" />
        <StatBox label="Administrators" value={stats.admins} tone="danger" />
        <StatBox label="Pending First Login" value={stats.pending} tone="warning" />
      </div>

      {/* RBAC Reference */}
      <Card title="Role-Based Access Control" subtitle="What each role can access in this system">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {ROLES.map(r => (
            <div key={r.id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Badge tone={r.tone} style={{ flexShrink: 0, marginTop: 2 }}>{r.label}</Badge>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* User Table */}
      <Card
        title="All Users"
        subtitle={`${filtered.length} of ${users.length} users`}
      >
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <I.search w={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, email, department…"
              style={{ width: '100%', height: 36, paddingLeft: 32, paddingRight: 12, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', boxSizing: 'border-box', outline: 'none', color: 'var(--text-strong)', background: 'var(--white)' }}
            />
          </div>
          <select value={roleFilter} onChange={e => setRole(e.target.value)}
            style={{ height: 36, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-body)', background: 'var(--white)', cursor: 'pointer' }}>
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading users…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No users found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['User', 'Role', 'Department', 'Phone', 'Status', 'First Login', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const role = roleOf(u.role_id);
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={u.full_name} size={32} />
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-strong)' }}>{u.full_name}{isMe && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-brand)', fontWeight: 500 }}>(you)</span>}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</div>
                            {u.username && <div style={{ fontSize: 11, color: 'var(--text-brand)', fontWeight: 500 }}>@{u.username}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge tone={role?.tone || 'neutral'}>{role?.label || `Role ${u.role_id}`}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-body)' }}>{u.department || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-body)' }}>{u.phone || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <Badge tone={u.is_active ? 'success' : 'neutral'} dot>{u.is_active ? 'Active' : 'Inactive'}</Badge>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        {u.is_first_login
                          ? <Badge tone="warning">Pending</Badge>
                          : <Badge tone="success">Done</Badge>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <Button variant="ghost" size="sm" icon={<I.pencil w={12} />} onClick={() => openEdit(u)}>Edit</Button>
                          {!isMe && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => toggleActive(u)}>
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button variant="ghost" size="sm" icon={<I.lock w={12} />} onClick={() => { setResetUser(u); setResetResult(''); }}>
                                Reset Pwd
                              </Button>
                              <Button variant="ghost" size="sm" icon={<I.trash w={12} />} onClick={() => setDelUser(u)}>Remove</Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Add User Modal ── */}
      <Modal
        open={addOpen}
        title={addResult ? 'Account Created' : 'Add New User'}
        onClose={() => { setAddOpen(false); setAddResult(null); }}
        onConfirm={addResult ? () => { setAddOpen(false); setAddResult(null); } : handleAdd}
        confirmLabel={addResult ? 'Done' : 'Create Account'}
        loading={addSaving}
        cancelLabel={addResult ? null : 'Cancel'}
      >
        {addResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '14px 16px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 10 }}>
              <div style={{ fontWeight: 700, color: '#15803d', fontSize: 14, marginBottom: 4 }}>Account created successfully</div>
              <div style={{ fontSize: 13, color: '#166534' }}>Share these credentials with <strong>{addResult.full_name}</strong>:</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '10px 16px', fontSize: 13, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Email</span>
              <code style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>{addResult.email}</code>
              {addResult.username && <>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Username</span>
                <code style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13 }}>@{addResult.username}</code>
              </>}
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Password</span>
              <code style={{ background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 6, fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>{addResult.temp_password}</code>
            </div>
            <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              The user will be required to set a new password on their first login.
            </div>
          </div>
        ) : (
          <>
            {addErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{addErr}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              <FormRow label="Full Name" required>
                <FieldInput value={addForm.full_name} onChange={af('full_name')} placeholder="e.g. Maria Santos" />
              </FormRow>
              <FormRow label="Email" required>
                <FieldInput type="email" value={addForm.email} onChange={af('email')} placeholder="user@farm.com" />
              </FormRow>
              <FormRow label="Username">
                <FieldInput value={addForm.username} onChange={af('username')} placeholder="e.g. jdoe (optional)" />
              </FormRow>
              <FormRow label="Role">
                <FieldSelect value={addForm.role_id} onChange={af('role_id')}>
                  {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                </FieldSelect>
              </FormRow>
              <FormRow label="Department">
                <FieldSelect value={addForm.department} onChange={af('department')}>
                  <option value="">— Select —</option>
                  {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </FieldSelect>
              </FormRow>
              <FormRow label="Phone / Contact">
                <FieldInput value={addForm.phone} onChange={af('phone')} placeholder="+63 912 345 6789" />
              </FormRow>
            </div>
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
              A temporary password <strong>Welcome@123</strong> will be assigned. The user must change it on first login.
            </div>
          </>
        )}
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal open={!!editUser} title="Edit User" onClose={() => setEditUser(null)} onConfirm={handleEdit} confirmLabel="Save Changes" loading={editSaving}>
        {editErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{editErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Full Name" required>
            <FieldInput value={editForm.full_name} onChange={ef('full_name')} />
          </FormRow>
          <FormRow label="Email" required>
            <FieldInput type="email" value={editForm.email} onChange={ef('email')} />
          </FormRow>
          <FormRow label="Username">
            <FieldInput value={editForm.username || ''} onChange={ef('username')} placeholder="e.g. jdoe" />
          </FormRow>
          <FormRow label="Role">
            <FieldSelect value={editForm.role_id} onChange={ef('role_id')}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Department">
            <FieldSelect value={editForm.department} onChange={ef('department')}>
              <option value="">— None —</option>
              {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </FieldSelect>
          </FormRow>
          <FormRow label="Phone / Contact">
            <FieldInput value={editForm.phone} onChange={ef('phone')} placeholder="+63 912 345 6789" />
          </FormRow>
        </div>
      </Modal>

      {/* ── Delete Confirm ── */}
      <Modal open={!!delUser} title="Remove User" onClose={() => setDelUser(null)} onConfirm={handleDelete} confirmLabel="Remove" confirmVariant="danger" loading={deleting} width={420}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Remove <b>{delUser?.full_name}</b> from the system?<br />Their activity history will be preserved.
        </p>
      </Modal>

      {/* ── Reset Password ── */}
      <Modal
        open={!!resetUser}
        title="Reset Password"
        onClose={() => { setResetUser(null); setResetResult(''); }}
        onConfirm={resetResult ? null : handleReset}
        confirmLabel="Reset Password"
        confirmVariant="danger"
        loading={resetting}
        width={440}
      >
        {resetResult ? (
          <div>
            <div style={{ padding: '14px 16px', background: 'var(--green-50)', border: '1px solid var(--green-200, #bbf7d0)', borderRadius: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Password reset successfully</div>
              <div style={{ fontSize: 13, color: 'var(--text-body)' }}>
                Temporary password: <code style={{ fontWeight: 700, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>{resetResult}</code>
              </div>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Share this with <b>{resetUser?.full_name}</b>. They will be required to set a new password on their next login.
            </p>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
            Reset the password for <b>{resetUser?.full_name}</b>?<br />
            Their password will be set to <code>Welcome@123</code> and they will be forced to change it on next login.
          </p>
        )}
      </Modal>
    </div>
  );
}
