const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function sendChatMessage(role, query, lang = 'en') {
  const response = await fetch(`${API_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role, query, lang }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to send chat message');
  }

  return response.json();
}

export async function triggerIncident(type, location, severity) {
  const response = await fetch(`${API_URL}/incident/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, location, severity }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to trigger incident');
  }

  return response.json();
}

export async function resolveIncident(incident_id) {
  const response = await fetch(`${API_URL}/incident/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ incident_id }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to resolve incident');
  }

  return response.json();
}

export async function fetchIncidents() {
  const response = await fetch(`${API_URL}/incident`);
  if (!response.ok) {
    throw new Error('Failed to fetch incident log history');
  }
  return response.json();
}

export async function fetchTelemetry() {
  const response = await fetch(`${API_URL}/telemetry`);
  if (!response.ok) {
    throw new Error('Failed to fetch live telemetry');
  }
  return response.json();
}
