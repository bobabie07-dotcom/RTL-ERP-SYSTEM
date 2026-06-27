import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/data/Card';
import { Badge } from '../components/core/Badge';
import { Button } from '../components/core/Button';
import { alertsApi } from '../api/client';
import { useFarm } from '../context/FarmContext';

function getAlertRoute(alertType) {
  switch (alertType) {
    case 'inventory_low':
    case 'inventory_expiry': return '/inventory';
    case 'feed_low':         return '/feed';
    case 'vaccination_due':  return '/health';
    case 'mortality_high':   return '/mortality';
    case 'batch_harvest':
    case 'withdrawal_active': return '/batches';
    default:                 return null;
  }
}

const SEVERITY_TONE  = { info: 'info', warning: 'warning', danger: 'danger' };
const SEVERITY_LABEL = { info: 'Info', warning: 'Warning', danger: 'Alert' };

export default function NotificationsPage() {
  const { farmId }  = useFarm();
  const navigate    = useNavigate();
  const [alerts,     setAlerts]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  function load() {
    setLoading(true);
    return alertsApi.list({ farm_id: farmId, limit: 100 })
      .then(data => setAlerts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [farmId]);

  async function handleMarkAll() {
    setMarkingAll(true);
    await alertsApi.markAllRead(farmId).catch(() => {});
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    setMarkingAll(false);
  }

  function handleMarkRead(id) {
    alertsApi.markRead(id).catch(() => {});
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
  }

  const unreadCount = alerts.filter(a => !a.is_read).length;

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Notifications</h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
            {loading ? 'Loading…' : `${unreadCount} unread · ${alerts.length} total`}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="md" onClick={handleMarkAll} disabled={markingAll}>
            {markingAll ? 'Marking…' : 'Mark all read'}
          </Button>
        )}
      </div>

      <Card>
        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>Loading notifications…</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>No notifications yet.</div>
        ) : alerts.map((n, i) => (
          <div key={n.id}
            onClick={() => { const r = getAlertRoute(n.alert_type); if (r) navigate(r); }}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 16px',
              borderBottom: i < alerts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              background: n.is_read ? 'transparent' : 'var(--green-50)',
              cursor: getAlertRoute(n.alert_type) ? 'pointer' : 'default',
              transition: 'background 120ms',
            }}
            onMouseEnter={e => { if (getAlertRoute(n.alert_type)) e.currentTarget.style.background = 'var(--gray-50)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--green-50)'; }}
            <Badge tone={SEVERITY_TONE[n.severity] || 'neutral'} variant="solid" style={{ marginTop: 2, flexShrink: 0 }}>
              {SEVERITY_LABEL[n.severity] || n.severity}
            </Badge>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-strong)', textTransform: 'capitalize' }}>
                {n.alert_type.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>{n.message}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {new Date(n.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              {!n.is_read && (
                <button
                  onClick={() => handleMarkRead(n.id)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-brand)', fontWeight: 600, padding: 0, whiteSpace: 'nowrap' }}
                >
                  Mark read
                </button>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
