/**
 * growwMarketDataAdapter.js
 * Official Groww Trading API v1 Market Data Adapter
 * 
 * Implements:
 * 1. Live Data Quote API: GET /v1/live-data/quote?exchange=NSE&segment=CASH&trading_symbol=...
 * 2. Live Data LTP API: GET /v1/live-data/ltp?exchange=NSE&segment=CASH&trading_symbol=...
 * 3. Live Data OHLC API: GET /v1/live-data/ohlc?exchange=NSE&segment=CASH&trading_symbol=...
 * 4. Header specification:
 *    - Authorization: Bearer {GROWW_ACCESS_TOKEN}
 *    - X-API-VERSION: 1.0
 *    - Accept: application/json
 * 5. Graceful missing-credential handling (status: PENDING_CREDENTIALS)
 * 6. Secret key & token redaction in logs/status outputs
 */

const {
  normalizeSymbol,
  resolveExchange,
  getInstrumentMetadata,
} = require('../realtime/symbolMapping');

const GROWW_BASE_URL = 'https://api.groww.in/v1';

class GrowwMarketDataAdapter {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.GROWW_API_KEY || null;
    this.apiSecret = config.apiSecret || process.env.GROWW_API_SECRET || null;
    // Auto-detect if GROWW_API_KEY is actually a JWT token
    this.accessToken = config.accessToken || process.env.GROWW_ACCESS_TOKEN || (this.apiKey && this.apiKey.startsWith('eyJ') ? this.apiKey : null);
    
    // Safely parse claims if access token is a JWT
    this.tokenClaims = this._parseJwtPayload(this.accessToken);
    this.tokenExpiry = config.tokenExpiry || (this.tokenClaims?.exp ? new Date(this.tokenClaims.exp * 1000).toISOString() : null);
  }

  /**
   * Safe JWT payload extractor without external dependencies
   */
  _parseJwtPayload(token) {
    if (!token || typeof token !== 'string' || !token.startsWith('eyJ')) return null;
    try {
      const parts = token.split('.');
      if (parts.length >= 2) {
        return JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Check if necessary Groww credentials are configured
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
    let message = 'Groww API credentials are not configured in environment.';
    let registeredIp = null;

    if (this.tokenClaims?.sub) {
      try {
        const subData = typeof this.tokenClaims.sub === 'string' ? JSON.parse(this.tokenClaims.sub) : this.tokenClaims.sub;
        if (subData?.sourceIpAddress) registeredIp = subData.sourceIpAddress;
      } catch {}
    }

    if (hasToken) {
      if (this.isTokenExpired()) {
        status = 'EXPIRED';
        message = 'Groww access token has expired. Groww tokens must be refreshed daily.';
      } else {
        status = 'READY';
        message = 'Groww Trading API access token is configured and active.';
      }
    } else if (hasKey && hasSecret) {
      status = 'AWAITING_ACCESS_TOKEN';
      message = 'Groww API Key & Secret configured; generate daily Bearer token via Groww dashboard or TOTP.';
    }

    return {
      configured: hasKey || hasToken,
      hasToken,
      status,
      message,
      maskedKey: this.apiKey ? `${this.apiKey.substring(0, 4)}••••••` : null,
      tokenExpiry: this.tokenExpiry,
      registeredIp,
    };
  }

  /**
   * Check if token is past expiry
   */
  isTokenExpired() {
    if (!this.accessToken) return true;
    if (!this.tokenExpiry) return false;
    return Date.now() >= new Date(this.tokenExpiry).getTime();
  }

  /**
   * Helper to perform authenticated HTTP requests to Groww Trading API
   */
  async _request(endpoint, options = {}) {
    if (!this.accessToken) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Groww access token not configured. Set GROWW_ACCESS_TOKEN in backend environment.',
      };
    }

    const url = `${GROWW_BASE_URL}${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        method: options.method || 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${this.accessToken}`,
          'X-API-VERSION': '1.0',
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const is403 = response.status === 403;
          let errorMessage = 'Groww access token is expired or invalid.';
          if (is403) {
            errorMessage = 'Groww API returned 403 Forbidden. Possible causes: 1) IP mismatch: the client public IP is not in your Groww whitelisted IPs, or 2) The Groww Trading API subscription (~₹499/mo) is inactive.';
          }
          return {
            success: false,
            status: is403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
            statusCode: response.status,
            error: errorMessage,
            rawError: payload?.error || null,
          };
        }

        return {
          success: false,
          status: 'API_ERROR',
          statusCode: response.status,
          error: payload?.message || payload?.error || `Groww API returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: payload?.data || payload,
      };
    } catch (err) {
      const message = err.name === 'AbortError'
        ? 'Groww API request timed out.'
        : `Groww network error: ${err.message}`;
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
   * Get Last Traded Price (LTP) for a symbol via Groww Live Data API
   * Endpoint: GET /v1/live-data/ltp?exchange=NSE&segment=CASH&trading_symbol=RELIANCE
   */
  async getLtp(rawSymbol) {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Groww credentials not configured.',
      };
    }

    const symbol = normalizeSymbol(rawSymbol);
    const exchange = resolveExchange(rawSymbol);
    const segment = symbol.startsWith('^') ? 'INDEX' : 'CASH';
    const tradingSymbol = symbol.startsWith('^') ? symbol.replace('^', '') : symbol;

    const res = await this._request(
      `/live-data/ltp?exchange=${exchange}&segment=${segment}&trading_symbol=${encodeURIComponent(tradingSymbol)}`
    );

    if (!res.success) return res;

    const ltp = Number(res.data?.ltp || res.data?.last_price || 0);

    return {
      success: true,
      quote: {
        symbol,
        exchange,
        lastPrice: ltp,
        providerTimestamp: new Date().toISOString(),
        provider: 'groww',
        dataStatus: 'live',
      },
    };
  }

  /**
   * Get Full Quote for a symbol via Groww Live Data API
   * Endpoint: GET /v1/live-data/quote?exchange=NSE&segment=CASH&trading_symbol=RELIANCE
   */
  async getFullQuote(rawSymbol) {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        error: 'Groww credentials not configured.',
      };
    }

    const symbol = normalizeSymbol(rawSymbol);
    const exchange = resolveExchange(rawSymbol);
    const segment = symbol.startsWith('^') ? 'INDEX' : 'CASH';
    const tradingSymbol = symbol.startsWith('^') ? symbol.replace('^', '') : symbol;

    const res = await this._request(
      `/live-data/quote?exchange=${exchange}&segment=${segment}&trading_symbol=${encodeURIComponent(tradingSymbol)}`
    );

    if (!res.success) return res;

    const rawData = res.data || {};
    const ohlc = rawData.ohlc || {};
    const meta = getInstrumentMetadata(symbol) || {};

    const lastPrice = Number(rawData.ltp || rawData.last_price || ohlc.close || 0);
    const previousClose = Number(ohlc.close || rawData.previous_close || rawData.close || lastPrice);
    const open = Number(ohlc.open || rawData.open || lastPrice);
    const dayHigh = Number(ohlc.high || rawData.high || lastPrice);
    const dayLow = Number(ohlc.low || rawData.low || lastPrice);
    const volume = Number(rawData.volume || rawData.total_traded_volume || 0);

    // Price Change = Last Traded Price - Previous Close
    const change = Number((lastPrice - previousClose).toFixed(2));
    // Percentage Change = (Price Change / Previous Close) * 100
    const changePercent = previousClose > 0
      ? Number(((change / previousClose) * 100).toFixed(2))
      : 0;

    return {
      success: true,
      quote: {
        symbol,
        companyName: meta.companyName || meta.name || `${symbol} Limited`,
        exchange,
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
        lowerCircuit: Number(rawData.lower_circuit_limit || rawData.lower_circuit || 0),
        upperCircuit: Number(rawData.upper_circuit_limit || rawData.upper_circuit || 0),
        providerTimestamp: rawData.timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        provider: 'groww',
        dataFreshness: 'LIVE',
        dataStatus: 'live',
      },
    };
  }

  /**
   * Diagnostic verification helper to check token, profile, and connectivity
   */
  async verifyConnection() {
    if (!this.hasCredentials()) {
      return {
        success: false,
        status: 'PENDING_CREDENTIALS',
        message: 'No Groww credentials configured.',
      };
    }

    // 1. Query account profile
    const profileRes = await this._request('/user/profile');
    let profileData = null;
    if (profileRes.success && profileRes.data) {
      profileData = profileRes.data?.success?.data || profileRes.data?.data || profileRes.data;
    }

    // 2. Test live LTP endpoint
    const ltpRes = await this.getLtp('RELIANCE');
    if (ltpRes.success) {
      return {
        success: true,
        status: 'CONNECTED',
        message: 'Groww API verified successfully. Live quotes active.',
        profile: profileData ? {
          ucc: profileData.ucc,
          nseEnabled: profileData.nseEnabled,
          bseEnabled: profileData.bseEnabled,
          activeSegments: profileData.activeSegments || [],
        } : null,
        sampleQuote: ltpRes.quote,
      };
    }

    // If profile query succeeded but live quotes returned 403, diagnose segment activation
    if (profileData && (!profileData.nseEnabled && !profileData.bseEnabled)) {
      return {
        success: false,
        status: 'SEGMENTS_INACTIVE',
        statusCode: 403,
        message: `Groww account connected (UCC: ${profileData.ucc || 'N/A'}), but NSE/BSE segments are currently inactive (nseEnabled: false, bseEnabled: false). Please activate stock trading segments in your Groww profile settings.`,
        profile: {
          ucc: profileData.ucc,
          nseEnabled: profileData.nseEnabled,
          bseEnabled: profileData.bseEnabled,
          activeSegments: profileData.activeSegments || [],
        },
        error: ltpRes.error,
      };
    }

    return {
      success: false,
      status: ltpRes.status,
      statusCode: ltpRes.statusCode,
      error: ltpRes.error,
      profile: profileData,
    };
  }
}

// Export singleton instance initialized from process.env
const defaultGrowwAdapter = new GrowwMarketDataAdapter();

module.exports = {
  GrowwMarketDataAdapter,
  growwMarketDataAdapter: defaultGrowwAdapter,
};
