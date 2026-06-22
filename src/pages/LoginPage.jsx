import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/core/Button';
import { IconButton } from '../components/core/IconButton';
import { Input } from '../components/forms/Input';
import { Checkbox } from '../components/forms/Checkbox';
import Icons from '../icons';

export default function LoginPage() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const I = Icons;

  const [show, setShow]       = useState(false);
  const [email, setEmail]     = useState('admin@rtl-poultry.com');
  const [pass, setPass]       = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const features = [
    ['birds', 'Track flocks, batches & poultry houses'],
    ['scale', 'Monitor feed, weight & FCR in real time'],
    ['pie',   'Expenses, sales & profit analytics'],
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, pass);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', minHeight: 560, fontFamily: 'var(--font-body)' }}>
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

          <Input label="Email" type="email" placeholder="Enter your email" icon={<I.user />} value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input
            label="Password" type={show ? 'text' : 'password'} placeholder="Enter your password" icon={<I.lock />}
            value={pass} onChange={(e) => setPass(e.target.value)} required
            trailing={<IconButton size="sm" onClick={() => setShow((s) => !s)} title={show ? 'Hide' : 'Show'}>{show ? <I.eyeOff /> : <I.eye />}</IconButton>}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Checkbox label="Remember me" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Contact admin to reset password</span>
          </div>
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </Button>
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Don't have an account? <span style={{ fontWeight: 600, color: 'var(--text-body)' }}>Contact your administrator</span>
          </p>
        </form>
      </div>
    </div>
  );
}
