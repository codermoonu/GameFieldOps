import express from 'express';
import { getFusedChatResponse } from '../services/llmService.js';

const router = express.Router();

router.post('/chat', async (req, res) => {
  const { role, query, lang } = req.body;

  if (!role || !query) {
    return res.status(400).json({ error: 'Missing role or query in request body' });
  }

  const allowedRoles = ['fan', 'volunteer', 'operator'];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
  }

  try {
    const textResponse = await getFusedChatResponse(role, query, lang || 'en');
    res.json({ response: textResponse });
  } catch (error) {
    console.error('Chat routing error:', error);
    res.status(500).json({ error: 'Failed to process chat query', details: error.message });
  }
});

export default router;
