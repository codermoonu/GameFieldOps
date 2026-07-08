# GameField Ops ⚽

> **Smart Stadiums & Tournament Operations** — A real-time AI-powered stadium management platform built for the FIFA World Cup 2026 at MetLife Stadium.

---

## Overview

GameField Ops is a multi-role web application that unifies three distinct stadium stakeholders — **Fans**, **Staff**, and **Operators** — on one shared AI backend. Every role sees a tailored interface, but all three draw from the same live telemetry stream and RAG (Retrieval-Augmented Generation) knowledge base.

```
Fan Portal      →  Stadium map + multilingual AI chat assistant
Staff Portal    →  Actionable task instructions from live conditions  
Command Center  →  Live telemetry dashboard + AI incident command
```

Authentication is role-locked: users log in with credentials provided by the operations team. There is no self-registration.

---

## Demo Credentials

| Role          | Username      | Password      |
|---------------|--------------|---------------|
| 🟢 Fan        | `fan_demo`   | `fan2026`     |
| 🟡 Staff      | `staff_001`  | `staff2026`   |
| 🔴 Operator   | `admin`      | `admin123`    |

On the login page, click a role button to auto-fill the credentials.

---

## Tech Stack

| Layer       | Technology                                      |
|-------------|-------------------------------------------------|
| Frontend    | React 19, Vite, Vanilla CSS, Socket.IO client  |
| Backend     | Node.js, Express, Socket.IO server              |
| Auth        | JWT (8h expiry), bcrypt, SQLite                 |
| AI / LLM    | Google Gemini API (`@google/genai`)             |
| RAG         | Python FastAPI microservice + ChromaDB           |
| Embeddings  | ChromaDB default embedding function             |
| Realtime    | Socket.IO (telemetry push every 5s)             |
| Database    | SQLite (users, incident log)                    |

---

## Project Structure

```
GameFieldOps/
├── client/                         # React + Vite frontend
│   └── src/
│       ├── components/
│       │   ├── fan/StadiumMap.jsx  # SVG stadium map (live gate colors)
│       │   └── shared/ChatWindow.jsx
│       ├── pages/
│       │   ├── LoginPage.jsx       # Pixel football landing page
│       │   ├── FanPage.jsx         # Map + chat
│       │   ├── VolunteerPage.jsx   # Staff task view
│       │   └── OperatorPage.jsx    # Command center dashboard
│       ├── lib/
│       │   ├── auth.js             # login / logout / getAuthState
│       │   ├── api.js              # REST helpers
│       │   └── socket.js           # Socket.IO client singleton
│       ├── App.jsx                 # Auth gating + role routing
│       └── index.css               # Global design system
│
├── server/                         # Express backend
│   └── src/
│       ├── index.js                # Server entry, Socket.IO setup
│       ├── routes/
│       │   ├── auth.js             # POST /api/auth/login, GET /api/auth/me
│       │   ├── chat.js             # POST /api/chat
│       │   └── incident.js         # POST /api/incident/trigger|resolve
│       ├── services/
│       │   ├── llmService.js       # Gemini API + role-specific prompt fusion
│       │   ├── telemetry.js        # Reads & emits stadium_state.json
│       │   └── ragClient.js        # Calls Python RAG microservice
│       └── db/database.js          # SQLite schema + demo user seeding
│
├── rag-service/                    # Python RAG microservice
│   ├── ingest.py                   # Embeds docs into ChromaDB
│   ├── retrieve.py                 # FastAPI: POST /retrieve
│   ├── requirements.txt
│   └── docs/                       # Knowledge base markdown files
│       ├── sop_emergency.md
│       ├── sop_crowd_control.md
│       ├── accessibility_guide.md
│       ├── transport_guide.md
│       └── sustainability_guide.md
│
├── stadium_state.json              # Live telemetry (overwritten every 5s)
├── .env                            # API keys (see below)
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+
- **Python** 3.10+
- A **Gemini API key** (get one at [aistudio.google.com](https://aistudio.google.com))

---

### 1. Clone & Configure

```bash
git clone https://github.com/codermoonu/GameFieldOps.git
cd GameFieldOps
```

Create a `.env` file in the root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
JWT_SECRET=your_jwt_secret_here
```

---

### 2. Backend Server

```bash
cd server
npm install
npm run dev
```

The server starts on **http://localhost:5000**. On first run it:
- Creates the SQLite database at `server/data/gamefield.db`
- Seeds all three demo users automatically
- Begins watching `stadium_state.json` for telemetry changes

---

### 3. Frontend Client

```bash
cd client
npm install
npm run dev
```

Opens at **http://localhost:5173**.

---

### 4. RAG Microservice (optional — enhances AI responses)

```bash
cd rag-service
pip install -r requirements.txt

# Ingest knowledge docs into ChromaDB (run once)
python ingest.py

# Start the retrieval API
uvicorn retrieve:app --reload --port 8000
```

The RAG service runs on **http://localhost:8000**. Without it, AI chat still works but draws only on live telemetry and the LLM's built-in knowledge.

---

### 5. Telemetry Simulator (optional — generates live data)

In a separate terminal:

```bash
cd server
npm run simulator
```

This updates `stadium_state.json` every 5 seconds with randomised crowd density, gate wait times, parking capacity, and can inject incidents. Changes are broadcast to all connected clients via Socket.IO automatically.

---

## API Reference

### Auth

| Method | Endpoint              | Body                        | Returns                        |
|--------|-----------------------|-----------------------------|--------------------------------|
| POST   | `/api/auth/login`     | `{ username, password }`   | `{ token, role, username }`   |
| GET    | `/api/auth/me`        | Header: `Authorization: Bearer <token>` | `{ id, username, role }` |

### Chat

| Method | Endpoint      | Body                          | Returns               |
|--------|---------------|-------------------------------|-----------------------|
| POST   | `/api/chat`   | `{ role, query, lang? }`     | `{ response: string }` |

`role` must be one of: `fan`, `volunteer`, `operator`

### Incidents

| Method | Endpoint                    | Body                                 |
|--------|-----------------------------|--------------------------------------|
| POST   | `/api/incident/trigger`     | `{ type, location, severity }`      |
| POST   | `/api/incident/resolve`     | `{ incident_id }`                   |
| GET    | `/api/incident`             | —                                   |

### Telemetry

| Method | Endpoint          | Returns                         |
|--------|-------------------|---------------------------------|
| GET    | `/api/telemetry`  | Full `stadium_state.json` object |
| GET    | `/health`         | `{ status: "ok" }`             |

---

## Live Telemetry Schema

`stadium_state.json` is overwritten every 5 seconds by the simulator. Key fields:

```json
{
  "timestamp": "2026-06-15T18:32:00Z",
  "stadium": "MetLife Stadium",
  "global_status": "active",
  "gates": [
    { "id": "Gate A", "wait_time_mins": 4, "status": "flowing", "crowd_density": "low" },
    { "id": "Gate B", "wait_time_mins": 22, "status": "congested", "crowd_density": "high" }
  ],
  "transport": {
    "shuttle_status": "on_schedule",
    "parking_lots": [{ "id": "Lot 3", "capacity_pct": 62 }]
  },
  "active_incidents": []
}
```

Gate `status` values: `flowing` · `congested` · `bottleneck` · `incident`

---

## Role Dashboards

### 🟢 Fan Portal
- **Live stadium map** — gate markers change color by real-time status
- **Multilingual AI chat** — answers navigation, transport, accessibility, safety questions in the user's language
- **Info cards** — gate navigation tips, shuttle schedule, first-aid locations

### 🟡 Staff Portal
- **Task feed** — short, actionable instructions auto-generated from live conditions
- **Incident alerts** — shows current active incidents with instructions
- **AI assistant** — staff-mode chat for procedure questions

### 🔴 Operator Command Center
- **Live telemetry panel** — all gates, parking, transport, active incidents at a glance
- **Incident board** — full log with trigger/resolve controls
- **AI command chat** — incident triage, SOP retrieval, multilingual fan alert drafting

---

## AI Prompt Architecture

Each role has a dedicated prompt template that fuses three sources:

```
Role template + RAG chunks (SOP docs) + Live telemetry JSON → Gemini API → Response
```

- **Fan**: warm, plain-language responses; never exposes raw JSON field names
- **Staff**: max 3 sentences; single most important action first
- **Operator**: direct, operational; always cites matching SOP for active incidents

---

## Login Page

The entry point is a **retro pixel-art football stadium** landing page featuring:

- CSS-drawn football field with yard lines and goal boxes
- Animated corner stadium lights with flickering glow
- Bouncing ⚽ football that spins around the pitch
- Live match-timer scoreboard
- Pixel crowd dots in team colors
- Role quick-fill buttons (click to auto-populate credentials)
- Scrolling stadium announcements ticker
- `Press Start 2P` pixel font for authentic retro feel

---

## Environment Variables

| Variable        | Description                          | Default                           |
|-----------------|--------------------------------------|-----------------------------------|
| `GEMINI_API_KEY`| Google Gemini API key                | —                                 |
| `PORT`          | Express server port                  | `5000`                            |
| `JWT_SECRET`    | Secret for signing JWT tokens        | `gamefield_ops_jwt_secret_2026`   |
| `VITE_API_URL`  | Backend URL (set in client `.env`)   | `http://localhost:5000/api`       |

---

## License

MIT — see [LICENSE](LICENSE)

---

> Built for the **FIFA World Cup 2026** demo at MetLife Stadium, East Rutherford, NJ.  
> Real-time telemetry is fully simulated for demonstration purposes.
