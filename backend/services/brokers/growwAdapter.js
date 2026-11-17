const BrokerAdapter = require('./brokerInterface');

class GrowwAdapter extends BrokerAdapter {
  constructor() {
    super('groww', 'Groww');
  }

  isConfigured() {
    return false;
  }

  getCapabilities() {
    return {
      holdings: false,
      positions: false,
      orderHistory: false,
      readOnlyEnforced: true,
      authType: 'unsupported',
      sessionPolicy: 'none',
      status: 'unsupported',
      officialDocs: 'https://groww.in',
      reason:
        'Groww does not provide a public third-party retail OAuth 2.0 consent API for individual investor portfolio reading.',
    };
  }

  async getAuthorizationUrl(userId, state) {
    return {
      configured: false,
      status: 'unsupported',
      url: null,
      message:
        'Automatic account connection is not currently available for Groww. Official retail OAuth is not supported by the broker.',
      officialDocs: 'https://groww.in',
    };
  }

  async handleCallback() {
    throw new Error('OAuth callback is not supported by Groww');
  }

  async fetchHoldings() {
    throw new Error('Automatic holdings sync is unsupported for Groww. Please record purchases manually.');
  }
}

module.exports = GrowwAdapter;
