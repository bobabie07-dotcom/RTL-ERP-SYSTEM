import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { Topbar } from './Topbar';
import { IconButton } from '../core/IconButton';
import { Avatar } from '../core/Avatar';
import { Badge } from '../core/Badge';
import { useAuth } from '../../context/AuthContext';
import { useFarm } from '../../context/FarmContext';
import { alertsApi } from '../../api/client';
import Icons from '../../icons';

const navItems = [
  { key: 'dashboard',     label: 'Dashboard',           path: '/dashboard' },
  { key: 'farms',         label: 'Farm Management',      path: '/farms' },
  { key: 'houses',        label: 'Poultry Houses',       path: '/houses' },
  { key: 'maintenance',   label: 'Maintenance',          path: '/maintenance' },
  { key: 'batches',       label: 'Batch Management',     path: '/batches' },
  { key: 'inventory',     label: 'Inventory',            path: '/inventory' },
  { key: 'feed',          label: 'Feed Management',      path: '/feed' },
  { key: 'mortality',     label: 'Mortality Tracker',    path: '/mortality' },
  { key: 'health',        label: 'Animal Health',        path: '/health' },
  { key: 'sales',         label: 'Sales & Procurement',  path: '/sales' },
  { key: 'reports',       label: 'Reports & Analytics',  path: '/reports' },
  { key: 'notifications', label: 'Notifications',        path: '/notifications' },
  { key: 'usermgmt',      label: 'User Management',      path: '/user-management' },
  { key: 'support',       label: 'IT Support',           path: '/support' },
  { key: 'helpdesk',      label: 'Helpdesk',             path: '/helpdesk' },
  { key: 'settings',      label: 'Settings',             path: '/settings' },
];

const iconMap = {
  dashboard: Icons.dashboard, farms: Icons.farm, houses: Icons.house,
  maintenance: Icons.wrench,
  batches: Icons.batch, inventory: Icons.inventory, feed: Icons.feed,
  mortality: Icons.mortality, health: Icons.syringe,
  sales: Icons.sales, reports: Icons.reports,
  notifications: Icons.bell, settings: Icons.settings,
  usermgmt: Icons.users, support: Icons.mail, helpdesk: Icons.wrench,
};

const ROLE_LABEL = { 1: 'Administrator', 2: 'Farm Manager', 3: 'Farm Worker', 4: 'Veterinarian', 5: 'Owner' };

function getAlertRoute(alertType) {
  switch (alertType) {
    case 'inventory_low':
    case 'inventory_expiry': return '/inventory';
    case 'feed_low':         return '/feed';
    case 'vaccination_due':  return '/health';
    case 'mortality_high':   return '/mortality';
    case 'batch_harvest':
    case 'withdrawal_active': return '/batches';
    default:                 return '/notifications';
  }
}

const SEVERITY_TONE = { info: 'info', warning: 'warning', danger: 'danger' };

function NotificationsDropdown({ alerts, onClose, onMarkAll, onViewAll, onAlertClick }) {
  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 340,
      background: 'var(--white)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
      zIndex: 200, overflow: 'hidden',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--text-strong)' }}>Notifications</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {alerts.length > 0 && (
            <button onClick={onMarkAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600 }}>Mark all read</button>
          )}
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>×</button>
        </div>
      </div>
      {alerts.length === 0 && (
        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No unread notifications</div>
      )}
      {alerts.map((n) => (
        <div key={n.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background 120ms' }}
          onClick={() => onAlertClick(n)}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ marginTop: 2 }}>
              <Badge tone={SEVERITY_TONE[n.severity] || 'neutral'} variant="solid" style={{ padding: '2px 7px', fontSize: 10 }}>
                {n.severity === 'danger' ? '!!' : n.severity === 'warning' ? '!' : 'i'}
              </Badge>
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-strong)' }}>{n.alert_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {new Date(n.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}
      <div style={{ padding: '10px 16px', textAlign: 'center' }}>
        <button onClick={onViewAll} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-brand)', padding: 0 }}>View all notifications</button>
      </div>
    </div>
  );
}

export function AppLayout({ children }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuth();

  const { farms, farmId, selectFarm } = useFarm();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [alerts,      setAlerts]      = useState([]);
  const notifRef = useRef(null);

  // Load unread alerts once on mount + every 5 minutes (not on every page nav)
  useEffect(() => {
    const fetchAlerts = () =>
      alertsApi.list({ farm_id: farmId, unread: true, limit: 20 })
        .then(setAlerts)
        .catch(() => {});
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [farmId]);

  // Close notifications on outside click
  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const activeItem = navItems.find((item) => {
    if (item.key === 'batches') return location.pathname === '/batches' || location.pathname.startsWith('/batches/');
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  });
  const activeKey = activeItem?.key || 'dashboard';
  const pageTitle = activeItem?.label || 'Dashboard';
  const selectedFarm = farms.find(f => f.id === farmId);
  const farmSubtitle = (activeKey !== 'farms' && activeKey !== 'settings' && selectedFarm)
    ? selectedFarm.name
    : null;

  const handleNavSelect = (key) => {
    const item = navItems.find((n) => n.key === key);
    if (item) navigate(item.path);
  };

  async function handleMarkAll() {
    await alertsApi.markAllRead(farmId).catch(() => {});
    setAlerts([]);
  }

  function handleAlertClick(alert) {
    navigate(getAlertRoute(alert.alert_type));
    setNotifOpen(false);
    alertsApi.markRead(alert.id).catch(() => {});
    setAlerts(prev => prev.filter(a => a.id !== alert.id));
  }

  const roleId = user?.role_id;
  const filteredNavItems = navItems.filter(item => {
    if (item.key === 'usermgmt') return roleId === 1;
    if (item.key === 'helpdesk') return roleId === 1 || roleId === 2 || roleId === 5;
    if (item.key === 'support')  return roleId === 3 || roleId === 4;
    return true;
  });

  const nav = filteredNavItems.map((item) => ({
    key: item.key, label: item.label,
    icon: React.createElement(iconMap[item.key] || Icons.dashboard, { w: 19 }),
  }));

  const displayName = user?.full_name || 'Admin User';

  return (
    <div className="app-shell" style={{ display: 'flex', height: '100vh', fontFamily: 'var(--font-body)', background: 'var(--surface-page)', overflow: 'hidden' }}>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99, display: 'none' }} className="sidebar-overlay" />
      )}

      <div style={{ position: 'relative', zIndex: 100, transition: 'transform 200ms var(--ease-std)' }} className={`no-print${sidebarOpen ? ' sidebar-open' : ''}`}>
        <SidebarNav
          brand={<img src="/logo-lockup-dark.png" alt="RTL Poultry Farming ERP" style={{ height: 40 }} />}
          items={nav}
          active={activeKey}
          onSelect={handleNavSelect}
          footer={
            (user?.role_id === 1 || user?.role_id === 5) ? (
              farms.length > 0 ? (
                <select
                  value={farmId}
                  onChange={e => selectFarm(Number(e.target.value))}
                  style={{
                    width: '100%', padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.08)',
                    color: '#fff',
                    fontSize: '13px',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    outline: 'none',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.6)' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                    paddingRight: 32,
                  }}
                >
                  {farms.map(f => <option key={f.id} value={f.id} style={{ background: '#1a2e22', color: '#fff' }}>{f.name}</option>)}
                </select>
              ) : null
            ) : selectedFarm ? (
              <div style={{
                color: 'rgba(232,240,235,0.85)',
                fontSize: '13px',
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 4px'
              }}>
                <span style={{ fontSize: '15px' }}>🏢</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedFarm.name}</span>
              </div>
            ) : null
          }
        />
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <div className="no-print"><Topbar
          title={pageTitle}
          subtitle={farmSubtitle}
          onMenu={() => setSidebarOpen((s) => !s)}
          right={
            <React.Fragment>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <IconButton title="Notifications" badge={alerts.length || undefined} onClick={() => setNotifOpen((s) => !s)}>
                  <Icons.bell w={18} />
                </IconButton>
                {notifOpen && (
                  <NotificationsDropdown
                    alerts={alerts}
                    onClose={() => setNotifOpen(false)}
                    onMarkAll={handleMarkAll}
                    onViewAll={() => { navigate('/notifications'); setNotifOpen(false); }}
                    onAlertClick={handleAlertClick}
                  />
                )}
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <Avatar name={displayName} role={ROLE_LABEL[user?.role_id] || 'User'} showText />
              <button
                onClick={logout}
                title="Sign out"
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' }}
              >
                <Icons.logout w={17} />
              </button>
            </React.Fragment>
          }
        /></div>
        <div style={{ flex: 1, overflowY: 'auto' }} className="page-content">{children}</div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-overlay { display: block !important; }
          nav[style] { position: fixed !important; top: 0; left: 0; height: 100vh; transform: translateX(-100%); transition: transform 200ms cubic-bezier(0.4,0,0.2,1); }
          .sidebar-open nav[style] { transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
