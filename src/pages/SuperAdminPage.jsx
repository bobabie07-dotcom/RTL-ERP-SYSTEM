import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtDate(dt) {
  if (!dt) return '—';
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z');
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

export default function SuperAdminPage() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyPlan, setNewCompanyPlan] = useState('standard');
  const [newCompanyExpires, setNewCompanyExpires] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Subscriptions cache
  const [subs, setSubs] = useState({});

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.listCompanies();
      setCompanies(data);
      
      // Fetch subscriptions for each company
      const subMap = {};
      for (const comp of data) {
        try {
          const sub = await superAdminApi.getSubscription(comp.id);
          subMap[comp.id] = sub;
        } catch (e) {
          console.error(e);
        }
      }
      setSubs(subMap);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleToggleStatus = async (comp) => {
    const nextStatus = comp.status === 'active' ? 'suspended' : 'active';
    try {
      await superAdminApi.updateCompany(comp.id, { status: nextStatus });
      setCompanies(prev => prev.map(c => c.id === comp.id ? { ...c, status: nextStatus } : c));
    } catch (err) {
      alert(err.message || 'Failed to update company status');
    }
  };

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    if (!newCompanyName || !newCompanyExpires) {
      alert('Please fill in all fields');
      return;
    }
    try {
      setSubmitting(true);
      const expiresDate = new Date(newCompanyExpires).toISOString();
      await superAdminApi.createCompany({
        name: newCompanyName,
        plan_name: newCompanyPlan,
        expires_at: expiresDate
      });
      setShowAddModal(false);
      setNewCompanyName('');
      setNewCompanyPlan('standard');
      setNewCompanyExpires('');
      fetchCompanies();
    } catch (err) {
      alert(err.message || 'Failed to create company');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: 'var(--text-muted)' }}>Loading Super Admin Portal...</div>;
  }

  const activeCount = companies.filter(c => c.status === 'active').length;
  const suspendedCount = companies.filter(c => c.status === 'suspended').length;

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Total Companies</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-strong)' }}>{companies.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Active Companies</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-success)' }}>{activeCount}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 18px', flex: 1, minWidth: 150 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Suspended Companies</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--color-danger)' }}>{suspendedCount}</div>
        </div>
      </div>

      {/* Header and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, margin: 0 }}>Registered Companies</h2>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'var(--color-brand)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Add New Company
        </button>
      </div>

      {error && (
        <div style={{ padding: 12, background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Table of Companies */}
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--gray-50)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600 }}>
              <th style={{ padding: '12px 16px' }}>Company ID</th>
              <th style={{ padding: '12px 16px' }}>Company Name</th>
              <th style={{ padding: '12px 16px' }}>Active Subscription Plan</th>
              <th style={{ padding: '12px 16px' }}>Subscription Expires</th>
              <th style={{ padding: '12px 16px' }}>Created Date</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No companies registered yet.</td>
              </tr>
            ) : (
              companies.map(c => {
                const sub = subs[c.id];
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 120ms' }}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>#{c.id}</td>
                    <td style={{ padding: '14px 16px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 8px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {sub?.plan_name || 'No Plan'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {sub?.expires_at ? fmtDate(sub.expires_at) : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {fmtDate(c.created_at)}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        background: c.status === 'active' ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
                        color: c.status === 'active' ? 'var(--color-success)' : 'var(--color-danger)'
                      }}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleToggleStatus(c)}
                        style={{
                          background: 'none',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '4px 10px',
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          color: c.status === 'active' ? 'var(--color-danger)' : 'var(--color-success)',
                          borderColor: c.status === 'active' ? 'var(--color-danger-subtle)' : 'var(--color-success-subtle)'
                        }}
                      >
                        {c.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add Company Modal */}
      {showAddModal && (
        <Modal title="Register New Customer / Company" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleCreateCompany}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Company Name *
              </label>
              <input
                type="text"
                required
                value={newCompanyName}
                onChange={e => setNewCompanyName(e.target.value)}
                placeholder="e.g. Acme Farms Ltd"
                style={{
                  width: '100%', height: 38, padding: '0 10px', border: '1px solid #d1d5db',
                  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Subscription Plan Name *
              </label>
              <select
                value={newCompanyPlan}
                onChange={e => setNewCompanyPlan(e.target.value)}
                style={{
                  width: '100%', height: 38, padding: '0 10px', border: '1px solid #d1d5db',
                  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
                  background: '#fff', cursor: 'pointer'
                }}
              >
                <option value="starter">Starter Plan</option>
                <option value="standard">Standard Plan</option>
                <option value="enterprise">Enterprise Plan</option>
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Subscription Expiry Date *
              </label>
              <input
                type="date"
                required
                value={newCompanyExpires}
                onChange={e => setNewCompanyExpires(e.target.value)}
                style={{
                  width: '100%', height: 38, padding: '0 10px', border: '1px solid #d1d5db',
                  borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#374151'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  background: 'var(--color-brand)', color: '#fff', border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                {submitting ? 'Creating...' : 'Register Company'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
