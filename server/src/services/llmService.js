import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { getCurrentState } from './telemetry.js';
import { retrieveSopContext } from './ragClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

let ai = null;
if (GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  } catch (err) {
    console.error('Error initializing GoogleGenAI SDK:', err.message);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined in the environment variables.');
}

// System prompts from the build spec
const FAN_TEMPLATE = `You are GameField, a friendly multilingual stadium assistant for the FIFA World Cup 2026.

Respond ONLY in this language: {lang}

STATIC KNOWLEDGE (from stadium guides):
{sop_context}

LIVE STADIUM CONDITIONS:
{live_state}

Rules:
- Be warm, concise, and practical.
- Never expose raw JSON or technical field names to the fan — translate data into plain language (e.g., "Gate A is quick right now" not "wait_time_mins: 4").
- If live conditions show an active incident near the fan's stated location, prioritize safety guidance over convenience.

Fan question: {query}`;

const VOLUNTEER_TEMPLATE = `You are GameField Staff Assist. Output short, actionable task instructions for a volunteer with no technical background.

STATIC PROCEDURES:
{sop_context}

LIVE CONDITIONS:
{live_state}

Rules:
- Max 3 sentences.
- Give a specific action, not analysis (e.g., "Direct fans from Gate B to Gate D. Wait time at B exceeds 30 minutes.").
- If there's an active incident, state the single most important safety action first.

Situation/query: {query}`;

const OPERATOR_TEMPLATE = `You are GameField Command, tactical AI for stadium operations control.

STANDARD OPERATING PROCEDURES:
{sop_context}

LIVE TELEMETRY:
{live_state}

Rules:
- Be direct, operational, and concise. No filler.
- If active_incidents is non-empty, ALWAYS cite the specific matching SOP before recommending action.
- If asked to draft a fan-facing alert, produce it in the requested language(s) as a ready-to-send message.

Operator query: {query}`;

/**
 * Fallback to direct HTTP post request if SDK fails or fails to load
 */
async function callGeminiRest(prompt, model = 'gemini-2.5-flash') {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing');
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: prompt }]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API HTTP Error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Unexpected empty response from Gemini REST API');
  }
  return text;
}

/**
 * Executes a LLM call with fused context.
 * @param {string} role User role ('fan', 'volunteer', 'operator').
 * @param {string} query User query.
 * @param {string} lang Output language (for 'fan' role, default 'en').
 * @returns {Promise<string>} The response text from the LLM.
 */
export async function getFusedChatResponse(role, query, lang = 'en') {
  // 1. Retrieve RAG context
  const sop_context = await retrieveSopContext(query, 3);

  // 2. Fetch live telemetry state
  const liveStateData = getCurrentState();
  const live_state = JSON.stringify(liveStateData, null, 2);

  // 3. Select template and populate
  let prompt = '';
  if (role === 'fan') {
    prompt = FAN_TEMPLATE
      .replace('{lang}', lang)
      .replace('{sop_context}', sop_context || 'No specific SOP context found.')
      .replace('{live_state}', live_state)
      .replace('{query}', query);
  } else if (role === 'volunteer') {
    prompt = VOLUNTEER_TEMPLATE
      .replace('{sop_context}', sop_context || 'No specific SOP context found.')
      .replace('{live_state}', live_state)
      .replace('{query}', query);
  } else if (role === 'operator') {
    prompt = OPERATOR_TEMPLATE
      .replace('{sop_context}', sop_context || 'No specific SOP context found.')
      .replace('{live_state}', live_state)
      .replace('{query}', query);
  } else {
    throw new Error(`Invalid role specified: ${role}`);
  }

  console.log(`[LLM Service] Querying role: ${role}. Fused context with ${sop_context ? 'RAG' : 'No RAG'}`);

  // 4. Run LLM query
  if (!GEMINI_API_KEY) {
    // Return mock response when API key is missing so development doesn't break
    return `[MOCK RESPONSE - API Key Missing] Fused Context Information:\n- RAG: ${sop_context ? 'Yes' : 'None'}\n- State: ${liveStateData.global_status}\n- Input: "${query}"\n\nThis is a mock answer. Please add GEMINI_API_KEY to your .env file to enable live AI responses.`;
  }

  try {
    if (ai) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text;
    } else {
      return await callGeminiRest(prompt);
    }
  } catch (error) {
    console.error('Error generating content from Gemini SDK. Attempting REST fallback...', error.message);
    try {
      return await callGeminiRest(prompt);
    } catch (restError) {
      console.error('REST fallback failed as well:', restError.message);
      throw restError;
    }
  }
}
