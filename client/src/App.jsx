import React, { useState, useEffect } from 'react';
import { socket } from './lib/socket';
import { fetchTelemetry } from './lib/api';
import { getAuthState, logout } from './lib/auth';
import LoginPage from './pages/LoginPage';
import FanPage from './pages/FanPage';
import VolunteerPage from './pages/VolunteerPage';
import OperatorPage from './pages/OperatorPage';
import { Shield, RefreshCw, LogOut, Users, Radio, RadioReceiver } from 'lucide-react';

const ROLE_CONFIG = {
  fan:      { label: 'Fan Portal',     icon: <Users size={14} />,         color: '#22c55e' },
  staff:    { label: 'Staff Portal',   icon: <RadioReceiver size={14} />, color: '#f59e0b' },
  operator: { label: 'Command Center', icon: <Radio size={14} />,         color: '#ef4444' },
};

export default function App() {
  const [auth, setAuth] = useState(() => getAuthState());
  const [telemetry, setTelemetry] = useState(null);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadInitialTelemetry = async () => {
    setRefreshing(true);
    try {
      const data = await fetchTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error('[App] Failed to fetch initial telemetry REST api:', err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!auth) return; // Don't connect socket until logged in

    loadInitialTelemetry();

    const onConnect = () => {
      console.log('[Socket] Connected to server');
      setConnected(true);
    };

    const onDisconnect = () => {
      console.log('[Socket] Disconnected from server');
      setConnected(false);
    };

    const onTelemetryUpdate = (updatedState) => {
      console.log('[Socket] Received telemetry update:', updatedState.timestamp);
      setTelemetry(updatedState);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('telemetry:update', onTelemetryUpdate);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('telemetry:update', onTelemetryUpdate);
    };
  }, [auth]);

  const handleLogin = (authData) => {
    setAuth(authData);
  };

  const handleLogout = () => {
    logout();
    setAuth(null);
    setTelemetry(null);
    setConnected(false);
  };

  // ── Not logged in → show pixel football login page ──
  if (!auth) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const role = auth.role;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.fan;

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="logo-container">
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Shield size={22} />
          </div>
          <div>
            <h1 className="logo-text">GameField Ops</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              MetLife Stadium Management Portal
            </span>
          </div>
        </div>

        {/* Current role badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: `${roleConfig.color}18`,
          border: `1px solid ${roleConfig.color}55`,
          borderRadius: '9999px',
          padding: '0.4rem 1.1rem',
          fontSize: '0.85rem',
          color: roleConfig.color,
          fontWeight: 600,
        }}>
          {roleConfig.icon}
          {roleConfig.label}
          <span style={{
            marginLeft: '6px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontWeight: 400,
          }}>
            · {auth.username}
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
          <button
            onClick={loadInitialTelemetry}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center'
            }}
            title="Refresh Data"
            disabled={refreshing}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1.5s linear infinite' : 'none' }} />
          </button>

          {/* Connection status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: connected ? 'var(--status-flowing)' : 'var(--status-bottleneck)',
              boxShadow: connected ? '0 0 8px var(--status-flowing-glow)' : '0 0 8px var(--status-bottleneck-glow)',
              display: 'inline-block'
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>
              {connected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* Logout */}
          <button
            id="logout-button"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#ef4444', cursor: 'pointer',
              borderRadius: '8px',
              padding: '0.4rem 0.9rem',
              fontSize: '0.8rem', fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)';
            }}
            title="Logout"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content — role-gated */}
      <main className="app-main">
        {role === 'fan'      && <FanPage telemetry={telemetry} />}
        {role === 'staff'    && <VolunteerPage telemetry={telemetry} />}
        {role === 'operator' && <OperatorPage telemetry={telemetry} refreshTelemetry={loadInitialTelemetry} />}
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.75rem',
        color: 'var(--text-muted)'
      }}>
        GameField Ops Hub | Built for FIFA World Cup 2026. Real-time telemetry simulated dynamically.
      </footer>
    </div>
  );
}
