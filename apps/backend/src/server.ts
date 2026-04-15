import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { generateAttack, getStats, getRecentAttacks } from './simulator';
import { WSMessage } from './types';

const PORT = Number(process.env.PORT) || 4000;

// ─── Express App ──────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// REST endpoints
app.get('/api/stats', (_req, res) => {
  res.json(getStats());
});

app.get('/api/attacks', (req, res) => {
  const count = Math.min(Number(req.query.count) || 20, 100);
  res.json(getRecentAttacks(count));
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ─── HTTP + WebSocket Server ──────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send recent history on connect
  const historyMsg: WSMessage = {
    type: 'history',
    data: getRecentAttacks(20),
  };
  ws.send(JSON.stringify(historyMsg));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

function broadcast(message: WSMessage) {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

// ─── Attack Simulation Loop ──────────────────────────────
function startSimulation() {
  const scheduleNext = () => {
    const delay = 1000 + Math.random() * 2000; // 1-3 seconds
    setTimeout(() => {
      const attack = generateAttack();
      broadcast({ type: 'attack', data: attack });

      // Broadcast stats every 5 attacks
      if (getStats().totalAttacks % 5 === 0) {
        broadcast({ type: 'stats', data: getStats() });
      }

      scheduleNext();
    }, delay);
  };
  scheduleNext();
}

// ─── Start ────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║          🌐 CyberGlobe Backend Server           ║
╠══════════════════════════════════════════════════╣
║  HTTP API:    http://localhost:${PORT}             ║
║  WebSocket:   ws://localhost:${PORT}               ║
║  Health:      http://localhost:${PORT}/api/health   ║
╚══════════════════════════════════════════════════╝
  `);
  startSimulation();
});
