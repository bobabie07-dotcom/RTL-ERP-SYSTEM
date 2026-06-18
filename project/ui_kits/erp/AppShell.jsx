/* RTL Poultry Farming ERP — AppShell: sidebar + topbar + content slot. */
const { SidebarNav, Topbar, IconButton, Avatar, Select } = window.RTLPoultryFarmingERPDesignSystem_698a73;

function AppShell({ active, onSelect, title, children }) {
  const I = window.RTLIcons;
  const nav = [
    { key: 'dashboard', label: 'Dashboard', icon: <I.dashboard w={19} /> },
    { key: 'farms', label: 'Farm Management', icon: <I.farm w={19} /> },
    { key: 'houses', label: 'Poultry Houses', icon: <I.house w={19} /> },
    { key: 'batches', label: 'Batch Management', icon: <I.batch w={19} /> },
    { key: 'inventory', label: 'Inventory', icon: <I.inventory w={19} /> },
    { key: 'feed', label: 'Feed Management', icon: <I.feed w={19} /> },
    { key: 'mortality', label: 'Mortality Tracker', icon: <I.mortality w={19} /> },
    { key: 'sales', label: 'Sales & Procurement', icon: <I.sales w={19} /> },
    { key: 'reports', label: 'Reports & Analytics', icon: <I.reports w={19} /> },
    { key: 'settings', label: 'Settings', icon: <I.settings w={19} /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 600, fontFamily: 'var(--font-body)', background: 'var(--surface-page)' }}>
      <SidebarNav
        brand={<img src={(window.__resources && window.__resources.logoLockup) || '../../assets/logo-lockup-dark.png'} alt="RTL Poultry Farming ERP" style={{ height: 40 }} />}
        items={nav}
        active={active}
        onSelect={onSelect}
        footer={<Select options={['RTL Main Farm', 'RTL North Farm', 'All Farms']} />}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <Topbar
          title={title}
          right={<React.Fragment>
            <IconButton title="Messages" badge={2}><I.mail w={18} /></IconButton>
            <IconButton title="Notifications" badge={4}><I.bell w={18} /></IconButton>
            <Select options={['May 12, 2025']} />
            <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
            <Avatar name="Admin User" role="Farm Manager" showText />
          </React.Fragment>}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

window.AppShell = AppShell;
