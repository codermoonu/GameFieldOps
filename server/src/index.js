import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import chatRouter from './routes/chat.js';
import incidentRouter from './routes/incident.js';
import authRouter from './routes/auth.js';
import { initDatabase } from './db/database.js';
import { initTelemetry, getCurrentState } from './services/telemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: '*', // For development. Can restrict in production
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const STATE_FILE_PATH = path.join(__dirname, '..', '..', 'stadium_state.json');

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRouter);
app.use('/api', chatRouter);
app.use('/api/incident', incidentRouter);

app.get('/api/telemetry', (req, res) => {
  res.json(getCurrentState());
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'GameField Ops Backend' });
});

// Watch state file for changes to broadcast via Socket.IO
function watchTelemetryFile() {
  if (fs.existsSync(STATE_FILE_PATH)) {
    console.log(`[Server] Watching telemetry state file at ${STATE_FILE_PATH}`);
    fs.watchFile(STATE_FILE_PATH, { interval: 1000 }, (curr, prev) => {
      if (curr.mtime !== prev.mtime) {
        try {
          const state = getCurrentState();
          io.emit('telemetry:update', state);
        } catch (err) {
          console.error('[Server] Error reading state file on file change:', err.message);
        }
      }
    });
  } else {
    // Check again in 2 seconds if file is not created yet
    setTimeout(watchTelemetryFile, 2000);
  }
}

// Socket.IO connections
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);
  
  // Send current state immediately on connection
  socket.emit('telemetry:update', getCurrentState());
  
  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// Start Server
async function startServer() {
  try {
    // 1. Initialize SQLite Database
    await initDatabase();
    
    // 2. Initialize Telemetry System
    initTelemetry(io);
    
    // 3. Start watching telemetry updates
    watchTelemetryFile();
    
    // 4. Listen on port
    server.listen(PORT, () => {
      console.log(`[Server] Running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Fatal server startup error:', error);
    process.exit(1);
  }
}

startServer();
