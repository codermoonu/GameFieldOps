import React from 'react';
import StadiumMap from '../components/fan/StadiumMap';
import ChatWindow from '../components/shared/ChatWindow';
import { Calendar, Compass, ShieldCheck } from 'lucide-react';

export default function FanPage({ telemetry }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '2rem',
      flex: 1,
      alignItems: 'stretch'
    }}>
      {/* Responsive layout: Grid that switches to 2 columns on desktop */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '2rem',
        alignItems: 'stretch',
        width: '100%'
      }}>
        {/* Left Panel - Live Stadium Map */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
          <StadiumMap telemetry={telemetry} />
        </div>

        {/* Right Panel - Chat Assistant */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
          <ChatWindow role="fan" />
        </div>
      </div>

      {/* Fan Information Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginTop: '1rem'
      }}>
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '8px' }}>
            <Compass size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem' }}>Gate Navigation</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Check gate wait times on the map. Gates A and B support full wheelchair access.
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent)', borderRadius: '8px' }}>
            <Calendar size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem' }}>Transit & Shuttles</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Shuttle Loop runs clockwise every 10 mins. Train station is right next to Gate C.
            </p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-flowing)', borderRadius: '8px' }}>
            <ShieldCheck size={24} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.2rem' }}>Stadium Safety</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              Medical staging centers are placed at all main gate quadrants. First-aid stands are marked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
