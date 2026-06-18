/* RTL Poultry Farming ERP — UI kit icon set (Lucide-style stroke SVGs).
   Exported to window for use across screen files. */
const Ic = ({ d, w = 20, s = 2 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={s} strokeLinecap="round" strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: d }} />
);

const Icons = {
  dashboard: (p) => <Ic {...p} d='<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' />,
  farm: (p) => <Ic {...p} d='<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/>' />,
  house: (p) => <Ic {...p} d='<path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>' />,
  batch: (p) => <Ic {...p} d='<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>' />,
  inventory: (p) => <Ic {...p} d='<path d="M20 7H4M20 7l-2-3H6L4 7M20 7v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7"/>' />,
  feed: (p) => <Ic {...p} d='<path d="M3 3h18v4H3zM5 7v13h14V7M9 11h6"/>' />,
  mortality: (p) => <Ic {...p} d='<path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0L12 5.35l-.77-.77a5.4 5.4 0 0 0-7.65 7.65l.77.77L12 21l7.65-7.65.77-.77a5.4 5.4 0 0 0 0-7.65z"/>' />,
  medication: (p) => <Ic {...p} d='<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>' />,
  procurement: (p) => <Ic {...p} d='<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>' />,
  expense: (p) => <Ic {...p} d='<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' />,
  sales: (p) => <Ic {...p} d='<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' />,
  reports: (p) => <Ic {...p} d='<path d="M3 3v18h18"/><rect x="7" y="9" width="3" height="9"/><rect x="13" y="5" width="3" height="13"/>' />,
  alerts: (p) => <Ic {...p} d='<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>' />,
  users: (p) => <Ic {...p} d='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' />,
  settings: (p) => <Ic {...p} d='<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>' />,
  bell: (p) => <Ic {...p} d='<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>' />,
  mail: (p) => <Ic {...p} d='<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>' />,
  calendar: (p) => <Ic {...p} d='<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>' />,
  user: (p) => <Ic {...p} d='<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' />,
  lock: (p) => <Ic {...p} d='<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>' />,
  eye: (p) => <Ic {...p} d='<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>' />,
  eyeOff: (p) => <Ic {...p} d='<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><path d="M1 1l22 22"/><path d="M4.5 7.5A18.7 18.7 0 0 0 1 12s4 8 11 8a9.7 9.7 0 0 0 4.5-1.06"/>' />,
  chevronDown: (p) => <Ic {...p} d='<polyline points="6 9 12 15 18 9"/>' />,
  chevronRight: (p) => <Ic {...p} d='<polyline points="9 18 15 12 9 6"/>' />,
  plus: (p) => <Ic {...p} d='<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' />,
  pencil: (p) => <Ic {...p} d='<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>' />,
  trash: (p) => <Ic {...p} d='<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' />,
  birds: (p) => <Ic {...p} d='<path d="M16 7h.01"/><path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20"/><path d="m20 7 2 .5-2 .5"/><path d="M10 18v3"/><path d="M14 17.75V21"/><path d="M7 18a6 6 0 0 0 3.84-10.61"/>' />,
  population: (p) => <Ic {...p} d='<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/>' />,
  trendUp: (p) => <Ic {...p} d='<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>' />,
  wallet: (p) => <Ic {...p} d='<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>' />,
  scale: (p) => <Ic {...p} d='<path d="m16 16 3-8 3 8c-2 1.5-4 1.5-6 0Z"/><path d="m2 16 3-8 3 8c-2 1.5-4 1.5-6 0Z"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>' />,
  percent: (p) => <Ic {...p} d='<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>' />,
  pie: (p) => <Ic {...p} d='<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>' />,
  box: (p) => <Ic {...p} d='<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/>' />,
  google: (p) => <svg width={p && p.w || 18} height={p && p.w || 18} viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"/></svg>,
  check: (p) => <Ic {...p} d='<polyline points="20 6 9 17 4 12"/>' />,
  alertTri: (p) => <Ic {...p} d='<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' />,
  syringe: (p) => <Ic {...p} d='<path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/>' />,
  harvest: (p) => <Ic {...p} d='<path d="M2 22 16 8"/><path d="M11 2c-2 2-3 4-3 7 3 0 5-1 7-3M16 8c2-2 4-3 7-3-1 3-2 5-4 7"/>' />,
  search: (p) => <Ic {...p} d='<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' />,
  download: (p) => <Ic {...p} d='<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' />,
  menu: (p) => <Ic {...p} d='<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>' />,
};

window.RTLIcons = Icons;
