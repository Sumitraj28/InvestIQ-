/**
 * realtimeClient.js
 * InvestIQ Real-Time Market Streaming Client
 * 
 * Manages resilient Server-Sent Events (SSE) connection to GET /api/stocks/stream
 * Features:
 * - Single shared connection pool across all components
 * - Dynamic symbol subscription aggregation
 * - Auto-reconnection with exponential backoff & jitter
 * - Heartbeat tracking & connection status states ('CONNECTING' | 'CONNECTED' | 'DISCONNECTED')
 * - Real-time price alert notification event handling
 * - Clean unsubscribe handling to avoid memory leaks
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class RealtimeClient {
  constructor() {
    this.eventSource = null;
    this.subscriptions = new Set(); // Set of symbols
    this.subscribers = new Map(); // symbol -> Set of callback functions
    this.alertListeners = new Set(); // callback functions for user alerts
    this.heartbeatListeners = new Set(); // callback functions for heartbeat & market status
    this.statusListeners = new Set(); // callback functions for connection status changes
    this.status = 'DISCONNECTED';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectTimer = null;
    this.authToken = null;
    this.lastHeartbeat = null;
  }

  setAuthToken(token) {
    if (this.authToken !== token) {
      this.authToken = token;
      // Re-establish if connection was already active to attach user alerts
      if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
        this.reconnect();
      }
    }
  }

  getStatus() {
    return this.status;
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  onHeartbeat(cb) {
    this.heartbeatListeners.add(cb);
    if (this.lastHeartbeat) cb(this.lastHeartbeat);
    return () => this.heartbeatListeners.delete(cb);
  }

  onAlert(cb) {
    this.alertListeners.add(cb);
    return () => this.alertListeners.delete(cb);
  }

  _setStatus(newStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.statusListeners.forEach((fn) => {
        try {
          fn(newStatus);
        } catch (err) {
          console.error('[RealtimeClient] Status listener error:', err);
        }
      });
    }
  }

  /**
   * Subscribe to ticks for one or more symbols
   * @param {string|string[]} rawSymbols - Stock symbol(s) e.g. 'RELIANCE' or ['RELIANCE', 'TCS']
   * @param {Function} callback - Callback called on every tick for this symbol: (quote) => void
   * @returns {Function} - Unsubscribe function
   */
  subscribe(rawSymbols, callback) {
    const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols];
    const cleaned = symbols
      .map((s) => (s ? String(s).toUpperCase().replace(/\.(NS|BO)$/i, '') : ''))
      .filter(Boolean);

    cleaned.forEach((sym) => {
      if (!this.subscribers.has(sym)) {
        this.subscribers.set(sym, new Set());
      }
      this.subscribers.get(sym).add(callback);
      this.subscriptions.add(sym);
    });

    this._ensureConnected();

    // Return cleanup
    return () => {
      cleaned.forEach((sym) => {
        const set = this.subscribers.get(sym);
        if (set) {
          set.delete(callback);
          if (set.size === 0) {
            this.subscribers.delete(sym);
            this.subscriptions.delete(sym);
          }
        }
      });

      // If no active subscriptions, can gracefully disconnect after timeout
      if (this.subscriptions.size === 0 && this.alertListeners.size === 0) {
        this._scheduleIdleDisconnect();
      }
    };
  }

  _scheduleIdleDisconnect() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      if (this.subscriptions.size === 0 && this.alertListeners.size === 0) {
        this.disconnect();
      }
    }, 30000); // Keep alive for 30s in case user navigates to another stock
  }

  _ensureConnected() {
    if (this._idleTimer) {
      clearTimeout(this._idleTimer);
      this._idleTimer = null;
    }

    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
      return;
    }

    this._connect();
  }

  _connect() {
    if (typeof window === 'undefined' || !window.EventSource) {
      console.warn('[RealtimeClient] EventSource not supported in this environment.');
      return;
    }

    this._setStatus('CONNECTING');

    const params = new URLSearchParams();
    if (this.subscriptions.size > 0) {
      params.set('symbols', Array.from(this.subscriptions).join(','));
    }
    if (this.authToken) {
      params.set('token', this.authToken);
    }

    const streamUrl = `${API_BASE_URL}/stocks/stream?${params.toString()}`;

    try {
      if (this.eventSource) {
        this.eventSource.close();
      }

      this.eventSource = new EventSource(streamUrl);

      this.eventSource.onopen = () => {
        this._setStatus('CONNECTED');
        this.reconnectAttempts = 0;
      };

      const dispatchTick = (rawData) => {
        try {
          const payload = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
          const quote = payload.data || payload;
          const rawSym = quote.symbol || quote.ticker || '';
          const symbol = String(rawSym).toUpperCase().replace(/\.(NS|BO)$/i, '');

          if (symbol && this.subscribers.has(symbol)) {
            this.subscribers.get(symbol).forEach((fn) => {
              try {
                fn(quote);
              } catch (err) {
                console.error(`[RealtimeClient] Tick subscriber error for ${symbol}:`, err);
              }
            });
          }

          // Also deliver to wildcard subscribers
          if (this.subscribers.has('*')) {
            this.subscribers.get('*').forEach((fn) => {
              try {
                fn(quote);
              } catch (err) {
                console.error('[RealtimeClient] Wildcard tick subscriber error:', err);
              }
            });
          }
        } catch (err) {
          console.warn('[RealtimeClient] Failed to parse tick event payload:', err);
        }
      };

      // 1. Named 'tick' events
      this.eventSource.addEventListener('tick', (e) => {
        dispatchTick(e.data);
      });

      // Default message listener fallback
      this.eventSource.onmessage = (e) => {
        dispatchTick(e.data);
      };

      // 2. Heartbeat events
      this.eventSource.addEventListener('heartbeat', (e) => {
        try {
          const data = JSON.parse(e.data);
          this.lastHeartbeat = data;
          this.heartbeatListeners.forEach((fn) => {
            try {
              fn(data);
            } catch (err) {
              console.error('[RealtimeClient] Heartbeat listener error:', err);
            }
          });
        } catch (err) {
          console.warn('[RealtimeClient] Failed to parse heartbeat:', err);
        }
      });

      // 3. User Alert notifications
      this.eventSource.addEventListener('alert', (e) => {
        try {
          const alertData = JSON.parse(e.data);
          this.alertListeners.forEach((fn) => {
            try {
              fn(alertData);
            } catch (err) {
              console.error('[RealtimeClient] Alert listener error:', err);
            }
          });
        } catch (err) {
          console.warn('[RealtimeClient] Failed to parse alert event:', err);
        }
      });

      this.eventSource.onerror = (err) => {
        console.warn('[RealtimeClient] EventSource connection error:', err);
        this._setStatus('DISCONNECTED');
        this.eventSource.close();
        this.eventSource = null;
        this._scheduleReconnect();
      };
    } catch (err) {
      console.error('[RealtimeClient] Failed to initialize EventSource:', err);
      this._setStatus('DISCONNECTED');
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[RealtimeClient] Max reconnection attempts reached.');
      return;
    }

    const backoffMs = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts += 1;

    this.reconnectTimer = setTimeout(() => {
      if (this.subscriptions.size > 0 || this.alertListeners.size > 0) {
        this._connect();
      }
    }, backoffMs);
  }

  reconnect() {
    this.disconnect();
    this.reconnectAttempts = 0;
    this._connect();
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this._setStatus('DISCONNECTED');
  }
}

// Export singleton instance
export const realtimeClient = new RealtimeClient();
export default realtimeClient;
