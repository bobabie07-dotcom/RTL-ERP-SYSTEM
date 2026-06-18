import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { IconButton } from '../core/IconButton';
import { Avatar } from '../core/Avatar';
import { Select } from '../forms/Select';
import { Badge } from '../core/Badge';
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
  dashboard: Icons.dashboard, farms: Icons.farm, houses: Icons.house,
  batches: Icons.batch, inventory: Icons.inventory, feed: Icons.feed,
  mortality: Icons.mortality, sales: Icons.sales, reports: Icons.reports,
  settings: Icons.settings,
};

const NOTIFICATIONS = [];

function NotificationsDropdown({ onClose }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 320,
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      zIndex: 200, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>Notifications</span>
        <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
      </div>
      {NOTIFICATIONS.map((n) => (
        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 120ms' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 2 }}><Badge tone={n.tone} variant="solid" style={{ padding: '2px 7px', fontSize: 10 }}>{n.tone === 'warning' ? '!' : n.tone === 'danger' ? '!!' : n.tone === 'info' ? 'i' : '✓'}</Badge></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{n.title}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.body}</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</span>
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 16px', textAlign: 'center' }}>
        <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-brand)' }}>View all notifications</a>
      </div>
    </div>
  );
}

export function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Close notifications on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const activeItem = navItems.find((item) => {
    if (item.key === 'batches') return location.pathname === '/batches' || location.pathname.startsWith('/batches/');
    return location.pathname === item.path;
  });
  const activeKey = activeItem ? activeItem.key : 'dashboard';
  const pageTitle = activeItem ? activeItem.label : 'Dashboard';

  const handleNavSelect = (key) => {
    const item = navItems.find((n) => n.key === key);
    if (item) navigate(item.path);
  };

  const nav = navItems.map((item) => ({
    key: item.key, label: item.label,
    icon: React.createElement(iconMap[item.key] || Icons.dashboard, { w: 19 }),
  }));

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font-body)', background: 'var(--surface-page)', overflow: 'hidden' }}>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 99, display: 'none',
        }} className="sidebar-overlay" />
      )}

      {/* Sidebar */}
      <div style={{
        position: 'relative',
        zIndex: 100,
        transition: 'transform 200ms var(--ease-std)',
      }} className={sidebarOpen ? 'sidebar-open' : ''}>
        <SidebarNav
          brand={<img src="/logo-lockup-dark.png" alt="RTL Poultry Farming ERP" style={{ height: 40 }} />}
          items={nav}
          active={activeKey}
          onSelect={handleNavSelect}
          footer={<Select options={['RTL Main Farm', 'RTL North Farm', 'All Farms']} />}
        />
      </div>

      {/* Main area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar
          title={pageTitle}
          onMenu={() => setSidebarOpen((s) => !s)}
          right={
            <React.Fragment>
              <IconButton title="Messages" badge={2}><Icons.mail w={18} /></IconButton>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <IconButton title="Notifications" badge={NOTIFICATIONS.length} onClick={() => setNotifOpen((s) => !s)}>
                  <Icons.bell w={18} />
                </IconButton>
                {notifOpen && <NotificationsDropdown onClose={() => setNotifOpen(false)} />}
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <Avatar name="Admin User" role="Farm Manager" showText />
            </React.Fragment>
          }
        />
        <div style={{ flex: 1, overflowY: 'auto' }} className="page-content">{children}</div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
        }
        @media (max-width: 768px) {
          nav[style] { position: fixed !important; top: 0; left: 0; height: 100vh; transform: translateX(-100%); transition: transform 200ms cubic-bezier(0.4,0,0.2,1); }
          .sidebar-open nav[style] { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
