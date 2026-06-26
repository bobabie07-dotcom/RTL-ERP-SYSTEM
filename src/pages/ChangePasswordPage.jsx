import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import { Button } from '../components/core/Button';
import { IconButton } from '../components/core/IconButton';
import { Input } from '../components/forms/Input';
import Icons from '../icons';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const I = Icons;

  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  function validate() {
    if (newPass.length < 8) return 'Password must be at least 8 characters.';
    if (newPass !== confirmPass) return 'Passwords do not not match.';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.setFirstPassword(newPass, confirmPass);
      // Full reload so AuthContext re-fetches /me with is_first_login=false
      window.location.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: 560, fontFamily: 'var(--font-body)' }}>
      {/* Hero panel */}
      <div className="login-hero" style={{
        flex: '1 1 52%', position: 'relative',
        background: 'linear-gradient(135deg, #0c2a18 0%, #071F11 100%)',
        color: 'var(--text-on-dark)', padding: '48px 52px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(7,31,17,0.86) 0%, rgba(7,31,17,0.62) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'radial-gradient(circle, #4ade80 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div style={{ position: 'relative' }}>
          <img src="/logo-lockup-dark.png" alt="RTL Poultry Farming ERP" style={{ height: 56 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>
            Secure Your<br /><span style={{ color: 'var(--green-400)' }}>Account.</span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(232,240,235,0.8)', maxWidth: 380, lineHeight: 1.6 }}>
            For your security, you must set a new password before accessing the system.
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {['At least 8 characters long', 'Use a mix of letters and numbers', 'Keep it private — do not share it'].map(tip => (
              <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(47,172,100,0.25)', color: 'var(--green-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto', fontSize: 11, fontWeight: 700 }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(232,240,235,0.85)' }}>{tip}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(232,240,235,0.5)' }}>© 2025 RTL Poultry Farming ERP</div>
      </div>

      {/* Form panel */}
      <div style={{ flex: '1 1 48%', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo-mark.png" alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            </span>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Set New Password</h2>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                Welcome, <strong>{user?.full_name?.split(' ')[0]}</strong>. Please create a new password to continue.
              </p>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <Input
            label="New Password"
            type={showNew ? 'text' : 'password'}
            placeholder="Minimum 8 characters"
            icon={<I.lock />}
            value={newPass}
            onChange={e => setNewPass(e.target.value)}
            required
            trailing={<IconButton size="sm" onClick={() => setShowNew(s => !s)} title={showNew ? 'Hide' : 'Show'}>{showNew ? <I.eyeOff /> : <I.eye />}</IconButton>}
          />

          <Input
            label="Confirm New Password"
            type={showConfirm ? 'text' : 'password'}
            placeholder="Re-enter your new password"
            icon={<I.lock />}
            value={confirmPass}
            onChange={e => setConfirmPass(e.target.value)}
            required
            trailing={<IconButton size="sm" onClick={() => setShowConfirm(s => !s)} title={showConfirm ? 'Hide' : 'Show'}>{showConfirm ? <I.eyeOff /> : <I.eye />}</IconButton>}
          />

          {/* Strength indicator */}
          {newPass.length > 0 && (
            <div style={{ display: 'flex', gap: 4, marginTop: -8 }}>
              {[...Array(4)].map((_, i) => {
                const strength = Math.min(Math.floor(newPass.length / 3), 4);
                const colors = ['var(--danger)', 'var(--warning, #f59e0b)', 'var(--green-400)', 'var(--green-500)'];
                return (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < strength ? colors[strength - 1] : 'var(--border-default)' }} />
                );
              })}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? 'Saving...' : 'Set New Password'}
          </Button>
        </form>
      </div>
    </div>
  );
}
