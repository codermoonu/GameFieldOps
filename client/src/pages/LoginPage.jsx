import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { login } from '../lib/auth';

/**
 * LoginPage
 *
 * Stadium-ops themed login screen for GameField Ops.
 *
 * Security notes (client-side guardrails only — the server is the real
 * authority and MUST independently enforce rate limiting, lockouts, and
 * credential checks; nothing below is a substitute for that):
 *  - Demo/preset credentials are only ever rendered in a local dev build
 *    (`import.meta.env.DEV`). They are stripped from production bundles.
 *  - Inputs are trimmed and length-capped before submission.
 *  - Failed attempts are tracked client-side and the form briefly locks
 *    after repeated failures, purely to slow down casual brute forcing
 *    and give the user feedback — this is a UX guardrail, not a security
 *    boundary.
 *  - Error messages are intentionally generic (never reveal whether the
 *    username exists or which field was wrong).
 *  - Password is cleared from state after every failed attempt.
 */

// ---- Config -----------------------------------------------------------

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const MAX_FIELD_LENGTH = 64;

const TICK_INTERVAL_MS = 50;
const BALL_SPEED = 0.5;
const FIELD_MARGIN_X = 5;
const FIELD_MARGIN_Y = 10;
const TICKER_DURATION_S = 90; // slow, readable scroll

// Demo role presets — DEV ONLY. Never shipped in a production build.
const DEV_ROLE_PRESETS = [
  { role: 'fan', username: 'fan_demo', password: 'fan2026', label: 'Fan', color: '#22c55e', icon: '👥' },
  { role: 'staff', username: 'staff_001', password: 'staff2026', label: 'Staff', color: '#f59e0b', icon: '📡' },
  { role: 'operator', username: 'admin', password: 'admin123', label: 'Operator', color: '#ef4444', icon: '🛡️' },
];

const PIXEL_FONT = { fontFamily: "'Press Start 2P', monospace" };

const TICKER_TEXT =
  '⚽ GAMEFIELD OPS — FIFA WORLD CUP 2026 · METLIFE STADIUM — REAL-TIME OPERATIONS & CROWD MANAGEMENT ·   ' +
  '🏟️ GATES OPEN 90 MINUTES BEFORE KICKOFF · FIRST AID STATIONS AT ALL QUADRANTS ·   ' +
  '📡 LIVE TELEMETRY STREAMING · ALL SECTORS COVERED ·   ' +
  '🛡️ COMMAND CENTER ACTIVE · AUTHORIZED PERSONNEL ONLY ·   ';

// ---- Component ----------------------------------------------------------

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedHint, setSelectedHint] = useState(null);

  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);

  const [tick, setTick] = useState(0);
  const [ballPos, setBallPos] = useState({ x: 15, y: 50 });
  const [scoreFlash, setScoreFlash] = useState(false);

  const ballDirRef = useRef({ x: 0.6, y: 0.4 });
  const scoreFlashTimeoutRef = useRef(null);

  const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);
  const isLocked = Boolean(lockedUntil) && Date.now() < lockedUntil;
  const lockoutSecondsLeft = isLocked ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  const flashScore = useCallback(() => {
    setScoreFlash(true);
    clearTimeout(scoreFlashTimeoutRef.current);
    scoreFlashTimeoutRef.current = setTimeout(() => setScoreFlash(false), 400);
  }, []);

  // Single stable interval driving both the clock tick and the ball —
  // direction lives in a ref so the interval never has to be torn down
  // and recreated on every frame.
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      setBallPos((prev) => {
        const dir = ballDirRef.current;
        const nextX = prev.x + dir.x * BALL_SPEED;
        const nextY = prev.y + dir.y * BALL_SPEED;

        if (nextX <= FIELD_MARGIN_X || nextX >= 100 - FIELD_MARGIN_X) {
          ballDirRef.current = { ...ballDirRef.current, x: -dir.x };
          flashScore();
        }
        if (nextY <= FIELD_MARGIN_Y || nextY >= 100 - FIELD_MARGIN_Y) {
          ballDirRef.current = { ...ballDirRef.current, y: -dir.y };
        }

        return {
          x: Math.min(100 - FIELD_MARGIN_X, Math.max(FIELD_MARGIN_X, nextX)),
          y: Math.min(100 - FIELD_MARGIN_Y, Math.max(FIELD_MARGIN_Y, nextY)),
        };
      });
    }, TICK_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(scoreFlashTimeoutRef.current);
    };
  }, [flashScore]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError('');

      if (isLocked) return;

      const cleanUsername = username.trim();
      if (!cleanUsername || !password) {
        setError('Enter both username and password.');
        return;
      }

      setLoading(true);
      try {
        const auth = await login(cleanUsername, password);
        setFailedAttempts(0);
        onLogin(auth);
      } catch (err) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        setPassword('');

        if (attempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_MS);
          setError(`Too many failed attempts. Try again in ${Math.ceil(LOCKOUT_MS / 1000)}s.`);
        } else {
          // Deliberately generic — never confirm which field was wrong.
          setError(err?.message ? 'Invalid credentials. Check your login details.' : 'Sign-in failed. Try again.');
        }
      } finally {
        setLoading(false);
      }
    },
    [username, password, isLocked, failedAttempts, onLogin]
  );

  const fillDemo = useCallback(
    (preset) => {
      if (isLocked) return;
      setSelectedHint(preset.role);
      setError('');
    },
    [isLocked]
  );

  // Deterministic "crowd" — computed once, not on every render.
  const crowdDots = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i) => ({
        x: (i * 13.7) % 100,
        y: (i * 7.3) % 100,
        color: ['#ffdd57', '#ff6b6b', '#74c0fc', '#b2f2bb', '#ff922b'][i % 5],
        size: [2, 3, 2, 4, 2][i % 5],
        blink: i % 7 === 0,
      })),
    []
  );

  const minutes = String(Math.floor(((tick * TICK_INTERVAL_MS) / 60000) % 90)).padStart(2, '0');
  const seconds = String(Math.floor(((tick * TICK_INTERVAL_MS) / 1000) % 60)).padStart(2, '0');

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: '#0a1a0a',
      }}
    >
      <FieldBackground crowdDots={crowdDots} tick={tick} ballPos={ballPos} />
      <Scoreboard minutes={minutes} seconds={seconds} scoreFlash={scoreFlash} />

      {/* ===== MAIN LOGIN CARD ===== */}
      <div style={{ position: 'relative', zIndex: 20, width: '100%', maxWidth: '440px', margin: '0 16px' }}>
        <div
          style={{
            background: 'rgba(8, 15, 8, 0.94)',
            border: '3px solid #22c55e',
            boxShadow: '0 0 0 1px #0a1a0a, 0 0 0 3px #16a34a, 0 0 28px rgba(34,197,94,0.22)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <CardHeader />

          <div style={{ padding: '26px 28px' }}>
            {isDev && (
              <RoleSelector presets={DEV_ROLE_PRESETS} selected={selectedHint} onSelect={fillDemo} disabled={isLocked} />
            )}

            <form onSubmit={handleSubmit} noValidate>
              <FieldLabel htmlFor="login-username">Username</FieldLabel>
              <input
                id="login-username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username..."
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={MAX_FIELD_LENGTH}
                disabled={isLocked || loading}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                onBlur={(e) => (e.target.style.borderColor = '#16a34a')}
              />

              <div style={{ height: '16px' }} />

              <FieldLabel htmlFor="login-password">Password</FieldLabel>
              <input
                id="login-password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                maxLength={MAX_FIELD_LENGTH}
                disabled={isLocked || loading}
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = '#22c55e')}
                onBlur={(e) => (e.target.style.borderColor = '#16a34a')}
              />

              <div style={{ height: '20px' }} />

              {error && (
                <div role="alert" aria-live="polite" style={errorBoxStyle}>
                  ✗ {error}
                  {isLocked && lockoutSecondsLeft > 0 && ` (${lockoutSecondsLeft}s)`}
                </div>
              )}

              <button
                id="login-submit"
                type="submit"
                disabled={loading || isLocked}
                aria-busy={loading}
                style={{
                  width: '100%',
                  background:
                    loading || isLocked ? 'rgba(34,197,94,0.25)' : 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)',
                  border: '2px solid #4ade80',
                  color: '#fff',
                  padding: '13px',
                  cursor: loading || isLocked ? 'not-allowed' : 'pointer',
                  ...PIXEL_FONT,
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  boxShadow: loading || isLocked ? 'none' : '0 3px 0 #15803d, 0 0 16px rgba(34,197,94,0.3)',
                  transform: loading ? 'translateY(2px)' : 'translateY(0)',
                  transition: 'all 0.12s ease',
                }}
              >
                {isLocked ? `► LOCKED (${lockoutSecondsLeft}s)` : loading ? '► LOGGING IN...' : '► ENTER STADIUM'}
              </button>
            </form>

            <div
              style={{
                marginTop: '18px',
                textAlign: 'center',
                ...PIXEL_FONT,
                fontSize: '6px',
                color: '#4b5563',
                letterSpacing: '0.08em',
                lineHeight: 2,
              }}
            >
              ACCESS IS BY INVITATION ONLY.
              <br />
              CONTACT OPS TEAM FOR CREDENTIALS.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginTop: '12px' }}>
          {['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6'].map((c, i) => (
            <div
              key={c}
              style={{ width: '7px', height: '7px', background: c, opacity: tick % 10 === i ? 1 : 0.25, transition: 'opacity 0.1s' }}
            />
          ))}
        </div>
      </div>

      <Ticker />

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        #login-username::placeholder,
        #login-password::placeholder {
          color: #374151;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

// ---- Presentational subcomponents ---------------------------------------

const inputStyle = {
  width: '100%',
  background: 'rgba(0,0,0,0.5)',
  border: '2px solid #16a34a',
  color: '#f0fdf4',
  padding: '11px 13px',
  fontFamily: "'Press Start 2P', monospace",
  fontSize: '9px',
  outline: 'none',
  letterSpacing: '0.05em',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const errorBoxStyle = {
  background: 'rgba(239,68,68,0.12)',
  border: '2px solid #ef4444',
  padding: '10px 14px',
  marginBottom: '16px',
  ...PIXEL_FONT,
  fontSize: '7px',
  color: '#fca5a5',
  letterSpacing: '0.05em',
  lineHeight: 1.8,
};

function FieldLabel({ htmlFor, children }) {
  return (
    <label
      htmlFor={htmlFor}
      style={{ ...PIXEL_FONT, display: 'block', fontSize: '7px', color: '#4ade80', marginBottom: '8px', letterSpacing: '0.1em' }}
    >
      {children.toUpperCase()}:
    </label>
  );
}

function CardHeader() {
  return (
    <div
      style={{
        background: 'linear-gradient(90deg, #14532d, #166534, #14532d)',
        borderBottom: '3px solid #22c55e',
        padding: '20px 28px',
        textAlign: 'center',
      }}
    >
      <div style={{ ...PIXEL_FONT, fontSize: '7px', color: '#4ade80', letterSpacing: '0.15em', marginBottom: '10px' }}>
        ★ STADIUM OPERATIONS CENTER ★
      </div>
      <h1
        style={{
          ...PIXEL_FONT,
          fontSize: '18px',
          background: 'linear-gradient(180deg, #ffffff 0%, #86efac 50%, #22c55e 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          letterSpacing: '0.05em',
          lineHeight: 1.4,
        }}
      >
        GAMEFIELD
        <br />
        OPS
      </h1>
      <div style={{ ...PIXEL_FONT, fontSize: '6px', color: '#86efac', letterSpacing: '0.2em' }}>
        METLIFE STADIUM • FIFA WORLD CUP 2026
      </div>
    </div>
  );
}

function RoleSelector({ presets, selected, onSelect, disabled }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ ...PIXEL_FONT, fontSize: '6px', color: '#4ade80', marginBottom: '10px', letterSpacing: '0.1em' }}>
        DEV PRESET (LOCAL BUILD ONLY):
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        {presets.map((preset) => (
          <button
            key={preset.role}
            type="button"
            onClick={() => onSelect(preset)}
            disabled={disabled}
            aria-pressed={selected === preset.role}
            aria-label={`Fill demo credentials for ${preset.label}`}
            style={{
              flex: 1,
              background: selected === preset.role ? `${preset.color}22` : 'rgba(255,255,255,0.04)',
              border: `2px solid ${selected === preset.role ? preset.color : 'rgba(255,255,255,0.1)'}`,
              color: selected === preset.role ? preset.color : '#9ca3af',
              padding: '10px 6px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: selected === preset.role ? `0 0 10px ${preset.color}33` : 'none',
            }}
          >
            <span style={{ fontSize: '17px' }}>{preset.icon}</span>
            <span style={{ ...PIXEL_FONT, fontSize: '6px', letterSpacing: '0.05em' }}>{preset.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Scoreboard({ minutes, seconds, scoreFlash }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#1a0a00',
        border: `2px solid ${scoreFlash ? '#ff6b4a' : '#ff8c00'}`,
        padding: '8px 22px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        boxShadow: `0 0 14px ${scoreFlash ? 'rgba(255,107,74,0.5)' : 'rgba(255,140,0,0.3)'}`,
        zIndex: 10,
        transition: 'all 0.15s',
      }}
    >
      <span style={{ ...PIXEL_FONT, fontSize: '10px', color: '#ff8c00', letterSpacing: '0.05em' }}>GAMEFIELD OPS</span>
      <div style={{ background: '#000', padding: '4px 10px', border: '2px solid #ff8c00', ...PIXEL_FONT, fontSize: '11px', color: '#ffcc00', letterSpacing: '2px' }}>
        {minutes}:{seconds}
      </div>
      <span style={{ ...PIXEL_FONT, fontSize: '9px', color: '#ff9a8b' }}>FIFA 2026</span>
    </div>
  );
}

function FieldBackground({ crowdDots, tick, ballPos }) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #0d1f0d 0%, #133a13 30%, #1a5c1a 50%, #133a13 70%, #0d1f0d 100%)',
        }}
      />

      {Array.from({ length: 10 }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${i * 10}%`,
            top: 0,
            bottom: 0,
            width: '10%',
            background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
            pointerEvents: 'none',
          }}
        />
      ))}

      {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((pct) => (
        <div
          key={pct}
          style={{
            position: 'absolute',
            left: `${pct}%`,
            top: '5%',
            bottom: '5%',
            width: '2px',
            background: pct === 50 ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.14)',
            pointerEvents: 'none',
          }}
        />
      ))}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: '120px',
          height: '120px',
          border: '2px solid rgba(255,255,255,0.16)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'absolute', left: '0%', top: '30%', width: '6%', height: '40%', border: '2px solid rgba(255,255,255,0.16)', borderLeft: 'none', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: '0%', top: '30%', width: '6%', height: '40%', border: '2px solid rgba(255,255,255,0.16)', borderRight: 'none', pointerEvents: 'none' }} />

      {[{ top: '2%', left: '2%' }, { top: '2%', right: '2%' }, { bottom: '2%', left: '2%' }, { bottom: '2%', right: '2%' }].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            ...pos,
            width: '28px',
            height: '28px',
            background: '#fffde7',
            boxShadow: `0 0 32px 16px rgba(255,253,200,0.28)`,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            pointerEvents: 'none',
            opacity: 0.8 + Math.sin(tick * 0.06 + i) * 0.1,
            transition: 'opacity 0.3s',
          }}
        />
      ))}

      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        {crowdDots.map((d, i) => (
          <rect
            key={i}
            x={`${d.x}%`}
            y={`${d.y}%`}
            width={d.size}
            height={d.size}
            fill={d.color}
            opacity={d.blink ? (tick % 10 < 5 ? 0.85 : 0.28) : 0.5}
          />
        ))}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: `${ballPos.x}%`,
          top: `${ballPos.y}%`,
          transform: `translate(-50%, -50%) rotate(${tick * 5}deg)`,
          fontSize: '20px',
          filter: 'drop-shadow(0 0 5px rgba(255,255,255,0.4))',
          pointerEvents: 'none',
        }}
      >
        ⚽
      </div>
    </>
  );
}

function Ticker() {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: '#0a0a00',
        borderTop: '2px solid #ff8c00',
        padding: '8px 0',
        overflow: 'hidden',
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: 'max-content',
          animation: `ticker-scroll ${TICKER_DURATION_S}s linear infinite`,
        }}
      >
        <span style={{ ...PIXEL_FONT, fontSize: '8px', color: '#ffaa00', letterSpacing: '0.1em', paddingRight: '40px', whiteSpace: 'nowrap' }}>
          {TICKER_TEXT}
        </span>
        <span
          aria-hidden="true"
          style={{ ...PIXEL_FONT, fontSize: '8px', color: '#ffaa00', letterSpacing: '0.1em', paddingRight: '40px', whiteSpace: 'nowrap' }}
        >
          {TICKER_TEXT}
        </span>
      </div>
    </div>
  );
}