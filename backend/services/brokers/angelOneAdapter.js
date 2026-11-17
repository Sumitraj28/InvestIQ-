const BrokerAdapter = require('./brokerInterface');

class AngelOneAdapter extends BrokerAdapter {
  constructor() {
    super('angelone', 'Angel One');
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
      authType: 'credentials_restricted',
      sessionPolicy: 'none',
      status: 'restricted',
      officialDocs: 'https://smartapi.angelbroking.com/docs',
      reason:
        'Angel One SmartAPI requires collecting client login credentials, PINs, and TOTP secrets directly. InvestIQ enforces zero-credential storage and refuses to collect user broker passwords or TOTP codes.',
    };
  }

  async getAuthorizationUrl(userId, state) {
    return {
      configured: false,
      status: 'restricted',
      url: null,
      message:
        'Angel One SmartAPI does not currently offer a zero-credential browser-redirect OAuth flow for retail third-party apps. Direct login via InvestIQ is disabled for your security.',
      officialDocs: 'https://smartapi.angelbroking.com/docs',
    };
  }

  async handleCallback() {
    throw new Error('OAuth callback is not supported by Angel One without credential collection');
  }

  async fetchHoldings() {
    throw new Error('Holdings sync is restricted for Angel One due to credential security policies.');
  }
}

module.exports = AngelOneAdapter;
