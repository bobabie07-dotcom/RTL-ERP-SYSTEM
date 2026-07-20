import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/core/Button';
import { IconButton } from '../components/core/IconButton';
import { Input } from '../components/forms/Input';
import { Checkbox } from '../components/forms/Checkbox';
import Icons from '../icons';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL || 'admin@rtl-poultry.com';

function ContactModal({ onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 14, width: '100%', maxWidth: 380,
        padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111827' }}>Contact Administrator</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#6b7280', lineHeight: 1 }}>×</button>
        </div>
        <p style={{ fontSize: 14, color: '#374151', margin: '0 0 16px', lineHeight: 1.6 }}>
          For account issues, password resets, or new account requests, please contact your system administrator.
        </p>
        <a
          href={`mailto:${ADMIN_EMAIL}?subject=RTL Poultry ERP — Account Assistance`}
          style={{
            display: 'block', textAlign: 'center',
            background: '#16a34a', color: '#fff', borderRadius: 8,
            padding: '10px 16px', fontSize: 14, fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Email Administrator
        </a>
        <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          {ADMIN_EMAIL}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const I = Icons;

  const [show, setShow]           = useState(false);
  const [email, setEmail]         = useState('');
  const [pass, setPass]           = useState('');
  const [remember, setRemember]   = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [slowWarn, setSlowWarn]   = useState(false);
  const [showContact, setContact] = useState(false);

  const features = [
    ['birds', 'Track flocks, batches & poultry houses'],
    ['scale', 'Monitor feed, weight & FCR in real time'],
    ['pie',   'Expenses, sales & profit analytics'],
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSlowWarn(false);
    setLoading(true);
    const slowTimer = setTimeout(() => setSlowWarn(true), 8000);
    try {
      const me = await login(email, pass);
      window.location.replace(me.is_first_login ? '/change-password' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      clearTimeout(slowTimer);
      setLoading(false);
      setSlowWarn(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: 560, fontFamily: 'var(--font-body)' }}>
      {showContact && <ContactModal onClose={() => setContact(false)} />}

      {/* Hero */}
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
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.02em', color: '#fff', margin: 0 }}>
            Manage Smarter.<br /><span style={{ color: 'var(--green-400)' }}>Farm Better.</span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 15, color: 'rgba(232,240,235,0.8)', maxWidth: 380, lineHeight: 1.6 }}>
            The complete ERP for modern poultry farm management — flocks, feed, finance, all in one place.
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {features.map(([ic, txt]) => {
              const Glyph = I[ic];
              return (
                <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(47,172,100,0.18)', color: 'var(--green-400)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Glyph w={17} />
                  </span>
                  <span style={{ fontSize: 14, color: 'rgba(232,240,235,0.92)' }}>{txt}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(232,240,235,0.5)' }}>© 2025 RTL Poultry Farming ERP</div>
      </div>

      {/* Sign-in card */}
      <div style={{ flex: '1 1 48%', background: 'var(--surface-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--green-50)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/logo-mark.png" alt="" style={{ width: 46, height: 46, objectFit: 'contain' }} />
            </span>
            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Welcome back</h2>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>Sign in to your farm dashboard</p>
            </div>
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13 }}>
              {error}
            </div>
          )}

          <Input label="Email or Username" type="text" placeholder="Email or username" icon={<I.user />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password" type={show ? 'text' : 'password'} placeholder="Enter your password" icon={<I.lock />}
            value={pass} onChange={(e) => setPass(e.target.value)} required
            trailing={<IconButton size="sm" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>{show ? <I.eyeOff /> : <I.eye />}</IconButton>}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <button
              type="button"
              onClick={() => setContact(true)}
              style={{ fontSize: 13, color: 'var(--text-brand, #16a34a)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}
            >
              Contact admin to reset password
            </button>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? (slowWarn ? 'Server waking up, please wait…' : 'Signing in...') : 'Login'}
          </Button>
          {slowWarn && (
            <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 0' }}>
              The server is starting up after inactivity — this may take up to 60 seconds on first login.
            </p>
          )}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setContact(true)}
              style={{ fontWeight: 600, color: 'var(--text-body)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}
            >
              Contact your administrator
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}
