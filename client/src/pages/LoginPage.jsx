import React, { useState, useEffect, useRef } from 'react';
import { login } from '../lib/auth';

const DEMO_CREDS = [
  { role: 'fan',      username: 'fan_demo',  password: 'fan2026',   label: 'Fan',      color: '#22c55e', icon: '👥' },
  { role: 'staff',    username: 'staff_001', password: 'staff2026', label: 'Staff',    color: '#f59e0b', icon: '📡' },
  { role: 'operator', username: 'admin',     password: 'admin123',  label: 'Operator', color: '#ef4444', icon: '🛡️' },
];

// Pixel font style shorthand
const px = { fontFamily: "'Press Start 2P', monospace" };

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedHint, setSelectedHint] = useState(null);
  const [tick, setTick] = useState(0);
  const [ballPos, setBallPos] = useState({ x: 15, y: 50 });
  const [ballDir, setBallDir] = useState({ x: 0.6, y: 0.4 });
  const [scoreFlash, setScoreFlash] = useState(false);
  const canvasRef = useRef(null);

  // Animate ticker + ball
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
      setBallPos(prev => {
        let nx = prev.x + ballDir.x * 0.5;
        let ny = prev.y + ballDir.y * 0.5;
        let dx = ballDir.x;
        let dy = ballDir.y;
        if (nx <= 5 || nx >= 95) { dx = -dx; setScoreFlash(true); setTimeout(() => setScoreFlash(false), 400); }
        if (ny <= 10 || ny >= 90) dy = -dy;
        setBallDir({ x: dx, y: dy });
        return { x: Math.min(95, Math.max(5, nx)), y: Math.min(90, Math.max(10, ny)) };
      });
    }, 50);
    return () => clearInterval(interval);
  }, [ballDir]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const auth = await login(username, password);
      onLogin(auth);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Check your login details.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred) => {
    setUsername(cred.username);
    setPassword(cred.password);
    setSelectedHint(cred.role);
    setError('');
  };

  // Pixel "crowd" dots — deterministic based on index
  const crowdDots = Array.from({ length: 80 }, (_, i) => ({
    x: (i * 13.7) % 100,
    y: (i * 7.3) % 100,
    color: ['#ffdd57', '#ff6b6b', '#74c0fc', '#b2f2bb', '#ff922b'][i % 5],
    size: [2, 3, 2, 4, 2][i % 5],
    blink: i % 7 === 0,
  }));

  const minutes = String(Math.floor((tick * 50) / 60000 % 90)).padStart(2, '0');
  const seconds = String(Math.floor((tick * 50) / 1000 % 60)).padStart(2, '0');

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: '#0a1a0a',
    }}>
      {/* ===== PIXEL FOOTBALL FIELD BACKGROUND ===== */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0d1f0d 0%, #133a13 30%, #1a5c1a 50%, #133a13 70%, #0d1f0d 100%)',
      }} />

      {/* Field stripes */}
      {[0,1,2,3,4,5,6,7,8,9].map(i => (
        <div key={i} style={{
          position: 'absolute',
          left: `${i * 10}%`, top: 0, bottom: 0,
          width: '10%',
          background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Yard lines — pixel style */}
      {[10,20,30,40,50,60,70,80,90].map(pct => (
        <div key={pct} style={{
          position: 'absolute',
          left: `${pct}%`, top: '5%', bottom: '5%',
          width: '3px',
          background: pct === 50
            ? 'rgba(255,255,255,0.5)'
            : 'rgba(255,255,255,0.18)',
          imageRendering: 'pixelated',
          pointerEvents: 'none',
        }} />
      ))}

      {/* Center circle pixel */}
      <div style={{
        position: 'absolute',
        left: '50%', top: '50%',
        transform: 'translate(-50%,-50%)',
        width: '120px', height: '120px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Goal boxes — left */}
      <div style={{
        position: 'absolute', left: '0%', top: '30%',
        width: '6%', height: '40%',
        border: '3px solid rgba(255,255,255,0.2)',
        borderLeft: 'none',
        pointerEvents: 'none',
      }} />
      {/* Goal boxes — right */}
      <div style={{
        position: 'absolute', right: '0%', top: '30%',
        width: '6%', height: '40%',
        border: '3px solid rgba(255,255,255,0.2)',
        borderRight: 'none',
        pointerEvents: 'none',
      }} />

      {/* Stadium lights — corner glow */}
      {[
        { top: '2%', left: '2%' }, { top: '2%', right: '2%' },
        { bottom: '2%', left: '2%' }, { bottom: '2%', right: '2%' }
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: '32px', height: '32px',
          background: '#fffde7',
          boxShadow: `0 0 ${40 + (tick % 20)}px ${20 + (tick % 10)}px rgba(255,253,200,0.4)`,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
          pointerEvents: 'none',
          opacity: 0.85 + Math.sin(tick * 0.1 + i) * 0.15,
          transition: 'box-shadow 0.1s',
        }} />
      ))}

      {/* Pixel crowd dots */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {crowdDots.map((d, i) => (
          <rect
            key={i}
            x={`${d.x}%`} y={`${d.y}%`}
            width={d.size} height={d.size}
            fill={d.color}
            opacity={d.blink ? (tick % 10 < 5 ? 0.9 : 0.3) : 0.55}
          />
        ))}
      </svg>

      {/* Bouncing football (⚽ pixel) */}
      <div style={{
        position: 'absolute',
        left: `${ballPos.x}%`,
        top: `${ballPos.y}%`,
        transform: 'translate(-50%, -50%)',
        fontSize: '20px',
        filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))',
        pointerEvents: 'none',
        transition: 'left 0.05s linear, top 0.05s linear',
        rotate: `${tick * 5}deg`,
      }}>⚽</div>

      {/* ===== PIXEL SCOREBOARD (TOP) ===== */}
      <div style={{
        position: 'absolute',
        top: '16px', left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a0a00',
        border: `3px solid ${scoreFlash ? '#ff4444' : '#ff8c00'}`,
        padding: '8px 24px',
        display: 'flex',
        gap: '24px',
        alignItems: 'center',
        boxShadow: `0 0 20px ${scoreFlash ? 'rgba(255,68,68,0.8)' : 'rgba(255,140,0,0.5)'}`,
        zIndex: 10,
        transition: 'all 0.1s',
      }}>
        <span style={{ ...px, fontSize: '10px', color: '#ff8c00', letterSpacing: '0.05em' }}>
          GAMEFIELD OPS
        </span>
        <div style={{
          background: '#000',
          padding: '4px 10px',
          border: '2px solid #ff8c00',
          ...px, fontSize: '11px', color: '#ffcc00',
          letterSpacing: '2px',
        }}>
          {minutes}:{seconds}
        </div>
        <span style={{ ...px, fontSize: '9px', color: '#ff6b6b' }}>
          FIFA 2026
        </span>
      </div>

      {/* ===== MAIN LOGIN CARD ===== */}
      <div style={{
        position: 'relative', zIndex: 20,
        width: '100%', maxWidth: '480px',
        margin: '0 16px',
      }}>
        {/* Pixel border container */}
        <div style={{
          background: 'rgba(8, 15, 8, 0.92)',
          border: '4px solid #22c55e',
          boxShadow: '0 0 0 2px #0a1a0a, 0 0 0 4px #16a34a, 0 0 40px rgba(34,197,94,0.3), inset 0 0 30px rgba(0,0,0,0.5)',
          padding: '0',
          backdropFilter: 'blur(12px)',
        }}>
          {/* Card header — pixel style */}
          <div style={{
            background: 'linear-gradient(90deg, #14532d, #166534, #14532d)',
            borderBottom: '4px solid #22c55e',
            padding: '20px 28px',
            textAlign: 'center',
          }}>
            <div style={{ ...px, fontSize: '7px', color: '#4ade80', letterSpacing: '0.15em', marginBottom: '10px' }}>
              ★ STADIUM OPERATIONS CENTER ★
            </div>
            <h1 style={{
              ...px, fontSize: '18px',
              background: 'linear-gradient(180deg, #ffffff 0%, #86efac 50%, #22c55e 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: '8px', letterSpacing: '0.05em',
              textShadow: 'none',
              lineHeight: 1.4,
            }}>
              GAMEFIELD<br />OPS
            </h1>
            <div style={{ ...px, fontSize: '6px', color: '#86efac', letterSpacing: '0.2em' }}>
              METLIFE STADIUM • FIFA WORLD CUP 2026
            </div>
          </div>

          {/* Form body */}
          <div style={{ padding: '28px' }}>
            {/* Role quick-fill hints */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ ...px, fontSize: '6px', color: '#4ade80', marginBottom: '10px', letterSpacing: '0.1em' }}>
                SELECT ROLE:
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                {DEMO_CREDS.map(cred => (
                  <button
                    key={cred.role}
                    onClick={() => fillDemo(cred)}
                    style={{
                      flex: 1,
                      background: selectedHint === cred.role
                        ? `${cred.color}22`
                        : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${selectedHint === cred.role ? cred.color : 'rgba(255,255,255,0.1)'}`,
                      color: selectedHint === cred.role ? cred.color : '#9ca3af',
                      padding: '10px 6px',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: '6px',
                      transition: 'all 0.15s ease',
                      boxShadow: selectedHint === cred.role ? `0 0 12px ${cred.color}44` : 'none',
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{cred.icon}</span>
                    <span style={{ ...px, fontSize: '6px', letterSpacing: '0.05em' }}>{cred.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login form */}
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  ...px, display: 'block',
                  fontSize: '7px', color: '#4ade80',
                  marginBottom: '8px', letterSpacing: '0.1em'
                }}>
                  USERNAME:
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Enter username..."
                  autoComplete="username"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '2px solid #16a34a',
                    color: '#f0fdf4',
                    padding: '12px 14px',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '9px',
                    outline: 'none',
                    letterSpacing: '0.05em',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#22c55e'}
                  onBlur={e => e.target.style.borderColor = '#16a34a'}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  ...px, display: 'block',
                  fontSize: '7px', color: '#4ade80',
                  marginBottom: '8px', letterSpacing: '0.1em'
                }}>
                  PASSWORD:
                </label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '2px solid #16a34a',
                    color: '#f0fdf4',
                    padding: '12px 14px',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '9px',
                    outline: 'none',
                    letterSpacing: '0.1em',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = '#22c55e'}
                  onBlur={e => e.target.style.borderColor = '#16a34a'}
                />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '2px solid #ef4444',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  ...px, fontSize: '7px', color: '#fca5a5',
                  letterSpacing: '0.05em', lineHeight: 1.8,
                }}>
                  ✗ {error}
                </div>
              )}

              {/* Submit button */}
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  background: loading
                    ? 'rgba(34,197,94,0.3)'
                    : 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                  border: '3px solid #4ade80',
                  color: '#fff',
                  padding: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  ...px, fontSize: '10px',
                  letterSpacing: '0.1em',
                  boxShadow: loading ? 'none' : '0 4px 0 #15803d, 0 0 20px rgba(34,197,94,0.4)',
                  transform: loading ? 'translateY(2px)' : 'translateY(0)',
                  transition: 'all 0.1s ease',
                  imageRendering: 'pixelated',
                }}
              >
                {loading ? '► LOGGING IN...' : '► ENTER STADIUM'}
              </button>
            </form>

            {/* Footer note */}
            <div style={{
              marginTop: '20px',
              textAlign: 'center',
              ...px, fontSize: '6px', color: '#4b5563',
              letterSpacing: '0.08em', lineHeight: 2,
            }}>
              ACCESS IS BY INVITATION ONLY.<br />
              CONTACT OPS TEAM FOR CREDENTIALS.
            </div>
          </div>
        </div>

        {/* Bottom pixel decoration */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: '4px', marginTop: '12px',
        }}>
          {['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6'].map((c, i) => (
            <div key={i} style={{
              width: '8px', height: '8px',
              background: c,
              opacity: tick % 10 === i ? 1 : 0.3,
              transition: 'opacity 0.1s',
            }} />
          ))}
        </div>
      </div>

      {/* ===== SCROLLING TICKER (BOTTOM) ===== */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#0a0a00',
        borderTop: '3px solid #ff8c00',
        padding: '8px 0',
        overflow: 'hidden',
        zIndex: 30,
      }}>
        <div style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          animation: 'ticker-scroll 30s linear infinite',
          ...px, fontSize: '8px', color: '#ffaa00',
          letterSpacing: '0.1em',
        }}>
          {' '.repeat(10)}
          ⚽ GAMEFIELD OPS — FIFA WORLD CUP 2026 · METLIFE STADIUM — REAL-TIME OPERATIONS &amp; CROWD MANAGEMENT SYSTEM ·
          🏟️ GATES OPEN 90 MINUTES BEFORE KICKOFF · FIRST AID STATIONS AT ALL QUADRANTS ·
          📡 LIVE TELEMETRY STREAMING · STAFF ON DUTY: ALL SECTORS COVERED ·
          🛡️ COMMAND CENTER ACTIVE · AUTHORIZED PERSONNEL ONLY ·
          {' '.repeat(10)}
          ⚽ GAMEFIELD OPS — FIFA WORLD CUP 2026 · METLIFE STADIUM — REAL-TIME OPERATIONS &amp; CROWD MANAGEMENT SYSTEM ·
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(100vw); }
          100% { transform: translateX(-200%); }
        }
        #login-username::placeholder,
        #login-password::placeholder {
          color: #374151;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
        }
      `}</style>
    </div>
  );
}
