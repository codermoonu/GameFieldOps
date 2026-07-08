import React, { useState, useEffect } from 'react';
import ChatWindow from '../components/shared/ChatWindow';
import { triggerIncident, resolveIncident, fetchIncidents } from '../lib/api';
import { ShieldAlert, ShieldCheck, Activity, Users, Send, AlertTriangle, RefreshCw } from 'lucide-react';

export default function OperatorPage({ telemetry, refreshTelemetry }) {
  const [incidentsHistory, setIncidentsHistory] = useState([]);
  
  // Incident Form state
  const [incType, setIncType] = useState('medical_emergency');
  const [incLocation, setIncLocation] = useState('Gate B');
  const [incSeverity, setIncSeverity] = useState('high');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Load database incident history
  const loadIncidentsHistory = async () => {
    try {
      const data = await fetchIncidents();
      setIncidentsHistory(data);
    } catch (err) {
      console.error('Failed to load incident history:', err);
    }
  };

  useEffect(() => {
    loadIncidentsHistory();
  }, [telemetry]); // Reload whenever telemetry updates (socket notifies change)

  const handleTrigger = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await triggerIncident(incType, incLocation, incSeverity);
      // Success will trigger telemetry state update via Socket.IO, which reloads history
      if (refreshTelemetry) refreshTelemetry();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (incidentId) => {
    try {
      await resolveIncident(incidentId);
      if (refreshTelemetry) refreshTelemetry();
    } catch (err) {
      alert(`Failed to resolve incident: ${err.message}`);
    }
  };

  if (!telemetry) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading Operator Control telemetry...</div>;
  }

  const { global_status, gates, transport, active_incidents } = telemetry;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
      gap: '2rem',
      flex: 1,
      alignItems: 'stretch'
    }}>
      {/* LEFT COLUMN: Operations Console */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Status Dashboard Panel */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Stadium Control Console</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Global Status:</span>
              <span className={`badge ${global_status === 'active' ? 'badge-flowing' : 'badge-bottleneck'}`}>
                {global_status}
              </span>
            </div>
          </div>

          {/* Telemetry Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            {gates.map(gate => (
              <div key={gate.id} style={{
                padding: '0.75rem 1rem',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{gate.id}</span>
                  <span className={`badge ${
                    gate.status === 'flowing' ? 'badge-flowing' :
                    gate.status === 'congested' ? 'badge-congested' :
                    gate.status === 'bottleneck' ? 'badge-bottleneck' : 'badge-incident'
                  }`} style={{ scale: '0.8', transformOrigin: 'right' }}>
                    {gate.status}
                  </span>
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginTop: '0.2rem' }}>
                  <span>{gate.wait_time_mins}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>mins queue</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Density: <strong style={{ textTransform: 'capitalize' }}>{gate.crowd_density}</strong>
                </div>
              </div>
            ))}
          </div>

          {/* Transport Capacity */}
          <div style={{
            padding: '1rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Transport Telemetry</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {transport.parking_lots.map(lot => (
                <div key={lot.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span>{lot.id} Capacity:</span>
                    <strong>{lot.capacity_pct}%</strong>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${lot.capacity_pct}%`,
                      height: '100%',
                      background: lot.capacity_pct > 85 ? 'var(--status-incident)' : 'var(--primary)',
                      borderRadius: '3px'
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trigger/Resolve Incidents Console */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontFamily: 'var(--font-display)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Activity size={18} style={{ color: 'var(--status-incident)' }} />
            Active Triage & Mock Simulator
          </h3>

          {/* List of Active Incidents */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Incidents</h4>
            {active_incidents.length === 0 ? (
              <div style={{
                padding: '0.85rem',
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                textAlign: 'center',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}>
                <ShieldCheck size={16} style={{ color: 'var(--status-flowing)' }} />
                No active incidents reported. All systems normal.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {active_incidents.map(inc => (
                  <div key={inc.incident_id} style={{
                    padding: '0.85rem 1rem',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    background: 'rgba(239, 68, 68, 0.04)',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{inc.incident_id}</span>
                        <span className="badge badge-incident" style={{ scale: '0.75', transformOrigin: 'left' }}>{inc.severity}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ textTransform: 'capitalize' }}>{inc.type.replace('_', ' ')}</strong> at <strong>{inc.location}</strong>
                      </p>
                    </div>
                    <button
                      onClick={() => handleResolve(inc.incident_id)}
                      className="btn-primary"
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        background: 'var(--status-flowing)',
                        boxShadow: 'none'
                      }}
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Trigger Incident Form */}
          <form onSubmit={handleTrigger} style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1rem'
          }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Trigger Mock Incident (Demo)</h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Incident Type</label>
                <select value={incType} onChange={(e) => setIncType(e.target.value)} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
                  <option value="medical_emergency" style={{ background: '#12141d' }}>Medical Emergency</option>
                  <option value="fire_alarm" style={{ background: '#12141d' }}>Fire Alarm</option>
                  <option value="suspicious_package" style={{ background: '#12141d' }}>Suspicious Package</option>
                  <option value="crowd_bottleneck" style={{ background: '#12141d' }}>Crowd Bottleneck</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Location</label>
                <select value={incLocation} onChange={(e) => setIncLocation(e.target.value)} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
                  <option value="Gate A" style={{ background: '#12141d' }}>Gate A</option>
                  <option value="Gate B" style={{ background: '#12141d' }}>Gate B</option>
                  <option value="Lot 3" style={{ background: '#12141d' }}>Lot 3</option>
                  <option value="Lot 5" style={{ background: '#12141d' }}>Lot 5</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Severity</label>
                <select value={incSeverity} onChange={(e) => setIncSeverity(e.target.value)} style={{ padding: '0.4rem 0.5rem', fontSize: '0.8rem' }}>
                  <option value="high" style={{ background: '#12141d' }}>High</option>
                  <option value="medium" style={{ background: '#12141d' }}>Medium</option>
                </select>
              </div>
            </div>

            {error && <div style={{ fontSize: '0.75rem', color: 'var(--status-incident)', marginBottom: '0.5rem' }}>{error}</div>}

            <button
              type="submit"
              className="btn-danger"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <AlertTriangle size={14} />
              {submitting ? 'Triggering...' : 'Trigger Incident State'}
            </button>
          </form>
        </div>

        {/* Database Incident History Log */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, maxHeight: '250px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Database Log History (SQLite)</h4>
            <button 
              onClick={loadIncidentsHistory} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <RefreshCw size={12} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            {incidentsHistory.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No incident logs found.</div>
            ) : (
              incidentsHistory.map(log => (
                <div key={log.incident_id} style={{
                  padding: '0.5rem 0.75rem',
                  borderBottom: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{log.incident_id}</strong> - <span style={{ textTransform: 'capitalize' }}>{log.type.replace('_', ' ')}</span> ({log.location})
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Triggered: {new Date(log.triggered_at).toLocaleTimeString()} 
                      {log.resolved_at && ` | Resolved: ${new Date(log.resolved_at).toLocaleTimeString()}`}
                    </div>
                  </div>
                  <span className={`badge`} style={{
                    scale: '0.8',
                    color: log.status === 'active' ? 'var(--status-incident)' : 'var(--status-flowing)',
                    background: log.status === 'active' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                    border: 'none',
                    animation: 'none'
                  }}>
                    {log.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Operator Chat Engine */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '600px' }}>
        <ChatWindow role="operator" />
      </div>
    </div>
  );
}
