import React, { useEffect, useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { Checkbox } from '../components/forms/Checkbox';
import { Avatar } from '../components/core/Avatar';
import { Modal, FormRow, FieldInput, FieldSelect } from '../components/core/Modal';
import { authApi, farmsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';
import { useMarketPrice } from '../utils/useMarketPrice';
import Icons from '../icons';

const I = Icons;

const ROLE_LABEL = { 1: 'Administrator', 2: 'Farm Manager', 3: 'Farm Worker', 4: 'Veterinarian', 5: 'Owner' };
const ROLE_TONE  = { 1: 'danger', 2: 'info', 3: 'neutral', 4: 'success', 5: 'warning' };

const NOTIF_DEFAULTS = {
  mortalityAlert: true, feedAlert: true, harvestReminder: true,
  salesUpdate: false, weeklyReport: true, securityAlert: true,
};

const SAVED_NOTIF_KEY = 'erp_notifications';

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

export default function SettingsPage() {
  const { farmId, farms, reloadFarms } = useFarm();

  // Operational settings
  const [marketPrice, persistMarketPrice] = useMarketPrice();
  const [marketPriceInput, setMarketPriceInput] = useState(String(marketPrice));

  function saveOperationalSettings() {
    const p = parseFloat(marketPriceInput);
    if (isNaN(p) || p <= 0) { showToast('Market price must be a positive number.', false); return; }
    persistMarketPrice(p);
    showToast('Operational settings saved.');
  }

  // Farm profile — pulled from context, saved via API
  const [farmProfile,      setFarmProfile]      = useState({ name: '', name_ar: '', location: '' });
  const [farmProfileSaving, setFarmProfileSaving] = useState(false);

  useEffect(() => {
    const farm = farms.find(f => f.id === farmId);
    if (farm) setFarmProfile({ name: farm.name, name_ar: farm.name_ar || '', location: farm.location || '' });
  }, [farmId, farms]);

  async function saveFarmProfile() {
    setFarmProfileSaving(true);
    try {
      await farmsApi.update(farmId, { name: farmProfile.name, name_ar: farmProfile.name_ar || null, location: farmProfile.location || null });
      await reloadFarms();
      showToast('Farm profile saved.');
    } catch (e) { showToast(e.message || 'Failed to save.', false); }
    finally { setFarmProfileSaving(false); }
  }

  const [users,   setUsers]   = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Notifications — persisted in localStorage
  const [notifications, setNotifications] = useState(() => {
    try { return { ...NOTIF_DEFAULTS, ...JSON.parse(localStorage.getItem(SAVED_NOTIF_KEY) || '{}') }; }
    catch { return NOTIF_DEFAULTS; }
  });

  // Password change
  const [pwForm,    setPwForm]    = useState({ current: '', next: '', confirm: '' });
  const [pwSaving,  setPwSaving]  = useState(false);

  // Add user modal
  const [addUserModal, setAddUserModal] = useState(false);
  const [userForm,     setUserForm]     = useState({ full_name: '', email: '', password: '', role_id: '3' });
  const [userSaving,   setUserSaving]   = useState(false);
  const [userErr,      setUserErr]      = useState('');

  // Edit user modal
  const [editUser,     setEditUser]     = useState(null);
  const [editUserForm, setEditUserForm] = useState({ full_name: '', email: '', role_id: '3' });
  const [editUserSaving, setEditUserSaving] = useState(false);
  const [editUserErr,    setEditUserErr]    = useState('');

  // Delete user modal
  const [deleteUser,   setDeleteUser]   = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Toast
  const [toast, setToast] = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function loadUsers() {
    return authApi.users().then(setUsers).catch(() => {});
  }

  useEffect(() => {
    loadUsers().finally(() => setLoadingUsers(false));
  }, []);

  const toggle = (key) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  function savePrefs() {
    localStorage.setItem(SAVED_NOTIF_KEY, JSON.stringify(notifications));
    showToast('Notification preferences saved.');
  }

  async function handleChangePassword() {
    if (!pwForm.current || !pwForm.next) {
      showToast('Please fill in all password fields.', false); return;
    }
    if (pwForm.next !== pwForm.confirm) {
      showToast('New passwords do not match.', false); return;
    }
    if (pwForm.next.length < 6) {
      showToast('New password must be at least 6 characters.', false); return;
    }
    setPwSaving(true);
    try {
      await authApi.changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      showToast('Password updated successfully.');
    } catch (err) {
      showToast(err.message || 'Failed to update password.', false);
    } finally { setPwSaving(false); }
  }

  async function handleAddUser() {
    if (!userForm.full_name || !userForm.email || !userForm.password) {
      setUserErr('Name, email, and password are required.'); return;
    }
    setUserSaving(true); setUserErr('');
    try {
      await authApi.createUser({ ...userForm, role_id: Number(userForm.role_id), farm_id: farmId });
      await loadUsers();
      setAddUserModal(false);
      setUserForm({ full_name: '', email: '', password: '', role_id: '3' });
      showToast('User added successfully.');
    } catch (err) { setUserErr(err.message || 'Failed to add user.'); }
    finally { setUserSaving(false); }
  }

  function openEditUser(u) {
    setEditUser(u);
    setEditUserForm({ full_name: u.full_name, email: u.email, role_id: String(u.role_id) });
    setEditUserErr('');
  }

  async function handleEditUser() {
    if (!editUserForm.full_name || !editUserForm.email) {
      setEditUserErr('Name and email are required.'); return;
    }
    setEditUserSaving(true); setEditUserErr('');
    try {
      await authApi.updateUser(editUser.id, {
        full_name: editUserForm.full_name,
        email:     editUserForm.email,
        role_id:   Number(editUserForm.role_id),
      });
      await loadUsers();
      setEditUser(null);
      showToast('User updated.');
    } catch (err) { setEditUserErr(err.message || 'Failed to update user.'); }
    finally { setEditUserSaving(false); }
  }

  async function handleDeleteUser() {
    if (!deleteUser) return;
    setDeletingUser(true);
    try {
      await authApi.deleteUser(deleteUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
      showToast('User removed.');
    } catch (err) { showToast(err.message || 'Failed to remove user.', false); }
    finally { setDeletingUser(false); }
  }

  async function toggleUserActive(u) {
    try {
      await authApi.updateUser(u.id, { is_active: !u.is_active });
      await loadUsers();
      showToast(`User ${u.is_active ? 'deactivated' : 'activated'}.`);
    } catch (err) { showToast(err.message || 'Failed to update user.', false); }
  }

  const [cleared, setCleared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleClearData = () => {
    if (!confirmClear) { setConfirmClear(true); return; }
    localStorage.clear();
    setCleared(true);
    setConfirmClear(false);
    setTimeout(() => { window.location.reload(); }, 1200);
  };

  const uf = (key) => (e) => setUserForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast msg={toast.msg} ok={toast.ok} />}

      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Settings</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage farm profile, users, and system preferences.</p>
      </div>

      {/* Farm Profile */}
      <Card title="Farm Profile" subtitle={`Editing: ${farms.find(f => f.id === farmId)?.name || '—'}`}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input label="Farm Name" value={farmProfile.name}
            onChange={e => setFarmProfile(p => ({ ...p, name: e.target.value }))} />
          <Input label="Local / Filipino Name" value={farmProfile.name_ar}
            onChange={e => setFarmProfile(p => ({ ...p, name_ar: e.target.value }))} />
          <Input label="Location / Address" value={farmProfile.location}
            onChange={e => setFarmProfile(p => ({ ...p, location: e.target.value }))}
            style={{ gridColumn: '1 / -1' }} />
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md" onClick={saveFarmProfile} disabled={farmProfileSaving}>
            {farmProfileSaving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </Card>

      {/* User Management */}
      <Card
        title="User Management"
        subtitle="Manage team members and their access levels."
        action={<Button variant="primary" size="sm" icon={<I.plus w={14} />} onClick={() => { setUserErr(''); setAddUserModal(true); }}>Add User</Button>}
      >
        <DataTable
          columns={[
            { key: 'name', header: 'User', strong: true, render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.full_name} size={32} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>{r.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email}</div>
                </div>
              </div>
            ) },
            { key: 'role', header: 'Role', render: (r) => (
              <Badge tone={ROLE_TONE[r.role_id] || 'neutral'}>{ROLE_LABEL[r.role_id] || `Role ${r.role_id}`}</Badge>
            )},
            { key: 'status', header: 'Status', render: (r) => (
              <Badge tone={r.is_active ? 'success' : 'neutral'} dot>{r.is_active ? 'Active' : 'Inactive'}</Badge>
            )},
            { key: 'actions', header: '', render: (r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" icon={<I.pencil w={13} />} onClick={() => openEditUser(r)}>Edit</Button>
                <Button variant="ghost" size="sm" onClick={() => toggleUserActive(r)}>
                  {r.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button variant="ghost" size="sm" icon={<I.trash w={13} />} onClick={() => setDeleteUser(r)}>Remove</Button>
              </div>
            ) },
          ]}
          rows={loadingUsers ? [] : users}
          rowKey="id"
        />
        {loadingUsers && <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: 13 }}>Loading users…</div>}
      </Card>

      {/* Notifications */}
      <Card title="Notification Preferences" subtitle="Choose which alerts and updates you want to receive.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Checkbox label="Mortality rate alerts" checked={notifications.mortalityAlert} onChange={() => toggle('mortalityAlert')} />
          <Checkbox label="Low feed stock alerts" checked={notifications.feedAlert} onChange={() => toggle('feedAlert')} />
          <Checkbox label="Harvest reminders" checked={notifications.harvestReminder} onChange={() => toggle('harvestReminder')} />
          <Checkbox label="Sales & delivery updates" checked={notifications.salesUpdate} onChange={() => toggle('salesUpdate')} />
          <Checkbox label="Weekly performance report" checked={notifications.weeklyReport} onChange={() => toggle('weeklyReport')} />
          <Checkbox label="Security & login alerts" checked={notifications.securityAlert} onChange={() => toggle('securityAlert')} />
        </div>
        <p style={{ margin: '14px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
          Preferences are saved to your browser. In-app alert filtering coming soon.
        </p>
        <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md" onClick={savePrefs}>Save Preferences</Button>
        </div>
      </Card>

      {/* Security */}
      <Card title="Security" subtitle="Change your account password.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input label="Current Password" type="password" placeholder="Enter current password"
              value={pwForm.current} onChange={(e) => setPwForm((p) => ({ ...p, current: e.target.value }))} />
          </div>
          <Input label="New Password" type="password" placeholder="Min. 6 characters"
            value={pwForm.next} onChange={(e) => setPwForm((p) => ({ ...p, next: e.target.value }))} />
          <Input label="Confirm New Password" type="password" placeholder="Repeat new password"
            value={pwForm.confirm} onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))} />
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md" icon={<I.lock w={15} />} onClick={handleChangePassword} disabled={pwSaving}>
            {pwSaving ? 'Updating…' : 'Update Password'}
          </Button>
        </div>
      </Card>

      {/* Operational Settings */}
      <Card title="Operational Settings" subtitle="Values used in financial calculations across all modules.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>
              Market Price per kg (₱)
            </label>
            <input
              type="number"
              value={marketPriceInput}
              onChange={e => setMarketPriceInput(e.target.value)}
              min="1"
              step="0.01"
              placeholder="e.g. 120"
              style={{
                height: 40, padding: '0 12px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-body)',
                fontSize: 14, color: 'var(--text-strong)', background: 'var(--white)',
                width: '100%', boxSizing: 'border-box',
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Used to calculate financial loss in Mortality Tracker and Reports.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <Button variant="primary" size="md" onClick={saveOperationalSettings}>Save Settings</Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card title="Danger Zone" style={{ borderColor: 'var(--danger-bg)', borderWidth: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-strong)' }}>Clear All Data</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
              Permanently removes all records — batches, inventory, feed logs, mortality, sales. This cannot be undone.
            </div>
          </div>
          {cleared ? (
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <I.check w={15} /> Data cleared — reloading...
            </div>
          ) : confirmClear ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600 }}>Are you sure?</span>
              <Button variant="danger" size="sm" onClick={handleClearData}>Yes, clear everything</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
            </div>
          ) : (
            <Button variant="danger" size="md" icon={<I.trash w={15} />} onClick={handleClearData}>
              Clear All Data
            </Button>
          )}
        </div>
      </Card>

      {/* Add User Modal */}
      <Modal
        open={addUserModal}
        title="Add New User"
        onClose={() => setAddUserModal(false)}
        onConfirm={handleAddUser}
        confirmLabel="Add User"
        loading={userSaving}
      >
        {userErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{userErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Full Name" required>
            <FieldInput value={userForm.full_name} onChange={uf('full_name')} placeholder="e.g. Maria Santos" />
          </FormRow>
          <FormRow label="Email" required>
            <FieldInput type="email" value={userForm.email} onChange={uf('email')} placeholder="user@rtlpoultry.com" />
          </FormRow>
          <FormRow label="Password" required>
            <FieldInput type="password" value={userForm.password} onChange={uf('password')} placeholder="Min. 6 characters" />
          </FormRow>
          <FormRow label="Role">
            <FieldSelect value={userForm.role_id} onChange={uf('role_id')}>
              <option value="5">Owner</option>
              <option value="1">Administrator</option>
              <option value="2">Farm Manager</option>
              <option value="3">Farm Worker</option>
              <option value="4">Veterinarian</option>
            </FieldSelect>
          </FormRow>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        open={!!editUser}
        title="Edit User"
        onClose={() => setEditUser(null)}
        onConfirm={handleEditUser}
        confirmLabel="Save Changes"
        loading={editUserSaving}
      >
        {editUserErr && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'var(--danger-bg)', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>{editUserErr}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <FormRow label="Full Name" required>
            <FieldInput value={editUserForm.full_name} onChange={(e) => setEditUserForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Full name" />
          </FormRow>
          <FormRow label="Email" required>
            <FieldInput type="email" value={editUserForm.email} onChange={(e) => setEditUserForm(p => ({ ...p, email: e.target.value }))} placeholder="user@example.com" />
          </FormRow>
          <FormRow label="Role">
            <FieldSelect value={editUserForm.role_id} onChange={(e) => setEditUserForm(p => ({ ...p, role_id: e.target.value }))}>
              <option value="5">Owner</option>
              <option value="1">Administrator</option>
              <option value="2">Farm Manager</option>
              <option value="3">Farm Worker</option>
              <option value="4">Veterinarian</option>
            </FieldSelect>
          </FormRow>
        </div>
      </Modal>

      {/* Remove User Confirmation */}
      <Modal
        open={!!deleteUser}
        title="Remove User"
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDeleteUser}
        confirmLabel="Remove"
        confirmVariant="danger"
        loading={deletingUser}
        width={420}
      >
        <p style={{ margin: 0, fontSize: 14, color: 'var(--text-body)', lineHeight: 1.6 }}>
          Remove <b>{deleteUser?.full_name}</b> from the system?<br />
          Their data and activity history will be preserved.
        </p>
      </Modal>
    </div>
  );
}
