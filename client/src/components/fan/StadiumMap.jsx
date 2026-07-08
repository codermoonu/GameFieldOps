import React, { useState } from 'react';
import { ShieldAlert, Users, Clock, Info } from 'lucide-react';

export default function StadiumMap({ telemetry }) {
  const [hoveredElement, setHoveredElement] = useState(null);

  if (!telemetry) {
    return (
      <div className="glass-panel" style={{
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '400px',
        color: 'var(--text-secondary)'
      }}>
        Loading stadium map telemetry...
      </div>
    );
  }

  const { gates, transport, active_incidents } = telemetry;

  // Helper to find gate info in live state
  const getGateInfo = (gateId) => {
    // Standard gates in state are Gate A and Gate B
    const match = gates.find(g => g.id.toLowerCase() === gateId.toLowerCase());
    if (match) return match;
    
    // Fallback info for simulated Gate C and Gate D if they are not in the JSON schema yet
    if (gateId.toLowerCase() === 'gate c') {
      return { id: 'Gate C', wait_time_mins: 8, status: 'flowing', crowd_density: 'medium' };
    }
    if (gateId.toLowerCase() === 'gate d') {
      // Check if D is active/open as auxiliary due to a bottleneck
      const activeIncidentsExist = active_incidents.length > 0;
      const bottleneckExist = gates.some(g => g.wait_time_mins > 25);
      const isOpened = activeIncidentsExist || bottleneckExist;
      return { 
        id: 'Gate D', 
        wait_time_mins: isOpened ? 3 : 0, 
        status: isOpened ? 'flowing' : 'closed', 
        crowd_density: isOpened ? 'low' : 'none' 
      };
    }
    return { id: gateId, wait_time_mins: 0, status: 'unknown', crowd_density: 'none' };
  };

  // Helper to find lot info in live state
  const getLotInfo = (lotId) => {
    const match = transport.parking_lots.find(l => l.id.toLowerCase() === lotId.toLowerCase());
    if (match) return match;
    if (lotId.toLowerCase() === 'lot 1') {
      return { id: 'Lot 1', capacity_pct: 45 };
    }
    return { id: lotId, capacity_pct: 0 };
  };

  // Color helper based on status
  const getStatusColor = (status) => {
    switch (status) {
      case 'flowing': return 'var(--status-flowing)';
      case 'congested': return 'var(--status-congested)';
      case 'bottleneck': return 'var(--status-bottleneck)';
      case 'incident': return 'var(--status-incident)';
      case 'closed': return '#4b5563'; // gray
      default: return 'var(--text-muted)';
    }
  };

  const getStatusGlow = (status) => {
    switch (status) {
      case 'flowing': return 'var(--status-flowing-glow)';
      case 'congested': return 'var(--status-congested-glow)';
      case 'bottleneck': return 'var(--status-bottleneck-glow)';
      case 'incident': return 'var(--status-incident-glow)';
      default: return 'transparent';
    }
  };

  // Handle element mouse actions
  const handleMouseEnter = (type, data) => {
    setHoveredElement({ type, ...data });
  };

  const handleMouseLeave = () => {
    setHoveredElement(null);
  };

  // Extract gate variables
  const gateA = getGateInfo('Gate A');
  const gateB = getGateInfo('Gate B');
  const gateC = getGateInfo('Gate C');
  const gateD = getGateInfo('Gate D');

  // Extract lot variables
  const lot3 = getLotInfo('Lot 3');
  const lot5 = getLotInfo('Lot 5');
  const lot1 = getLotInfo('Lot 1');

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', position: 'relative', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Interactive Stadium Map</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hover elements for real-time status details</span>
        </div>
        {active_incidents.length > 0 && (
          <div className="badge badge-incident" style={{ gap: '0.3rem' }}>
            <ShieldAlert size={12} />
            {active_incidents.length} Active Incident{active_incidents.length > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Map SVG container */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg
          viewBox="0 0 500 450"
          width="100%"
          height="100%"
          style={{ maxWidth: '480px', background: 'transparent' }}
        >
          {/* Defs for gradients/filters */}
          <defs>
            <radialGradient id="fieldGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Outer Ring / Shuttle Route */}
          <rect x="10" y="10" width="480" height="430" rx="20" fill="rgba(255,255,255,0.005)" stroke="rgba(255,255,255,0.02)" strokeWidth="2" />
          <path d="M 60 225 A 190 170 0 1 1 440 225 A 190 170 0 1 1 60 225" fill="none" stroke="rgba(59, 130, 246, 0.15)" strokeWidth="3" strokeDasharray="6,4" />

          {/* Transit Depot line */}
          <line x1="410" y1="225" x2="470" y2="225" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="2" strokeDasharray="3,3" />

          {/* Main Stadium Outer Bowl */}
          <ellipse cx="250" cy="225" rx="140" ry="110" fill="url(#fieldGrad)" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <ellipse cx="250" cy="225" rx="120" ry="90" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          
          {/* Seating Grid/Slices */}
          <line x1="250" y1="115" x2="250" y2="335" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="110" y1="225" x2="390" y2="225" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="151" y1="147" x2="349" y2="303" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          <line x1="151" y1="303" x2="349" y2="147" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

          {/* Seating Ring Inner */}
          <ellipse cx="250" cy="225" rx="90" ry="65" fill="#0f111a" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

          {/* Pitch Field (Center) */}
          <rect x="210" y="195" width="80" height="60" rx="3" fill="#131c30" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="2" />
          <ellipse cx="250" cy="225" rx="12" ry="12" fill="none" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" />
          <line x1="250" y1="195" x2="250" y2="255" stroke="rgba(59, 130, 246, 0.2)" strokeWidth="1.5" />

          {/* GATES (Interactive buttons) */}
          {/* Gate B (North Gate) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('gate', gateB)}
            onMouseLeave={handleMouseLeave}
          >
            {/* Visual glow indicator */}
            <circle cx="250" cy="95" r="16" fill={getStatusGlow(gateB.status)} filter={gateB.status !== 'flowing' ? 'url(#glow)' : ''} />
            <circle cx="250" cy="95" r="11" fill="#0f111a" stroke={getStatusColor(gateB.status)} strokeWidth="3" />
            <text x="250" y="99" fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">B</text>
          </g>

          {/* Gate D (South Gate) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('gate', gateD)}
            onMouseLeave={handleMouseLeave}
          >
            <circle cx="250" cy="355" r="16" fill={getStatusGlow(gateD.status)} filter={gateD.status === 'incident' ? 'url(#glow)' : ''} />
            <circle cx="250" cy="355" r="11" fill="#0f111a" stroke={getStatusColor(gateD.status)} strokeWidth="3" />
            <text x="250" y="359" fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">D</text>
          </g>

          {/* Gate A (West Gate) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('gate', gateA)}
            onMouseLeave={handleMouseLeave}
          >
            <circle cx="95" cy="225" r="16" fill={getStatusGlow(gateA.status)} filter={gateA.status !== 'flowing' ? 'url(#glow)' : ''} />
            <circle cx="95" cy="225" r="11" fill="#0f111a" stroke={getStatusColor(gateA.status)} strokeWidth="3" />
            <text x="95" y="229" fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">A</text>
          </g>

          {/* Gate C (East Gate / Rail Access) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('gate', gateC)}
            onMouseLeave={handleMouseLeave}
          >
            <circle cx="405" cy="225" r="16" fill={getStatusGlow(gateC.status)} />
            <circle cx="405" cy="225" r="11" fill="#0f111a" stroke={getStatusColor(gateC.status)} strokeWidth="3" />
            <text x="405" y="229" fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">C</text>
          </g>

          {/* PARKING LOTS / TRANSPORTS */}
          {/* Lot 3 (West General / Rideshare) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('lot', lot3)}
            onMouseLeave={handleMouseLeave}
          >
            <rect x="25" y="205" width="35" height="40" rx="6" fill="#131520" stroke="rgba(59, 130, 246, 0.4)" strokeWidth="1.5" />
            <text x="42.5" y="224" fill="var(--text-secondary)" fontSize="9" fontWeight="bold" textAnchor="middle">LOT</text>
            <text x="42.5" y="237" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">3</text>
          </g>

          {/* Lot 5 (North Shuttle Bus Depot) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('lot', lot5)}
            onMouseLeave={handleMouseLeave}
          >
            <rect x="232" y="20" width="36" height="40" rx="6" fill="#131520" stroke="rgba(139, 92, 246, 0.4)" strokeWidth="1.5" />
            <text x="250" y="39" fill="var(--text-secondary)" fontSize="9" fontWeight="bold" textAnchor="middle">LOT</text>
            <text x="250" y="52" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">5</text>
          </g>

          {/* Lot 1 (South ADA parking) */}
          <g 
            className="map-node"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => handleMouseEnter('lot', lot1)}
            onMouseLeave={handleMouseLeave}
          >
            <rect x="232" y="390" width="36" height="40" rx="6" fill="#131520" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="1.5" />
            <text x="250" y="409" fill="var(--text-secondary)" fontSize="9" fontWeight="bold" textAnchor="middle">LOT</text>
            <text x="250" y="422" fill="var(--text-primary)" fontSize="11" fontWeight="bold" textAnchor="middle">1</text>
          </g>

          {/* Train Link icon (East Station) */}
          <g 
            onMouseEnter={() => handleMouseEnter('transit', { id: 'MetLife Station', desc: 'Direct connection to Secaucus Junction. Trains arriving every 10 mins.' })}
            onMouseLeave={handleMouseLeave}
            style={{ cursor: 'pointer' }}
          >
            <circle cx="470" cy="225" r="14" fill="#1e1b4b" stroke="var(--accent)" strokeWidth="1.5" />
            <text x="470" y="229" fill="var(--text-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">🚆</text>
          </g>
        </svg>

        {/* Legend Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          fontSize: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          background: 'rgba(10, 11, 16, 0.8)',
          padding: '0.5rem',
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-flowing)' }}></span>
            <span>Flowing (0-15 mins)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-congested)' }}></span>
            <span>Congested (16-30 mins)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-bottleneck)' }}></span>
            <span>Bottleneck (&gt;30 mins)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--status-incident)', animation: 'pulse-incident 1s infinite' }}></span>
            <span>Incident / Emergency</span>
          </div>
        </div>
      </div>

      {/* Floating Tooltip Box */}
      {hoveredElement && (
        <div style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '240px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          boxShadow: 'var(--shadow-lg)',
          pointerEvents: 'none',
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.15s ease-out forwards'
        }}>
          {hoveredElement.type === 'gate' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{hoveredElement.id}</span>
                <span className={`badge ${
                  hoveredElement.status === 'flowing' ? 'badge-flowing' :
                  hoveredElement.status === 'congested' ? 'badge-congested' :
                  hoveredElement.status === 'bottleneck' ? 'badge-bottleneck' : 'badge-incident'
                }`} style={{ scale: '0.85', transformOrigin: 'right' }}>
                  {hoveredElement.status}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {hoveredElement.status !== 'closed' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={12} />
                    <span>Wait Time: <strong>{hoveredElement.wait_time_mins} mins</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Users size={12} />
                  <span>Crowd Density: <strong style={{ textTransform: 'capitalize' }}>{hoveredElement.crowd_density}</strong></span>
                </div>
              </div>
            </div>
          )}

          {hoveredElement.type === 'lot' && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.5rem' }}>{hoveredElement.id}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span>Capacity Occupied:</span>
                  <strong style={{ color: hoveredElement.capacity_pct > 85 ? 'var(--status-incident)' : 'var(--text-primary)' }}>
                    {hoveredElement.capacity_pct}%
                  </strong>
                </div>
                {/* Visual Progress Bar */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${hoveredElement.capacity_pct}%`,
                    height: '100%',
                    background: hoveredElement.capacity_pct > 85 ? 'var(--status-incident)' : 'var(--primary)',
                    borderRadius: '3px'
                  }}></div>
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  {hoveredElement.id === 'Lot 3' ? '🚕 Rideshare pickup/dropoff zone' :
                   hoveredElement.id === 'Lot 5' ? '🚌 Shuttle bus terminal zone' : '♿ Accessible placard parking only'}
                </div>
              </div>
            </div>
          )}

          {hoveredElement.type === 'transit' && (
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Info size={14} style={{ color: 'var(--accent)' }} />
                {hoveredElement.id}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {hoveredElement.desc}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CSS style block for SVG hovers and tooltips */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
        .map-node:hover ellipse,
        .map-node:hover circle,
        .map-node:hover rect {
          stroke-width: 4px;
          filter: brightness(1.2);
          transition: all 0.15s ease-in-out;
        }
      `}</style>
    </div>
  );
}
