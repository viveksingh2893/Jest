const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 8080;

// Client registry: ws -> { username, joinedAt }
const clients = new Map();

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    connectedClients: clients.size,
    uptime: process.uptime(),
  });
});

/**
 * Broadcast a message to all connected clients except the sender.
 * @param {object} data - The message payload to broadcast
 * @param {WebSocket|null} excludeWs - The WebSocket to exclude (sender)
 */
function broadcast(data, excludeWs = null) {
  const payload = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws !== excludeWs && ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

/**
 * Send a message to a specific client.
 * @param {WebSocket} ws - Target WebSocket
 * @param {object} data - The message payload
 */
function sendTo(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/**
 * Get the list of currently connected usernames.
 * @returns {string[]}
 */
function getUserList() {
  return Array.from(clients.values()).map(c => c.username);
}

/**
 * Broadcast the updated user list to all connected clients.
 */
function broadcastUserList() {
  const data = { type: 'userList', users: getUserList() };
  const payload = JSON.stringify(data);
  for (const [ws] of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('[WS] New connection established');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendTo(ws, { type: 'error', text: 'Invalid JSON' });
      return;
    }

    switch (msg.type) {
      case 'join': {
        const username = (msg.username || '').trim();
        if (!username) {
          sendTo(ws, { type: 'error', text: 'Username is required' });
          return;
        }

        // Check for duplicate username
        const existingNames = getUserList();
        if (existingNames.includes(username)) {
          sendTo(ws, { type: 'error', text: 'Username already taken' });
          return;
        }

        // Register client
        clients.set(ws, { username, joinedAt: new Date().toISOString() });
        console.log(`[WS] ${username} joined (${clients.size} online)`);

        // Confirm join to the user
        sendTo(ws, {
          type: 'joinConfirmed',
          username,
          timestamp: new Date().toISOString(),
        });

        // Notify others
        broadcast(
          {
            type: 'system',
            text: `${username} joined the chat`,
            timestamp: new Date().toISOString(),
          },
          ws,
        );

        // Broadcast updated user list
        broadcastUserList();
        break;
      }

      case 'message': {
        const client = clients.get(ws);
        if (!client) {
          sendTo(ws, { type: 'error', text: 'You must join first' });
          return;
        }

        const text = (msg.text || '').trim();
        if (!text) {
          return;
        }

        const outgoing = {
          type: 'message',
          username: client.username,
          text,
          timestamp: new Date().toISOString(),
        };

        console.log(`[WS] ${client.username}: ${text}`);

        // Send to all INCLUDING the sender (so they see their own message confirmed)
        const payload = JSON.stringify(outgoing);
        for (const [clientWs] of clients) {
          if (clientWs.readyState === clientWs.OPEN) {
            clientWs.send(payload);
          }
        }
        break;
      }

      default:
        sendTo(ws, { type: 'error', text: `Unknown message type: ${msg.type}` });
    }
  });

  ws.on('close', () => {
    const client = clients.get(ws);
    if (client) {
      console.log(`[WS] ${client.username} disconnected (${clients.size - 1} online)`);
      clients.delete(ws);

      // Notify others
      broadcast({
        type: 'system',
        text: `${client.username} left the chat`,
        timestamp: new Date().toISOString(),
      });

      // Broadcast updated user list
      broadcastUserList();
    }
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    const client = clients.get(ws);
    if (client) {
      clients.delete(ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 Chat server running on http://localhost:${PORT}`);
  console.log(`   WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);
});
