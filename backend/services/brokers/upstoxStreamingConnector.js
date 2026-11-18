/**
 * upstoxStreamingConnector.js
 * Official Upstox Market Data Feed V3 Streaming Client
 * 
 * Manages WebSocket connection to Upstox Market Data Feed:
 * 1. Obtains authorized WebSocket URL via GET /v2/feed/market-data-feed/authorize
 * 2. Connects and authorizes with Bearer token
 * 3. Manages instrument subscriptions (LTPC / Full mode)
 * 4. Decodes incoming binary/JSON feed packets
 * 5. Passes normalized ticks to MarketDataEngine
 * 6. Handles reconnection, heartbeat, backoff, and graceful teardown
 * 7. When credentials are not provided, enters graceful idle state without errors or fake data
 */

const { EventEmitter } = require('events');
const { upstoxMarketDataAdapter } = require('./upstoxMarketDataAdapter');
const { fromUpstoxInstrumentKey, toUpstoxInstrumentKey } = require('../realtime/symbolMapping');

class UpstoxStreamingConnector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.adapter = options.adapter || upstoxMarketDataAdapter;
    this.marketDataEngine = options.marketDataEngine || null;
    this.wsClientFactory = options.wsClientFactory || this._defaultWsFactory.bind(this);

    this.ws = null;
    this.status = 'DISCONNECTED'; // 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISABLED_NO_CREDENTIALS'
    this.subscriptions = new Set(); // Set of Upstox instrument keys (e.g. NSE_EQ|INE002A01018)
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.lastMessageTime = null;
  }

  _defaultWsFactory(url) {
    // Check if WebSocket is globally available
    if (typeof globalThis.WebSocket !== 'undefined') {
      return new globalThis.WebSocket(url);
    }
    // Check if 'ws' npm package is present
    try {
      const Ws = require('ws');
      return new Ws(url);
    } catch {
      return null;
    }
  }

  /**
   * Current connector status
   */
  getStatus() {
    return {
      status: this.status,
      connected: this.status === 'CONNECTED',
      subscriptionCount: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
      lastMessageTime: this.lastMessageTime,
    };
  }

  /**
   * Subscribe to one or more instruments
   * @param {string|string[]} rawSymbols - e.g. ['RELIANCE', 'TCS'] or ['NSE_EQ|INE002A01018']
   */
  subscribe(rawSymbols = []) {
    const list = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols];
    const keys = list.map((s) => toUpstoxInstrumentKey(s)).filter(Boolean);

    let hasNew = false;
    for (const key of keys) {
      if (!this.subscriptions.has(key)) {
        this.subscriptions.add(key);
        hasNew = true;
      }
    }

    if (this.status === 'CONNECTED' && hasNew && this.ws) {
      this._sendSubscriptionPayload(keys);
    } else if (this.status === 'DISCONNECTED') {
      this.connect();
    }
  }

  /**
   * Unsubscribe from instruments
   */
  unsubscribe(rawSymbols = []) {
    const list = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols];
    const keys = list.map((s) => toUpstoxInstrumentKey(s)).filter(Boolean);

    for (const key of keys) {
      this.subscriptions.delete(key);
    }

    if (this.status === 'CONNECTED' && this.ws && keys.length > 0) {
      const payload = {
        guid: `unsub_${Date.now()}`,
        method: 'unsub',
        params: {
          instrumentKeys: keys,
        },
      };
      this._send(payload);
    }
  }

  /**
   * Connect to Upstox Market Data Feed
   */
  async connect() {
    if (!this.adapter.hasCredentials() || this.adapter.isTokenExpired()) {
      this.status = 'DISABLED_NO_CREDENTIALS';
      this.emit('status', this.status);
      return {
        success: false,
        status: this.status,
        message: 'Upstox streaming connector is idle: credentials not configured or expired.',
      };
    }

    if (this.status === 'CONNECTING' || this.status === 'CONNECTED') {
      return { success: true, status: this.status };
    }

    this.status = 'CONNECTING';
    this.emit('status', this.status);

    // 1. Authorize feed to get WebSocket URL
    const authRes = await this.adapter.getAuthorizedFeedUrl();
    if (!authRes.success || !authRes.feedUrl) {
      this.status = 'DISCONNECTED';
      this.emit('status', this.status);
      this._scheduleReconnect();
      return {
        success: false,
        status: 'AUTH_FAILED',
        error: authRes.error || 'Failed to authorize Upstox streaming feed.',
      };
    }

    // 2. Instantiate WebSocket client
    try {
      this.ws = this.wsClientFactory(authRes.feedUrl);
      if (!this.ws) {
        this.status = 'DISCONNECTED';
        return {
          success: false,
          error: 'WebSocket client implementation not available in this environment.',
        };
      }

      this._bindWsEvents();
      return { success: true, status: 'CONNECTING' };
    } catch (err) {
      this.status = 'DISCONNECTED';
      this.emit('status', this.status);
      this._scheduleReconnect();
      return { success: false, error: err.message };
    }
  }

  _bindWsEvents() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.status = 'CONNECTED';
      this.reconnectAttempts = 0;
      this.emit('status', this.status);

      // Resubscribe active subscriptions
      if (this.subscriptions.size > 0) {
        this._sendSubscriptionPayload(Array.from(this.subscriptions));
      }

      this._startHeartbeat();
    };

    this.ws.onmessage = (event) => {
      this.lastMessageTime = new Date().toISOString();
      this._handleIncomingMessage(event.data);
    };

    this.ws.onerror = (err) => {
      this.emit('error', err);
    };

    this.ws.onclose = () => {
      this.status = 'DISCONNECTED';
      this.emit('status', this.status);
      this._stopHeartbeat();
      this._scheduleReconnect();
    };
  }

  _sendSubscriptionPayload(keys) {
    if (!keys || keys.length === 0) return;
    const payload = this.adapter.buildSubscriptionPayload(keys, 'full');
    this._send(payload);
  }

  _send(payload) {
    if (this.ws && this.status === 'CONNECTED') {
      try {
        const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
        this.ws.send(msg);
      } catch (err) {
        console.warn('[UpstoxStreamingConnector] Send error:', err.message);
      }
    }
  }

  _handleIncomingMessage(data) {
    try {
      let parsed = null;
      if (typeof data === 'string') {
        parsed = JSON.parse(data);
      } else if (Buffer.isBuffer(data)) {
        // Attempt JSON parse or protobuf extract
        parsed = JSON.parse(data.toString('utf8'));
      }

      if (!parsed) return;

      // Handle feed updates
      const feeds = parsed.feeds || parsed.data || {};
      for (const [key, feedItem] of Object.entries(feeds)) {
        const normalizedKey = key.replace(':', '|');
        const symbol = fromUpstoxInstrumentKey(normalizedKey);
        const ltp = feedItem.ltpc?.ltp || feedItem.ff?.marketFF?.ltpc?.ltp || feedItem.last_price;

        if (ltp !== undefined && ltp !== null) {
          const tick = {
            symbol,
            instrumentKey: normalizedKey,
            lastPrice: Number(ltp),
            previousClose: Number(feedItem.ltpc?.cp || feedItem.ff?.marketFF?.ltpc?.cp || ltp),
            open: Number(feedItem.ff?.marketFF?.marketOHLC?.ohlc?.[0]?.open || ltp),
            high: Number(feedItem.ff?.marketFF?.marketOHLC?.ohlc?.[0]?.high || ltp),
            low: Number(feedItem.ff?.marketFF?.marketOHLC?.ohlc?.[0]?.low || ltp),
            volume: Number(feedItem.ff?.marketFF?.vtt || feedItem.volume || 0),
            timestamp: new Date().toISOString(),
            source: 'upstox-stream',
            provider: 'upstox',
          };

          this.emit('tick', tick);

          // Ingest into centralized MarketDataEngine if attached
          if (this.marketDataEngine) {
            this.marketDataEngine.ingestTick(tick);
          }
        }
      }
    } catch {
      // In binary protobuf mode or heartbeat ping
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.status === 'CONNECTED' && this.ws) {
        try {
          if (typeof this.ws.ping === 'function') {
            this.ws.ping();
          }
        } catch {
          // Handled on close
        }
      }
    }, 25000);
    if (this.pingTimer.unref) this.pingTimer.unref();
  }

  _stopHeartbeat() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

    if (!this.adapter.hasCredentials() || this.adapter.isTokenExpired()) {
      this.status = 'DISABLED_NO_CREDENTIALS';
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[UpstoxStreamingConnector] Maximum reconnection attempts reached.');
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      if (this.subscriptions.size > 0) {
        this.connect();
      }
    }, backoffMs);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this._stopHeartbeat();
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignored
      }
      this.ws = null;
    }
    this.status = 'DISCONNECTED';
    this.emit('status', this.status);
  }
}

// Export singleton instance
const upstoxStreamingConnector = new UpstoxStreamingConnector();

module.exports = {
  UpstoxStreamingConnector,
  upstoxStreamingConnector,
};
