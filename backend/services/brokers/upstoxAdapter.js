const axios = require('axios');
const BrokerAdapter = require('./brokerInterface');
const { normalizeHoldings } = require('./holdingsNormalizer');

class UpstoxAdapter extends BrokerAdapter {
  constructor() {
    super('upstox', 'Upstox');
    this.apiKey = process.env.UPSTOX_API_KEY || '';
    this.apiSecret = process.env.UPSTOX_API_SECRET || '';
    this.redirectUri = process.env.UPSTOX_REDIRECT_URI || 'http://localhost:5050/api/brokers/upstox/callback';
    this.apiBase = 'https://api.upstox.com/v2';
  }

  isConfigured() {
    return Boolean(this.apiKey && this.apiSecret);
  }

  getCapabilities() {
    return {
      holdings: true,
      positions: true,
      orderHistory: false, // Enforcing read-only
      readOnlyEnforced: true,
      authType: 'oauth2_authorization_code',
      sessionPolicy: 'daily',
      officialDocs: 'https://upstox.com/developer/api-documentation/',
    };
  }

  async getAuthorizationUrl(userId, state) {
    if (!this.apiKey) {
      return {
        configured: false,
        url: null,
        message: 'Upstox API credentials (UPSTOX_API_KEY) not configured in server environment.',
        officialDocs: 'https://upstox.com/developer/api-documentation/',
      };
    }

    const redirect = encodeURIComponent(this.redirectUri);
    const url = `${this.apiBase}/login/authorization/dialog?response_type=code&client_id=${this.apiKey}&redirect_uri=${redirect}&state=${state}`;

    return {
      configured: true,
      url,
      broker: this.brokerId,
      state,
    };
  }

  async handleCallback({ code, state }) {
    if (!code) {
      throw new Error('Missing authorization code in Upstox callback');
    }

    if (!this.isConfigured()) {
      throw new Error('Upstox API credentials not configured');
    }

    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', this.apiKey);
    params.append('client_secret', this.apiSecret);
    params.append('redirect_uri', this.redirectUri);
    params.append('grant_type', 'authorization_code');

    const response = await axios.post(`${this.apiBase}/login/authorization/token`, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data || !data.access_token) {
      throw new Error('Failed to obtain Upstox access token from callback');
    }

    const expiry = new Date();
    expiry.setHours(23, 59, 59, 999);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || null,
      externalAccountId: data.user_id || null,
      accountMaskedId: data.user_id ? `UPS-•••${data.user_id.slice(-4)}` : null,
      userName: data.user_name || null,
      tokenExpiresAt: expiry,
    };
  }

  async fetchHoldings(connection, decryptedToken) {
    if (!decryptedToken) {
      throw new Error('Missing decrypted access token for Upstox holdings query');
    }

    const response = await axios.get(`${this.apiBase}/portfolio/long-term-holdings`, {
      headers: {
        Authorization: `Bearer ${decryptedToken}`,
        Accept: 'application/json',
      },
      timeout: 12000,
    });

    const body = response.data;
    if (body.status !== 'success' || !Array.isArray(body.data)) {
      throw new Error(body.message || 'Invalid Upstox holdings API response');
    }

    return normalizeHoldings('upstox', body.data);
  }
}

module.exports = UpstoxAdapter;
