# GameField Ops — Build Spec

---

## 1. What We're Building

A web app with **3 role-based interfaces sharing one AI backend**:

1. **Fan** — chat + map. Answers questions on navigation, accessibility, transport, using live simulated stadium data + static knowledge docs. Responds in the user's language.
2. **Volunteer/Staff** — simple task/checklist view. Shows short, actionable instructions generated from the same live event (e.g., "redirect fans from Gate B to Gate D").
3. **Operator** — command console. Live telemetry dashboard + chat. Handles incident triage, SOP retrieval, and drafts multilingual alerts. Has a manual "Trigger Incident" button for demo purposes.

All three call the same backend AI core, which fuses: (a) retrieved knowledge-doc chunks (RAG), (b) live simulated telemetry JSON, and (c) a role-specific prompt template.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite, Tailwind CSS, shadcn/ui |
| Realtime | Socket.IO (client + server) |
| Backend | Node.js + Express |
| LLM | Claude API (Sonnet) |
| RAG / Vector DB | ChromaDB (local, via Python microservice) or a Node-native vector lib if avoiding a second runtime — default to a small Python FastAPI microservice just for embedding/retrieval, called by the Express backend |
| Embeddings | `text-embedding-3-small` (OpenAI) or Gemini embeddings — pick whichever key is available |
| Database | MySQL (reuse existing schema patterns from HRMS) for incident logs/auth; SQLite acceptable if MySQL setup is overhead |
| Auth (Operator only) | JWT, same pattern as HRMS project |
| Hosting (demo) | Frontend → Vercel; Backend → Render/Railway |
| Maps | Static SVG stadium map (self-illustrated) — simplest, no API key dependency |

---

## 3. Directory Structure

```
gamefield-ops/
├── client/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── fan/FanChat.jsx
│   │   │   ├── fan/StadiumMap.jsx
│   │   │   ├── volunteer/TaskBoard.jsx
│   │   │   ├── operator/OperatorConsole.jsx
│   │   │   ├── operator/TelemetryPanel.jsx
│   │   │   └── shared/ChatWindow.jsx
│   │   ├── pages/
│   │   │   ├── FanPage.jsx
│   │   │   ├── VolunteerPage.jsx
│   │   │   └── OperatorPage.jsx
│   │   ├── lib/socket.js            # Socket.IO client setup
│   │   ├── lib/api.js                # REST calls to backend
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
│
├── server/                          # Node/Express backend
│   ├── src/
│   │   ├── index.js                  # Express app + Socket.IO server
│   │   ├── routes/chat.js            # POST /api/chat  { role, query, lang }
│   │   ├── routes/incident.js        # POST /api/incident/trigger, /resolve
│   │   ├── services/llmService.js    # Calls Claude API with fused context
│   │   ├── services/telemetry.js     # Reads/writes live state, emits socket updates
│   │   ├── services/ragClient.js     # Calls the Python RAG microservice
│   │   └── db/                       # MySQL connection + incident log models
│   ├── simulator/
│   │   └── simulator.js              # setInterval loop generating stadium_state.json
│   └── package.json
│
├── rag-service/                     # Python microservice (embedding + retrieval only)
│   ├── ingest.py                     # Chunks + embeds docs into ChromaDB
│   ├── retrieve.py                   # FastAPI endpoint: POST /retrieve { query, k }
│   ├── requirements.txt
│   └── docs/                         # Source knowledge documents (see §5)
│       ├── sop_emergency.md
│       ├── sop_crowd_control.md
│       ├── accessibility_guide.md
│       ├── transport_guide.md
│       └── sustainability_guide.md
│
└── README.md
```

---

## 4. Data Schema — Live Telemetry (`stadium_state.json`)

The simulator overwrites this every 5 seconds. Backend reads it on every chat request and also pushes it to clients via Socket.IO.

```json
{
  "timestamp": "2026-06-15T18:32:00Z",
  "stadium": "MetLife Stadium",
  "global_status": "active",
  "gates": [
    { "id": "Gate A", "wait_time_mins": 4, "status": "flowing", "crowd_density": "low" },
    { "id": "Gate B", "wait_time_mins": 6, "status": "flowing", "crowd_density": "medium" }
  ],
  "transport": {
    "shuttle_status": "on_schedule",
    "parking_lots": [
      { "id": "Lot 3", "capacity_pct": 62 },
      { "id": "Lot 5", "capacity_pct": 91 }
    ]
  },
  "sustainability": {
    "recycling_bins_near_capacity": [],
    "water_stations_status": "normal"
  },
  "active_incidents": []
}
```

**Incident-triggered state** (when `active_incidents` is populated) replaces the relevant gate(s) with `status: "incident"` and adds:

```json
{
  "active_incidents": [
    {
      "incident_id": "INC-001",
      "type": "medical_emergency",
      "location": "Gate B",
      "severity": "high",
      "triggered_at": "2026-06-15T18:35:00Z"
    }
  ]
}
```

Keep the schema flat and stable — every field referenced in a prompt template must always exist (use empty arrays/defaults, never omit keys), or the LLM context assembly breaks.

---

## 5. Knowledge Documents to Write First (before any code)

Create these as plain markdown in `rag-service/docs/`. Each should be 300–800 words, written in your own words (not copied from any source), specific enough to retrieve useful chunks:

1. **`sop_emergency.md`** — protocols for medical emergencies, fire, severe weather, security threats. Include gate-specific evacuation routes.
2. **`sop_crowd_control.md`** — thresholds for action (e.g., "if wait time > 30 min, open auxiliary gate"), rerouting rules.
3. **`accessibility_guide.md`** — wheelchair routes, accessible restrooms/elevators per gate, sensory-friendly zones, companion seating policy.
4. **`transport_guide.md`** — shuttle routes/schedule, parking lot locations, public transit connections.
5. **`sustainability_guide.md`** — recycling/waste station locations, water refill stations, energy-saving protocols for staff.

These five files are the entire RAG knowledge base for the MVP. Do not add more until these are solid and retrieval is tested.

---

## 6. RAG Microservice — Build Order

1. `ingest.py`: load all `.md` files from `docs/`, split via `RecursiveCharacterTextSplitter` (chunk size 1000, overlap 200), embed, store in local Chroma (`persist_directory="./chroma_db"`). Run once at setup, re-run if docs change.
2. `retrieve.py`: FastAPI app, single endpoint `POST /retrieve` accepting `{ "query": string, "k": int }`, returns top-k chunks as `{ "chunks": [string, ...] }`.
3. Test standalone with `curl`/Postman before wiring to Node backend.

---

## 7. Backend — Context Fusion Logic (`llmService.js`)

Every chat request follows this exact sequence:

1. Receive `{ role, query, lang }` from `/api/chat` (`role` ∈ `fan | volunteer | operator`).
2. Call `ragClient.retrieve(query, k=3)` → get `sop_context`.
3. Call `telemetry.getCurrentState()` → get `live_state` (parsed JSON, stringified for the prompt).
4. Detect/accept `lang` (e.g., `"en"`, `"es"`, `"fr"`) — default to `"en"` if not provided.
5. Build the prompt using the role-specific template (§8).
6. Call Claude API, return `response.content` to the client.
7. Log the interaction (query, role, response) to MySQL if persistence is enabled.

---

## 8. Prompt Templates

**Fan template:**
```
You are GameField, a friendly multilingual stadium assistant for the FIFA World Cup 2026.

Respond ONLY in this language: {lang}

STATIC KNOWLEDGE (from stadium guides):
{sop_context}

LIVE STADIUM CONDITIONS:
{live_state}

Rules:
- Be warm, concise, and practical.
- Never expose raw JSON or technical field names to the fan — translate data into plain language (e.g., "Gate A is quick right now" not "wait_time_mins: 4").
- If live conditions show an active incident near the fan's stated location, prioritize safety guidance over convenience.

Fan question: {query}
```

**Volunteer template:**
```
You are GameField Staff Assist. Output short, actionable task instructions for a volunteer with no technical background.

STATIC PROCEDURES:
{sop_context}

LIVE CONDITIONS:
{live_state}

Rules:
- Max 3 sentences.
- Give a specific action, not analysis (e.g., "Direct fans from Gate B to Gate D. Wait time at B exceeds 30 minutes.").
- If there's an active incident, state the single most important safety action first.

Situation/query: {query}
```

**Operator template:**
```
You are GameField Command, tactical AI for stadium operations control.

STANDARD OPERATING PROCEDURES:
{sop_context}

LIVE TELEMETRY:
{live_state}

Rules:
- Be direct, operational, and concise. No filler.
- If active_incidents is non-empty, ALWAYS cite the specific matching SOP before recommending action.
- If asked to draft a fan-facing alert, produce it in the requested language(s) as a ready-to-send message.

Operator query: {query}
```

---

## 9. Frontend — Minimum Screens

- **FanPage**: chat window (`ChatWindow.jsx` reused) + static SVG stadium map with gate markers colored by live status (pulled via Socket.IO).
- **VolunteerPage**: list/card view of current tasks, auto-updates when telemetry/incidents change (subscribe to socket event `telemetry:update`).
- **OperatorPage**: two-column layout — left: live JSON/status panel + "Trigger Incident" / "Resolve Incident" buttons; right: chat window using the operator prompt.

All three pages hit the same `POST /api/chat` with a different `role` value — do not build separate backend logic per page beyond the prompt template.

---

## 10. Build Order Checklist

1. [ ] Write the 5 knowledge docs (§5)
2. [ ] Stand up `rag-service` (ingest + retrieve), test via curl
3. [ ] Build `simulator.js`, confirm `stadium_state.json` updates every 5s and responds to a trigger flag
4. [ ] Build Express backend: `/api/chat`, `/api/incident/trigger`, `/api/incident/resolve`, Socket.IO emit on telemetry change
5. [ ] Wire `llmService.js` — test all 3 role prompts via Postman before touching frontend
6. [ ] Scaffold React app, build FanPage first (chat only, no map) to validate end-to-end flow
7. [ ] Add StadiumMap, VolunteerPage, OperatorPage
8. [ ] Add Socket.IO client wiring for live updates
9. [ ] Add MySQL logging (optional, skip if time-constrained)
10. [ ] Deploy frontend + backend, run full demo scenario end-to-end 3x
