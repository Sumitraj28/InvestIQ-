/**
 * Base Abstract Interface for Broker Adapters
 * Enforces uniform integration methods across Zerodha, Upstox, Angel One, and Groww.
 */
class BrokerAdapter {
  constructor(brokerId, displayName) {
    this.brokerId = brokerId;
    this.displayName = displayName;
  }

  getBrokerId() {
    return this.brokerId;
  }

  getDisplayName() {
    return this.displayName;
  }

  /**
   * Returns whether environment credentials for this broker are configured.
   */
  isConfigured() {
    return false;
  }

  /**
   * Capabilities supported by this broker adapter.
   */
  getCapabilities() {
    return {
      holdings: false,
      positions: false,
      orderHistory: false,
      readOnlyEnforced: true,
      authType: 'oauth2',
      sessionPolicy: 'daily',
    };
  }

  /**
   * Generates official broker OAuth redirect URL.
   */
  async getAuthorizationUrl(userId, state) {
    throw new Error(`getAuthorizationUrl not implemented for ${this.brokerId}`);
  }

  /**
   * Handles OAuth callback, exchanges code for access token.
   */
  async handleCallback({ code, state, req }) {
    throw new Error(`handleCallback not implemented for ${this.brokerId}`);
  }

  /**
   * Fetches holdings from broker API using decrypted access token.
   */
  async fetchHoldings(connection) {
    throw new Error(`fetchHoldings not implemented for ${this.brokerId}`);
  }

  /**
   * Revokes token with broker if supported.
   */
  async revokeConnection(connection) {
    return { success: true, message: 'Local connection session terminated.' };
  }
}

module.exports = BrokerAdapter;
