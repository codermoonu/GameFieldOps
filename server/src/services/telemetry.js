import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { queryRun, queryGet, queryAll } from '../db/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Store the state file in the workspace root
const STATE_FILE_PATH = path.join(__dirname, '..', '..', '..', 'stadium_state.json');

// Memory fallback to prevent crash if file read fails during simulator write
let memoryState = {
  timestamp: new Date().toISOString(),
  stadium: "MetLife Stadium",
  global_status: "active",
  gates: [
    { id: "Gate A", wait_time_mins: 4, status: "flowing", crowd_density: "low" },
    { id: "Gate B", wait_time_mins: 6, status: "flowing", crowd_density: "medium" }
  ],
  transport: {
    shuttle_status: "on_schedule",
    parking_lots: [
      { id: "Lot 3", capacity_pct: 62 },
      { id: "Lot 5", capacity_pct: 91 }
    ]
  },
  sustainability: {
    recycling_bins_near_capacity: [],
    water_stations_status: "normal"
  },
  active_incidents: []
};

// IO reference to emit events
let ioInstance = null;

export function initTelemetry(io) {
  ioInstance = io;
  // Initialize the state file if it doesn't exist
  if (!fs.existsSync(STATE_FILE_PATH)) {
    writeStateToFile(memoryState);
  } else {
    // Read initial state
    try {
      const content = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      memoryState = JSON.parse(content);
    } catch (err) {
      console.error('Error reading initial state file:', err.message);
    }
  }
}

function writeStateToFile(state) {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing state file:', err.message);
  }
}

export function getCurrentState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const content = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      memoryState = JSON.parse(content);
    }
  } catch (err) {
    // Under high frequency write, read might fail. Fall back to memoryState
    // console.warn('Temporary read collision for state file. Using memory state.');
  }
  return memoryState;
}

export async function triggerIncident(type, location, severity) {
  const currentState = getCurrentState();
  const incidentId = `INC-${Date.now().toString().slice(-4)}`;
  const timestamp = new Date().toISOString();

  const newIncident = {
    incident_id: incidentId,
    type,
    location,
    severity,
    triggered_at: timestamp
  };

  // Add to active incidents list
  currentState.active_incidents.push(newIncident);
  currentState.global_status = severity === 'high' ? 'disrupted' : 'active';

  // Modify the affected gates/transport based on incident location
  if (location.startsWith('Gate')) {
    currentState.gates = currentState.gates.map(gate => {
      if (gate.id.toLowerCase() === location.toLowerCase()) {
        return {
          ...gate,
          status: 'incident',
          wait_time_mins: 99,
          crowd_density: severity === 'high' ? 'extreme' : 'high'
        };
      }
      return gate;
    });
  } else if (location.startsWith('Lot')) {
    currentState.transport.parking_lots = currentState.transport.parking_lots.map(lot => {
      if (lot.id.toLowerCase() === location.toLowerCase()) {
        return { ...lot, capacity_pct: 100 }; // Incident blocks/fills it
      }
      return lot;
    });
  }

  // Update timestamp
  currentState.timestamp = timestamp;

  // Persist JSON state
  writeStateToFile(currentState);

  // Persist in SQLite
  try {
    await queryRun(
      `INSERT INTO incidents (incident_id, type, location, severity, status, triggered_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [incidentId, type, location, severity, 'active', timestamp]
    );
  } catch (err) {
    console.error('Failed to log incident to SQLite database:', err.message);
  }

  // Emit Socket.IO update
  if (ioInstance) {
    ioInstance.emit('telemetry:update', currentState);
  }

  return newIncident;
}

export async function resolveIncident(incidentId) {
  const currentState = getCurrentState();
  const timestamp = new Date().toISOString();

  // Find the incident to resolve
  const incidentIndex = currentState.active_incidents.findIndex(inc => inc.incident_id === incidentId);
  if (incidentIndex === -1) {
    return false;
  }

  const incident = currentState.active_incidents[incidentIndex];
  
  // Remove from active incidents list
  currentState.active_incidents.splice(incidentIndex, 1);

  // If no more high severity incidents, restore global status
  const hasHighActive = currentState.active_incidents.some(inc => inc.severity === 'high');
  currentState.global_status = hasHighActive ? 'disrupted' : 'active';

  // Restore the location affected
  const location = incident.location;
  if (location.startsWith('Gate')) {
    currentState.gates = currentState.gates.map(gate => {
      if (gate.id.toLowerCase() === location.toLowerCase()) {
        return {
          ...gate,
          status: 'flowing',
          wait_time_mins: 5, // reset to reasonable default
          crowd_density: 'medium'
        };
      }
      return gate;
    });
  }

  // Update timestamp
  currentState.timestamp = timestamp;

  // Persist JSON state
  writeStateToFile(currentState);

  // Update in SQLite
  try {
    await queryRun(
      `UPDATE incidents SET status = ?, resolved_at = ? WHERE incident_id = ?`,
      ['resolved', timestamp, incidentId]
    );
  } catch (err) {
    console.error('Failed to update incident in SQLite database:', err.message);
  }

  // Emit Socket.IO update
  if (ioInstance) {
    ioInstance.emit('telemetry:update', currentState);
  }

  return true;
}

export async function getAllIncidents() {
  try {
    return await queryAll(`SELECT * FROM incidents ORDER BY triggered_at DESC`);
  } catch (err) {
    console.error('Failed to fetch incidents from database:', err.message);
    return [];
  }
}
