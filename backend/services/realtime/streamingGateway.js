const marketDataEngine = require('./marketDataEngine');
const { getMarketStatus } = require('./marketHours');
const portfolioStore = require('../portfolioStore');

// Set of active client response connections
// Client structure: { id, res, symbols: Set<string>, userId: string|null }
const clients = new Map();

let isEngineBound = false;

function bindEngineEvents() {
  if (isEngineBound) return;
  isEngineBound = true;

  marketDataEngine.on('quote', async (quote) => {
    const symbol = quote.symbol.toUpperCase();
    const tickData = JSON.stringify({ type: 'TICK', data: quote });

    // 1. Broadcast to subscribed SSE clients
    for (const client of clients.values()) {
      if (client.symbols.has(symbol) || client.symbols.has('*')) {
        try {
          client.res.write(`event: tick\ndata: ${tickData}\n\n`);
        } catch (err) {
          console.warn(`[StreamingGateway] Error writing tick to client ${client.id}:`, err.message);
        }
      }
    }

    // 2. Evaluate active price alerts
    try {
      const triggeredAlerts = await portfolioStore.evaluateAlertsForQuote(quote);
      if (triggeredAlerts.length > 0) {
        for (const alert of triggeredAlerts) {
          const alertPayload = JSON.stringify({ type: 'ALERT', data: alert });
          for (const client of clients.values()) {
            if (client.userId && client.userId === alert.userId) {
              try {
                client.res.write(`event: alert\ndata: ${alertPayload}\n\n`);
              } catch (err) {
                // Client dropped
              }
            }
          }
        }
      }
    } catch (alertErr) {
      console.warn('[StreamingGateway] Alert evaluation notice:', alertErr.message);
    }
  });

  // Heartbeat every 15 seconds
  const heartbeatTimer = setInterval(() => {
    if (clients.size === 0) return;
    const marketStatus = getMarketStatus();
    const heartbeatData = JSON.stringify({
      type: 'HEARTBEAT',
      timestamp: new Date().toISOString(),
      marketStatus,
      clientCount: clients.size,
    });

    for (const client of clients.values()) {
      try {
        client.res.write(`event: heartbeat\ndata: ${heartbeatData}\n\n`);
      } catch (err) {
        // Handled on close
      }
    }
  }, 15000);
  if (heartbeatTimer.unref) heartbeatTimer.unref();
}

// Initialize engine listener
bindEngineEvents();

/**
 * Handle incoming SSE stream connection
 * @param {express.Request} req
 * @param {express.Response} res
 */
async function handleStreamConnection(req, res) {
  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx, etc.)
  });

  res.write('\n'); // Initial flush

  const rawSymbols = req.query.symbols || req.query.symbol || '*';
  const symbolsSet = new Set(
    String(rawSymbols)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const userId = req.userId || null;

  const client = {
    id: clientId,
    res,
    symbols: symbolsSet,
    userId,
  };

  clients.set(clientId, client);

  // Send initial connection acknowledgement and market status
  const marketStatus = getMarketStatus();
  res.write(
    `event: connected\ndata: ${JSON.stringify({
      type: 'CONNECTED',
      clientId,
      symbols: Array.from(symbolsSet),
      marketStatus,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  // Send immediate initial snapshots for requested symbols
  if (!symbolsSet.has('*')) {
    for (const sym of symbolsSet) {
      try {
        const snapshot = await marketDataEngine.getQuote(sym);
        res.write(`event: tick\ndata: ${JSON.stringify({ type: 'TICK', data: snapshot })}\n\n`);
      } catch (err) {
        // Skip unresolvable symbol
      }
    }
  }

  // Cleanup on client disconnect
  req.on('close', () => {
    clients.delete(clientId);
  });
}

function getActiveClientCount() {
  return clients.size;
}

module.exports = {
  handleStreamConnection,
  getActiveClientCount,
};
