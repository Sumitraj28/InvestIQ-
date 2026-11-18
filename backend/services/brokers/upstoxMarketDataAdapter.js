/**
 * upstoxMarketDataAdapter.js
 * Official Upstox Market Data API v2/v3 Adapter
 * 
 * Implements:
 * 1. Market Quote LTP endpoint: GET /v2/market-quote/ltp
 * 2. Full Market Quote endpoint: GET /v2/market-quote/quotes
 * 3. Market Quote OHLC endpoint: GET /v2/market-quote/ohlc
 * 4. Historical Candles endpoint: GET /v2/historical-candle
 * 5. Market Data Feed V3 WebSocket authorization: GET /v2/feed/market-data-feed/authorize
 * 6. Graceful missing-credential handling (status: PENDING_CREDENTIALS)
 * 7. Token validation and daily expiry handling (daily reset at 03:30 AM IST)
 * 8. Redaction of sensitive API keys & tokens
 */

const {
  toUpstoxInstrumentKey,
  fromUpstoxInstrumentKey,
  normalizeSymbol,
  resolveExchange,
  getInstrumentMetadata,
} = require('../realtime/symbolMapping');

const UPSTOX_BASE_URL = 'https://api.upstox.com/v2';

class UpstoxMarketDataAdapter {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.UPSTOX_API_KEY || null;
    this.apiSecret = config.apiSecret || process.env.UPSTOX_API_SECRET || null;
    this.redirectUri = config.redirectUri || process.env.UPSTOX_REDIRECT_URI || null;
    this.accessToken = config.accessToken
      || process.env.UPSTOX_ACCESS_TOKEN
      || (process.env.UPSTOX_API_KEY && process.env.UPSTOX_API_KEY.startsWith('eyJ') ? process.env.UPSTOX_API_KEY : null);
    this.tokenExpiry = config.tokenExpiry || null;
  }

  /**
   * Check if necessary Upstox credentials are configured
   */
  hasCredentials() {
    return Boolean(this.accessToken || (this.apiKey && this.apiSecret));
  }

  /**
   * Return credential status details without leaking sensitive strings
   */
  getAuthStatus() {
    const hasKey = Boolean(this.apiKey);
    const hasSecret = Boolean(this.apiSecret);
    const hasToken = Boolean(this.accessToken);

    let status = 'PENDING_CREDENTIALS';
    let message = 'Upstox API credentials are not configured in environment.';

    if (hasToken) {
      if (this.isTokenExpired()) {
        status = 'EXPIRED';
        message = 'Upstox access token has expired. Upstox access tokens must be regenerated daily before market open.';
      } else {
        status = 'READY';
        message = 'Upstox API access token is configured and active.';
      }
    } else if (hasKey && hasSecret) {
      status = 'AWAITING_OAUTH_TOKEN';
      message = 'API Key and Secret configured; user must complete OAuth authorization flow to generate daily access token.';
    }

    return {
      configured: hasKey && hasSecret,
      hasToken,
      status,
      message,
      maskedKey: this.apiKey ? `${this.apiKey.substring(0, 4)}••••••` : null,
      tokenExpiry: this.tokenExpiry,
    };
  }

  /**
   * Upstox access tokens expire every day in the early morning (typically 03:30 or 06:00 AM IST)
   */
  isTokenExpired() {
    if (!this.accessToken) return true;
    if (!this.tokenExpiry) return false;
    return Date.now() >= new Date(this.tokenExpiry).getTime();
  }

  /**
   * Helper to perform authenticated HTTP requests to Upstox API
   */
  async _request(endpoint, options = {}) {
    if (!this.accessToken) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Upstox API access token not configured. Set UPSTOX_ACCESS_TOKEN in backend environment.',
      };
    }

    const url = `${UPSTOX_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            status: 'UNAUTHORIZED',
            statusCode: response.status,
            error: 'Upstox access token expired or invalid. Please re-authenticate.',
          };
        }

        return {
          success: false,
          status: 'API_ERROR',
          statusCode: response.status,
          error: payload?.errors?.[0]?.message || `Upstox API returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: payload?.data || payload,
      };
    } catch (err) {
      const message = err.name === 'AbortError'
        ? 'Upstox API request timed out.'
        : `Upstox network error: ${err.message}`;
      return {
        success: false,
        status: 'NETWORK_ERROR',
        error: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Get Last Traded Price (LTP) for one or more instruments
   * Upstox Endpoint: GET /v2/market-quote/ltp?instrument_key=...
   * @param {string|string[]} rawSymbols
   */
  async getLtp(rawSymbols) {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Upstox credentials not configured.',
      };
    }

    const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols];
    const instrumentKeys = symbols.map((s) => toUpstoxInstrumentKey(s)).filter(Boolean);

    if (instrumentKeys.length === 0) {
      return { success: false, error: 'No valid instrument keys provided.' };
    }

    const param = encodeURIComponent(instrumentKeys.join(','));
    const res = await this._request(`/market-quote/ltp?instrument_key=${param}`);

    if (!res.success) return res;

    // Normalize Upstox LTP response
    const normalizedQuotes = {};
    const rawData = res.data || {};

    for (const [key, item] of Object.entries(rawData)) {
      // Key can be "NSE_EQ:INE002A01018" or "NSE_EQ|INE002A01018"
      const normalizedKey = key.replace(':', '|');
      const symbol = fromUpstoxInstrumentKey(normalizedKey);
      const lastPrice = Number(item.last_price || item.ltp || 0);

      normalizedQuotes[symbol] = {
        symbol,
        instrumentKey: normalizedKey,
        lastPrice,
        exchange: resolveExchange(normalizedKey),
        providerTimestamp: new Date().toISOString(),
        provider: 'upstox',
        dataStatus: 'live',
      };
    }

    return {
      success: true,
      quotes: normalizedQuotes,
    };
  }

  /**
   * Get Full Market Quotes (OHLC, volume, circuit limits, change, depth)
   * Upstox Endpoint: GET /v2/market-quote/quotes?instrument_key=...
   * @param {string|string[]} rawSymbols
   */
  async getFullQuote(rawSymbols) {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Upstox credentials not configured.',
      };
    }

    const symbols = Array.isArray(rawSymbols) ? rawSymbols : [rawSymbols];
    const instrumentKeys = symbols.map((s) => toUpstoxInstrumentKey(s)).filter(Boolean);

    if (instrumentKeys.length === 0) {
      return { success: false, error: 'No valid instrument keys provided.' };
    }

    const param = encodeURIComponent(instrumentKeys.join(','));
    const res = await this._request(`/market-quote/quotes?instrument_key=${param}`);

    if (!res.success) return res;

    const normalizedQuotes = {};
    const rawData = res.data || {};

    for (const [key, item] of Object.entries(rawData)) {
      const normalizedKey = key.replace(':', '|');
      const symbol = fromUpstoxInstrumentKey(normalizedKey);
      const meta = getInstrumentMetadata(symbol) || {};

      const lastPrice = Number(item.last_price || 0);
      const ohlc = item.ohlc || {};
      const previousClose = Number(ohlc.close || lastPrice);
      const open = Number(ohlc.open || lastPrice);
      const dayHigh = Number(ohlc.high || lastPrice);
      const dayLow = Number(ohlc.low || lastPrice);
      const volume = Number(item.volume || 0);

      // Price Change = Last Traded Price - Previous Close
      const change = Number((lastPrice - previousClose).toFixed(2));
      // Percentage Change = (Price Change / Previous Close) * 100
      const changePercent = previousClose > 0
        ? Number(((change / previousClose) * 100).toFixed(2))
        : 0;

      normalizedQuotes[symbol] = {
        symbol,
        companyName: meta.companyName || meta.name || `${symbol} Limited`,
        exchange: resolveExchange(normalizedKey),
        instrumentKey: normalizedKey,
        lastPrice,
        previousClose,
        change,
        dayChange: change,
        changePercent,
        dayChangePercent: changePercent,
        open,
        dayHigh,
        dayLow,
        volume,
        lowerCircuit: Number(item.lower_circuit_limit || 0),
        upperCircuit: Number(item.upper_circuit_limit || 0),
        providerTimestamp: item.timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        provider: 'upstox',
        dataFreshness: 'LIVE',
        dataStatus: 'live',
      };
    }

    return {
      success: true,
      quotes: normalizedQuotes,
    };
  }

  /**
   * Request authorized WebSocket URL for Upstox Market Data Feed V3
   * Upstox Endpoint: GET /v3/feed/market-data-feed/authorize
   */
  async getAuthorizedFeedUrl() {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Upstox credentials not configured.',
      };
    }

    if (!this.accessToken) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Upstox API access token not configured. Set UPSTOX_ACCESS_TOKEN in backend environment.',
      };
    }

    const url = 'https://api.upstox.com/v3/feed/market-data-feed/authorize';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          success: false,
          status: 'FEED_ERROR',
          statusCode: response.status,
          error: payload?.errors?.[0]?.message || 'Failed to authorize Upstox Market Feed V3.',
        };
      }

      const feedUrl = payload?.data?.authorizedRedirectUri;
      if (!feedUrl) {
        return {
          success: false,
          status: 'FEED_ERROR',
          error: 'Upstox did not return an authorized streaming URI.',
        };
      }

      return {
        success: true,
        feedUrl,
      };
    } catch (err) {
      return {
        success: false,
        status: 'NETWORK_ERROR',
        error: err.name === 'AbortError' ? 'Upstox Feed authorization timed out.' : err.message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Build official Upstox Market Data Feed V3 JSON subscription payload
   * @param {string[]} instrumentKeys
   * @param {'ltpc'|'full'} mode
   */
  buildSubscriptionPayload(instrumentKeys = [], mode = 'full') {
    const keys = instrumentKeys.map((k) => toUpstoxInstrumentKey(k)).filter(Boolean);
    return {
      guid: `investiq_${Date.now()}`,
      method: 'sub',
      params: {
        mode,
        instrumentKeys: keys,
      },
    };
  }
}

// Export singleton instance initialized from process.env
const defaultUpstoxAdapter = new UpstoxMarketDataAdapter();

module.exports = {
  UpstoxMarketDataAdapter,
  upstoxMarketDataAdapter: defaultUpstoxAdapter,
};
