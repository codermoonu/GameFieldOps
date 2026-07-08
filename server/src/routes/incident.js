import express from 'express';
import { triggerIncident, resolveIncident, getAllIncidents } from '../services/telemetry.js';

const router = express.Router();

// Get all incidents (history)
router.get('/', async (req, res) => {
  try {
    const list = await getAllIncidents();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incident log history', details: error.message });
  }
});

// Trigger a new incident
router.post('/trigger', async (req, res) => {
  const { type, location, severity } = req.body;

  if (!type || !location || !severity) {
    return res.status(400).json({ error: 'Missing type, location, or severity in request body' });
  }

  try {
    const newIncident = await triggerIncident(type, location, severity);
    res.json({ message: 'Incident successfully triggered', incident: newIncident });
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger incident', details: error.message });
  }
});

// Resolve an incident
router.post('/resolve', async (req, res) => {
  const { incident_id } = req.body;

  if (!incident_id) {
    return res.status(400).json({ error: 'Missing incident_id in request body' });
  }

  try {
    const success = await resolveIncident(incident_id);
    if (success) {
      res.json({ message: `Incident ${incident_id} successfully marked as resolved` });
    } else {
      res.status(404).json({ error: `Incident ${incident_id} not found in active list` });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to resolve incident', details: error.message });
  }
});

export default router;
