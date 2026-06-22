import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', padding: 40, gap: 16, textAlign: 'center',
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--danger-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>⚠</div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-strong)', margin: '0 0 6px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
              {this.state.error?.message || 'An unexpected error occurred on this page.'}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '8px 20px', borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, color: 'var(--text-body)',
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
