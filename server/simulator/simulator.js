import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to stadium_state.json at the workspace root
const STATE_FILE_PATH = path.join(__dirname, '..', '..', 'stadium_state.json');

const defaultState = {
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

function readState() {
  try {
    if (fs.existsSync(STATE_FILE_PATH)) {
      const data = fs.readFileSync(STATE_FILE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    // Silent catch, fall back to default
  }
  return JSON.parse(JSON.stringify(defaultState));
}

function writeState(state) {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('[Simulator] Error writing state file:', err.message);
  }
}

function simulate() {
  const state = readState();
  state.timestamp = new Date().toISOString();

  // 1. Simulate gates (fluctuate wait time unless gate is in incident state)
  state.gates = state.gates.map(gate => {
    if (gate.status === 'incident') {
      return gate; // Keep incident state intact
    }
    
    // Fluctuate wait time by -2 to +2 mins
    let change = Math.floor(Math.random() * 5) - 2;
    let newWaitTime = Math.max(2, Math.min(25, gate.wait_time_mins + change));
    
    // Update crowd density based on wait time
    let density = 'low';
    if (newWaitTime > 15) density = 'high';
    else if (newWaitTime > 8) density = 'medium';
    
    return {
      ...gate,
      wait_time_mins: newWaitTime,
      crowd_density: density
    };
  });

  // If there is an active incident at a gate, simulate crowding at the other gates due to redirection
  const hasActiveGateIncident = state.active_incidents.some(inc => inc.location.startsWith('Gate'));
  if (hasActiveGateIncident) {
    state.gates = state.gates.map(gate => {
      if (gate.status !== 'incident') {
        // Increase load on open gates
        let newWaitTime = Math.min(30, gate.wait_time_mins + 1);
        return {
          ...gate,
          wait_time_mins: newWaitTime,
          crowd_density: newWaitTime > 20 ? 'high' : 'medium'
        };
      }
      return gate;
    });
  }

  // 2. Simulate parking lots
  state.transport.parking_lots = state.transport.parking_lots.map(lot => {
    // If lot capacity is already 100% (or blocked by incident), leave it
    const isUnderIncident = state.active_incidents.some(inc => inc.location === lot.id);
    if (isUnderIncident || lot.capacity_pct >= 99) {
      return lot;
    }
    
    // Capacities rise slowly over time during event build-up
    let change = Math.random() > 0.3 ? 1 : -1;
    let newCap = Math.max(40, Math.min(95, lot.capacity_pct + change));
    return {
      ...lot,
      capacity_pct: newCap
    };
  });

  // 3. Simulate sustainability (randomly trigger bin near capacity)
  if (Math.random() > 0.85) {
    const bins = ['Section 112', 'Section 124', 'Section 140', 'Section 308'];
    const selectedBin = bins[Math.floor(Math.random() * bins.length)];
    if (!state.sustainability.recycling_bins_near_capacity.includes(selectedBin)) {
      state.sustainability.recycling_bins_near_capacity.push(selectedBin);
      console.log(`[Simulator] Sustainability Alert: Bin near capacity at ${selectedBin}`);
    }
  } else if (Math.random() > 0.90 && state.sustainability.recycling_bins_near_capacity.length > 0) {
    // Staff clears a bin randomly
    const cleared = state.sustainability.recycling_bins_near_capacity.pop();
    console.log(`[Simulator] Sustainability Resolution: Bin cleared at ${cleared}`);
  }

  writeState(state);
  console.log(`[Simulator] Live Telemetry state updated at ${state.timestamp}`);
}

console.log('[Simulator] Starting MetLife Stadium live simulator...');
// Ingest default state first
if (!fs.existsSync(STATE_FILE_PATH)) {
  writeState(defaultState);
}

// Run every 5 seconds
setInterval(simulate, 5000);
