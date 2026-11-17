const crypto = require('crypto');
const axios = require('axios');
const BrokerAdapter = require('./brokerInterface');
const { normalizeHoldings } = require('./holdingsNormalizer');

class ZerodhaAdapter extends BrokerAdapter {
  constructor() {
    super('zerodha', 'Zerodha Kite');
    this.apiKey = process.env.ZERODHA_API_KEY || '';
    this.apiSecret = process.env.ZERODHA_API_SECRET || '';
    this.redirectUri = process.env.ZERODHA_REDIRECT_URI || 'http://localhost:5050/api/brokers/zerodha/callback';
    this.apiBase = 'https://api.kite.trade';
    this.loginBase = 'https://kite.zerodha.com/connect/login';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiSecret);
  }

  getCapabilities() {
    return {
      holdings: true,
      positions: true,
      orderHistory: false, // Strictly disabled in InvestIQ (read-only portfolio tracking)
      readOnlyEnforced: true,
      authType: 'oauth2_request_token',
      sessionPolicy: 'daily_reset_6am',
      officialDocs: 'https://kite.trade/docs/connect/v3/',
    };
  }

  async getAuthorizationUrl(userId, state) {
    if (!this.apiKey) {
      return {
        configured: false,
        url: null,
        message: 'Zerodha Kite Connect credentials (ZERODHA_API_KEY) not configured in server environment.',
        officialDocs: 'https://kite.trade/docs/connect/v3/',
      };
    }

    const redirect = encodeURIComponent(this.redirectUri);
    const url = `${this.loginBase}?v=3&api_key=${this.apiKey}&redirect_uri=${redirect}&state=${state}`;

    return {
      configured: true,
      url,
      broker: this.brokerId,
      state,
    };
  }

  async handleCallback({ code, state, req }) {
    const requestToken = code || req?.query?.request_token;
    if (!requestToken) {
      throw new Error('Missing request_token in Zerodha callback');
    }

    if (!this.isConfigured()) {
      throw new Error('Zerodha API credentials not configured');
    }

    // Kite Connect checksum: SHA-256(api_key + request_token + api_secret)
    const checksumPayload = `${this.apiKey}${requestToken}${this.apiSecret}`;
    const checksum = crypto.createHash('sha256').update(checksumPayload).digest('hex');

    const params = new URLSearchParams();
    params.append('api_key', this.apiKey);
    params.append('request_token', requestToken);
    params.append('checksum', checksum);

    const response = await axios.post(`${this.apiBase}/session/token`, params.toString(), {
      headers: {
        'X-Kite-Version': '3',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    const body = response.data;
    if (body.status !== 'success' || !body.data || !body.data.access_token) {
      throw new Error(body.message || 'Failed to exchange Zerodha request_token');
    }

    const data = body.data;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      externalAccountId: data.user_id || null,
      accountMaskedId: data.user_id ? `ZER-•••${data.user_id.slice(-4)}` : null,
      userName: data.user_name || null,
      tokenExpiresAt: this.calculateDailyExpiry(),
    };
  }

  async fetchHoldings(connection, decryptedToken) {
    if (!decryptedToken) {
      throw new Error('Missing decrypted access token for Zerodha holdings query');
    }

    const response = await axios.get(`${this.apiBase}/portfolio/holdings`, {
      headers: {
        'X-Kite-Version': '3',
        Authorization: `token ${this.apiKey}:${decryptedToken}`,
      },
      timeout: 12000,
    });

    const body = response.data;
    if (body.status !== 'success' || !Array.isArray(body.data)) {
      throw new Error(body.message || 'Invalid Zerodha holdings API response');
    }

    return normalizeHoldings('zerodha', body.data);
  }

  calculateDailyExpiry() {
    // Kite Connect tokens expire daily at 06:00 AM IST
    const now = new Date();
    const expiry = new Date(now);
    expiry.setHours(23, 59, 59, 999);
    return expiry;
  }
}

module.exports = ZerodhaAdapter;
