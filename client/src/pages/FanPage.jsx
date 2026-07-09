import React, { useState, useEffect } from 'react';
import StadiumMap from '../components/fan/StadiumMap';
import ChatWindow from '../components/shared/ChatWindow';
import { Calendar, Compass, ShieldCheck } from 'lucide-react';

/**
 * FanPage
 *
 * Same visual system as LoginPage: dark green stadium backdrop, pixel
 * display font for headers/labels, bordered "arcade panel" cards with a
 * soft green glow. Body copy stays in a normal readable font so the page
 * works as a daily-use dashboard, not just a splash screen.
 */

// ---- Shared theme tokens (mirrors LoginPage) ----------------------------

const PIXEL_FONT = { fontFamily: "'Press Start 2P', monospace" };

const COLORS = {
  bg: '#0a1a0a',
  panelBg: 'rgba(8, 15, 8, 0.92)',
  border: '#16a34a',
  borderBright: '#22c55e',
  green: '#22c55e',
  greenSoft: '#4ade80',
  orange: '#ff8c00',
  textSecondary: '#9ca3af',
};

const INFO_CARDS = [
  {
    icon: Compass,
    color: '#3b82f6',
    title: 'Gate Navigation',
    body: 'Check gate wait times on the map. Gates A and B support full wheelchair access.',
  },
  {
    icon: Calendar,
    color: '#8b5cf6',
    title: 'Transit & Shuttles',
    body: 'Shuttle Loop runs clockwise every 10 mins. Train station is right next to Gate C.',
  },
  {
    icon: ShieldCheck,
    color: '#22c55e',
    title: 'Stadium Safety',
    body: 'Medical staging centers are placed at all main gate quadrants. First-aid stands are marked.',
  },
];

// ---- Component ------------------------------------------------------------

export default function FanPage({ telemetry }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.75rem',
        flex: 1,
        padding: '1.5rem',
        background: COLORS.bg,
        minHeight: '100%',
      }}
    >
      <PageHeader stadiumName={telemetry?.stadium} />

      {/* Map + Chat */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
          gap: '1.75rem',
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        <Panel title="LIVE STADIUM MAP" accent={COLORS.green}>
          <StadiumMap telemetry={telemetry} />
        </Panel>

        <Panel title="ASK GAMEFIELD" accent={COLORS.orange}>
          <ChatWindow role="fan" />
        </Panel>
      </div>

      {/* Fan Information Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.1rem',
        }}
      >
        {INFO_CARDS.map((card) => (
          <InfoCard key={card.title} {...card} />
        ))}
      </div>

      <style>{`
        @keyframes fan-live-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
        }
      `}</style>
    </div>
  );
}

// ---- Subcomponents ---------------------------------------------------------

function PageHeader({ stadiumName }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        background: '#1a0a00',
        border: `2px solid ${COLORS.orange}`,
        padding: '0.85rem 1.25rem',
        boxShadow: '0 0 14px rgba(255,140,0,0.22)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <span style={{ ...PIXEL_FONT, fontSize: '10px', color: COLORS.orange, letterSpacing: '0.05em' }}>
          GAMEFIELD OPS
        </span>
        <span style={{ ...PIXEL_FONT, fontSize: '8px', color: '#ffcc00', letterSpacing: '0.08em' }}>
          · FAN VIEW
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ ...PIXEL_FONT, fontSize: '7px', color: COLORS.textSecondary, letterSpacing: '0.05em' }}>
          {stadiumName ? stadiumName.toUpperCase() : 'FIFA WORLD CUP 2026'}
        </span>
        <span
          aria-hidden="true"
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: COLORS.green,
            boxShadow: `0 0 6px ${COLORS.green}`,
            animation: 'fan-live-pulse 1.6s ease-in-out infinite',
          }}
        />
        <span style={{ ...PIXEL_FONT, fontSize: '6px', color: COLORS.greenSoft, letterSpacing: '0.1em' }}>LIVE</span>
      </div>
    </div>
  );
}

function Panel({ title, accent, children }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '500px',
        background: COLORS.panelBg,
        border: `2px solid ${COLORS.border}`,
        boxShadow: '0 0 0 1px #0a1a0a, 0 0 20px rgba(34,197,94,0.14)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '0.65rem 1rem',
          borderBottom: `2px solid ${accent}`,
          background: 'linear-gradient(90deg, #14532d, #166534, #14532d)',
        }}
      >
        <span style={{ ...PIXEL_FONT, fontSize: '7px', color: COLORS.greenSoft, letterSpacing: '0.1em' }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>{children}</div>
    </div>
  );
}

function InfoCard({ icon: Icon, color, title, body }) {
  return (
    <div
      style={{
        padding: '1.1rem',
        display: 'flex',
        gap: '0.9rem',
        alignItems: 'flex-start',
        background: COLORS.panelBg,
        border: `2px solid ${COLORS.border}`,
        boxShadow: '0 0 14px rgba(34,197,94,0.1)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '0.55rem',
          background: `${color}1a`,
          color,
          border: `1px solid ${color}44`,
        }}
      >
        <Icon size={22} />
      </div>
      <div>
        <h4
          style={{
            ...PIXEL_FONT,
            fontSize: '7px',
            color: COLORS.greenSoft,
            marginBottom: '0.5rem',
            letterSpacing: '0.05em',
            lineHeight: 1.6,
          }}
        >
          {title.toUpperCase()}
        </h4>
        <p style={{ fontSize: '0.82rem', color: COLORS.textSecondary, lineHeight: 1.5, margin: 0 }}>{body}</p>
      </div>
    </div>
  );
}