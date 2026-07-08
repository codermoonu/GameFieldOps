import React, { useState, useEffect } from 'react';
import ChatWindow from '../components/shared/ChatWindow';
import { ClipboardList, AlertCircle, CheckCircle2, Flame, Trash2, Clock } from 'lucide-react';

export default function VolunteerPage({ telemetry }) {
  const [tasks, setTasks] = useState([]);
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());

  // Generate dynamic tasks based on telemetry state
  useEffect(() => {
    if (!telemetry) return;

    const { gates, active_incidents, sustainability } = telemetry;
    const generatedTasks = [];

    // 1. Check for Active Incidents (High Priority)
    active_incidents.forEach(inc => {
      let instructions = '';
      if (inc.location.startsWith('Gate')) {
        const altGates = gates.filter(g => g.id !== inc.location).map(g => g.id).join(' or ');
        instructions = `CRITICAL: Gate ${inc.location.slice(-1)} closed due to a ${inc.type.replace('_', ' ')}. Reroute all incoming fans towards ${altGates}. Maintain clear access lanes for emergency responders.`;
      } else {
        instructions = `CRITICAL: Active ${inc.type.replace('_', ' ')} incident in ${inc.location}. Keep crowd away from the perimeter, maintain calm, and yield access to first-response teams.`;
      }
      
      generatedTasks.push({
        id: `inc-${inc.incident_id}`,
        title: 'Emergency Incident Response',
        text: instructions,
        priority: 'critical',
        icon: <Flame size={18} />
      });
    });

    // 2. Check for Gate Bottlenecks/Congestion (Medium Priority)
    gates.forEach(gate => {
      if (gate.status === 'incident') return; // Handled by emergency response

      if (gate.wait_time_mins > 25) {
        generatedTasks.push({
          id: `bottleneck-${gate.id}`,
          title: `Severe Queue Bottleneck - ${gate.id}`,
          text: `Wait times at ${gate.id} exceed 25 minutes (${gate.wait_time_mins} mins). Guide fans to auxiliary Gate D or alternate routes, and assist scanner staff.`,
          priority: 'high',
          icon: <Clock size={18} />
        });
      } else if (gate.wait_time_mins > 15) {
        generatedTasks.push({
          id: `congestion-${gate.id}`,
          title: `Heavy Traffic - ${gate.id}`,
          text: `Queue build-up detected at ${gate.id} (${gate.wait_time_mins} mins). Help organize queuing lanes and remind fans to have their digital tickets ready.`,
          priority: 'medium',
          icon: <Clock size={18} />
        });
      }
    });

    // 3. Check for Sustainability Recycling Bin Capacity (Low/Medium Priority)
    sustainability.recycling_bins_near_capacity.forEach(section => {
      generatedTasks.push({
        id: `bin-${section}`,
        title: 'Recycling Bin Capacity Alert',
        text: `Waste station at ${section} is over 80% capacity. Clear/tie off the bag and request collection from Stadium Environmental Services on radio Channel 4.`,
        priority: 'medium',
        icon: <Trash2 size={18} />
      });
    });

    // 4. Default Static Standard Tasks (always present)
    generatedTasks.push({
      id: 'static-sanitizer',
      title: 'Concourse Prep',
      text: 'Verify hand sanitizer units at Sections 100-115 concession areas are filled and functional.',
      priority: 'low',
      icon: <ClipboardList size={18} />
    });

    generatedTasks.push({
      id: 'static-accessibility',
      title: 'Accessibility Check',
      text: 'Do a walk-through of the main elevator boarding areas at Sections 114 and 127 to ensure ramp paths are free of obstructions.',
      priority: 'low',
      icon: <ClipboardList size={18} />
    });

    setTasks(generatedTasks);
  }, [telemetry]);

  const toggleTaskCompleted = (taskId) => {
    setCompletedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const getPriorityStyle = (priority, isCompleted) => {
    if (isCompleted) {
      return {
        borderLeft: '4px solid #6b7280',
        background: 'rgba(255,255,255,0.01)',
        opacity: 0.5
      };
    }
    
    switch (priority) {
      case 'critical':
        return {
          borderLeft: '4px solid var(--status-incident)',
          background: 'rgba(239, 68, 68, 0.04)',
          boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.05)',
          animation: 'borderFlash 1.5s infinite alternate'
        };
      case 'high':
        return {
          borderLeft: '4px solid var(--status-congested)',
          background: 'rgba(245, 158, 11, 0.02)'
        };
      case 'medium':
        return {
          borderLeft: '4px solid var(--primary)',
          background: 'rgba(59, 130, 246, 0.02)'
        };
      case 'low':
      default:
        return {
          borderLeft: '4px solid var(--text-muted)',
          background: 'transparent'
        };
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
      gap: '2rem',
      flex: 1,
      alignItems: 'stretch'
    }}>
      {/* Left Column: Tasks Board */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)' }}>Volunteer Task Board</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Live instructions compiled from active stadium data</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            <strong>{completedTaskIds.size}</strong> / {tasks.length} Completed
          </div>
        </div>

        {/* Actionable Instructions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          maxHeight: '520px',
          paddingRight: '0.25rem'
        }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No tasks currently compiled.
            </div>
          ) : (
            tasks.map(task => {
              const isCompleted = completedTaskIds.has(task.id);
              return (
                <div
                  key={task.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '1rem',
                    padding: '1rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.25s ease',
                    ...getPriorityStyle(task.priority, isCompleted)
                  }}
                >
                  <button
                    onClick={() => toggleTaskCompleted(task.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isCompleted ? 'var(--status-flowing)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      marginTop: '0.15rem',
                      padding: 0
                    }}
                  >
                    <CheckCircle2 size={20} fill={isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'transparent'} />
                  </button>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{
                        color: isCompleted ? 'var(--text-muted)' :
                               task.priority === 'critical' ? 'var(--status-incident)' :
                               task.priority === 'high' ? 'var(--status-congested)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        {task.icon}
                      </span>
                      <h4 style={{
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {task.title}
                      </h4>
                      {task.priority === 'critical' && !isCompleted && (
                        <span className="badge badge-incident" style={{ fontSize: '0.6rem', padding: '0.05rem 0.4rem', scale: '0.9' }}>
                          Critical
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: isCompleted ? 'var(--text-muted)' : 'var(--text-secondary)',
                      textDecoration: isCompleted ? 'line-through' : 'none'
                    }}>
                      {task.text}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Volunteer SOP Assistant Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '500px' }}>
        <ChatWindow role="volunteer" />
      </div>

      <style>{`
        @keyframes borderFlash {
          from { border-left-color: var(--status-incident); }
          to { border-left-color: #ff8a8a; }
        }
      `}</style>
    </div>
  );
}
