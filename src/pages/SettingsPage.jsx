import React, { useState } from 'react';
import { Card } from '../components/data/Card';
import { DataTable } from '../components/data/DataTable';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { Input } from '../components/forms/Input';
import { Select } from '../components/forms/Select';
import { Checkbox } from '../components/forms/Checkbox';
import { Avatar } from '../components/core/Avatar';
import Icons from '../icons';

const I = Icons;

const users = [
  { id: 1, name: 'Admin User', email: 'admin@rtlpoultry.com', role: 'Administrator', status: 'Active', lastLogin: 'May 12, 2025' },
  { id: 2, name: 'Juan Cruz', email: 'j.cruz@rtlpoultry.com', role: 'Farm Manager', status: 'Active', lastLogin: 'May 12, 2025' },
  { id: 3, name: 'Maria Reyes', email: 'm.reyes@rtlpoultry.com', role: 'Farm Worker', status: 'Active', lastLogin: 'May 11, 2025' },
  { id: 4, name: 'Antonio Santos', email: 'a.santos@rtlpoultry.com', role: 'Veterinarian', status: 'Active', lastLogin: 'May 10, 2025' },
  { id: 5, name: 'Liza Mendoza', email: 'l.mendoza@rtlpoultry.com', role: 'Accountant', status: 'Inactive', lastLogin: 'Apr 28, 2025' },
];

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    mortalityAlert: true,
    feedAlert: true,
    harvestReminder: true,
    salesUpdate: false,
    weeklyReport: true,
    securityAlert: true,
  });

  const toggle = (key) => setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Settings</h2>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Manage farm profile, users, and system preferences.</p>
      </div>

      {/* Farm Profile */}
      <Card title="Farm Profile" subtitle="Basic information about your farm operation.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Input label="Farm Name" defaultValue="RTL Main Farm" />
          <Input label="Farm Code" defaultValue="RTL-MAIN-001" />
          <Input label="Location / Address" defaultValue="Brgy. San Jose, Bulacan" style={{ gridColumn: '1 / -1' }} />
          <Input label="Contact Person" defaultValue="Juan Cruz" />
          <Input label="Contact Number" defaultValue="+63 917 123 4567" />
          <Select label="Farm Type" options={['Broiler', 'Layer', 'Breeder', 'Mixed']} />
          <Select label="Timezone" options={['Asia/Manila (UTC+8)', 'UTC']} />
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md">Save Changes</Button>
          <Button variant="secondary" size="md">Cancel</Button>
        </div>
      </Card>

      {/* User Management */}
      <Card
        title="User Management"
        subtitle="Manage team members and their access levels."
        action={<Button variant="primary" size="sm" icon={<I.plus w={14} />}>Add User</Button>}
      >
        <DataTable
          columns={[
            { key: 'name', header: 'User', strong: true, render: (r) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={r.name} size={32} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)' }}>{r.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.email}</div>
                </div>
              </div>
            ) },
            { key: 'role', header: 'Role', render: (r) => <Badge tone="neutral">{r.role}</Badge> },
            { key: 'status', header: 'Status', render: (r) => <Badge tone={r.status === 'Active' ? 'success' : 'neutral'} dot>{r.status}</Badge> },
            { key: 'lastLogin', header: 'Last Login' },
            { key: 'actions', header: '', render: (r) => (
              <div style={{ display: 'flex', gap: 6 }}>
                <Button variant="ghost" size="sm" icon={<I.pencil w={13} />}>Edit</Button>
                <Button variant="ghost" size="sm" icon={<I.trash w={13} />}>Remove</Button>
              </div>
            ) },
          ]}
          rows={users}
          rowKey="id"
        />
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
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md">Save Preferences</Button>
        </div>
      </Card>

      {/* Security */}
      <Card title="Security" subtitle="Manage your account password and two-factor authentication.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <Input label="Current Password" type="password" placeholder="Enter current password" style={{ gridColumn: '1 / -1' }} />
          <Input label="New Password" type="password" placeholder="Enter new password" />
          <Input label="Confirm New Password" type="password" placeholder="Confirm new password" />
        </div>
        <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
          <Button variant="primary" size="md" icon={<I.lock w={15} />}>Update Password</Button>
        </div>
      </Card>
    </div>
  );
}
