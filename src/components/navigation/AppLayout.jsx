import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { IconButton } from '../core/IconButton';
import { Avatar } from '../core/Avatar';
import { Select } from '../forms/Select';
import Icons from '../../icons';

const navItems = [
  { key: 'dashboard', label: 'Dashboard', path: '/dashboard' },
  { key: 'farms', label: 'Farm Management', path: '/farms' },
  { key: 'houses', label: 'Poultry Houses', path: '/houses' },
  { key: 'batches', label: 'Batch Management', path: '/batches' },
  { key: 'inventory', label: 'Inventory', path: '/inventory' },
  { key: 'feed', label: 'Feed Management', path: '/feed' },
  { key: 'mortality', label: 'Mortality Tracker', path: '/mortality' },
  { key: 'sales', label: 'Sales & Procurement', path: '/sales' },
  { key: 'reports', label: 'Reports & Analytics', path: '/reports' },
  { key: 'settings', label: 'Settings', path: '/settings' },
];

const iconMap = {
  dashboard: Icons.dashboard,
  farms: Icons.farm,
  houses: Icons.house,
  batches: Icons.batch,
  inventory: Icons.inventory,
  feed: Icons.feed,
  mortality: Icons.mortality,
  sales: Icons.sales,
  reports: Icons.reports,
  settings: Icons.settings,
};

export function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive active key from pathname
  const activeItem = navItems.find((item) => {
    if (item.key === 'batches') {
      return location.pathname === '/batches' || location.pathname.startsWith('/batches/');
    }
    return location.pathname === item.path;
  });
  const activeKey = activeItem ? activeItem.key : 'dashboard';
  const pageTitle = activeItem ? activeItem.label : 'Dashboard';

  const handleNavSelect = (key) => {
    const item = navItems.find((n) => n.key === key);
    if (item) navigate(item.path);
  };

  const nav = navItems.map((item) => ({
    key: item.key,
    label: item.label,
    icon: React.createElement(iconMap[item.key] || Icons.dashboard, { w: 19 }),
  }));

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: 600, fontFamily: 'var(--font-body)', background: 'var(--surface-page)' }}>
      <SidebarNav
        brand={<img src="/logo-lockup-dark.png" alt="RTL Poultry Farming ERP" style={{ height: 40 }} />}
        items={nav}
        active={activeKey}
        onSelect={handleNavSelect}
        footer={<Select options={['RTL Main Farm', 'RTL North Farm', 'All Farms']} />}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar
          title={pageTitle}
          right={
            <React.Fragment>
              <IconButton title="Messages" badge={2}><Icons.mail w={18} /></IconButton>
              <IconButton title="Notifications" badge={4}><Icons.bell w={18} /></IconButton>
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <Avatar name="Admin User" role="Farm Manager" showText />
            </React.Fragment>
          }
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}
