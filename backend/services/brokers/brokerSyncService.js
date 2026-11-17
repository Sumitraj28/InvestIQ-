const ZerodhaAdapter = require('./zerodhaAdapter');
const UpstoxAdapter = require('./upstoxAdapter');
const AngelOneAdapter = require('./angelOneAdapter');
const GrowwAdapter = require('./growwAdapter');
const { decrypt } = require('../cryptoService');
const portfolioStore = require('../portfolioStore');

// Instantiate adapters
const adapters = {
  zerodha: new ZerodhaAdapter(),
  upstox: new UpstoxAdapter(),
  angelone: new AngelOneAdapter(),
  groww: new GrowwAdapter(),
};

// Rate-limiting: minimum interval between manual sync requests per broker connection (60 seconds)
const MIN_SYNC_INTERVAL_MS = 60 * 1000;

function getAdapter(brokerId) {
  const adapter = adapters[brokerId];
  if (!adapter) {
    throw new Error(`Unsupported broker: ${brokerId}`);
  }
  return adapter;
}

/**
 * Get catalog of all supported brokers, configuration status, and capabilities
 */
function getBrokersCatalog() {
  return [
    {
      id: 'zerodha',
      name: 'Zerodha Kite',
      logo: 'zerodha',
      capabilities: adapters.zerodha.getCapabilities(),
      configured: adapters.zerodha.isConfigured(),
      status: adapters.zerodha.isConfigured() ? 'supported' : 'requires_config',
      authMethod: 'OAuth 2.0 (Request Token)',
      officialUrl: 'https://kite.zerodha.com',
      officialDocs: 'https://kite.trade/docs/connect/v3/',
    },
    {
      id: 'upstox',
      name: 'Upstox',
      logo: 'upstox',
      capabilities: adapters.upstox.getCapabilities(),
      configured: adapters.upstox.isConfigured(),
      status: adapters.upstox.isConfigured() ? 'supported' : 'requires_config',
      authMethod: 'OAuth 2.0 (Authorization Code)',
      officialUrl: 'https://pro.upstox.com',
      officialDocs: 'https://upstox.com/developer/api-documentation/',
    },
    {
      id: 'angelone',
      name: 'Angel One',
      logo: 'angelone',
      capabilities: adapters.angelone.getCapabilities(),
      configured: false,
      status: 'restricted',
      authMethod: 'SmartAPI (Requires PIN/TOTP - Disabled in InvestIQ)',
      officialUrl: 'https://trade.angelone.in',
      officialDocs: 'https://smartapi.angelbroking.com/docs',
    },
    {
      id: 'groww',
      name: 'Groww',
      logo: 'groww',
      capabilities: adapters.groww.getCapabilities(),
      configured: false,
      status: 'unsupported',
      authMethod: 'Enterprise Partner Only (No Retail OAuth)',
      officialUrl: 'https://groww.in',
      officialDocs: 'https://groww.in',
    },
  ];
}

/**
 * Execute synchronized fetch of holdings for a connected broker
 */
async function syncBrokerHoldings(userId, brokerId) {
  const connection = await portfolioStore.getBrokerConnection(userId, brokerId);
  if (!connection) {
    throw new Error(`No connection found for ${brokerId}`);
  }

  // Rate-limiting check
  const lastAttempt = connection.lastAttemptedSyncAt ? new Date(connection.lastAttemptedSyncAt).getTime() : 0;
  const elapsed = Date.now() - lastAttempt;
  if (elapsed < MIN_SYNC_INTERVAL_MS) {
    const waitSecs = Math.ceil((MIN_SYNC_INTERVAL_MS - elapsed) / 1000);
    const err = new Error(`Rate limit: Please wait ${waitSecs}s before synchronizing again.`);
    err.status = 429;
    throw err;
  }

  // Check token expiration
  if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt).getTime() < Date.now()) {
    await portfolioStore.updateBrokerConnection(userId, brokerId, {
      connectionStatus: 'expired',
      lastErrorMessage: 'Broker session expired. Please reauthorize your account.',
    });
    const err = new Error('Broker session expired. Please reauthorize your account.');
    err.status = 401;
    throw err;
  }

  const adapter = getAdapter(brokerId);
  await portfolioStore.updateBrokerConnection(userId, brokerId, {
    connectionStatus: 'syncing',
    lastAttemptedSyncAt: new Date(),
  });

  try {
    let decryptedToken = null;
    if (connection.encryptedAccessToken) {
      decryptedToken = decrypt(connection.encryptedAccessToken);
    }

    const normalizedHoldings = await adapter.fetchHoldings(connection, decryptedToken);

    // Save holdings into persistence layer
    await portfolioStore.saveSyncedHoldings(userId, brokerId, normalizedHoldings);

    // Update connection status
    await portfolioStore.updateBrokerConnection(userId, brokerId, {
      connectionStatus: 'connected',
      lastSuccessfulSyncAt: new Date(),
      lastErrorMessage: null,
    });

    return {
      success: true,
      broker: brokerId,
      holdingsCount: normalizedHoldings.length,
      syncedAt: new Date().toISOString(),
    };
  } catch (syncErr) {
    console.error(`[BrokerSyncService] Sync failed for ${brokerId}:`, syncErr.message);
    const isAuthError = syncErr.response?.status === 401 || syncErr.response?.status === 403;
    const newStatus = isAuthError ? 'reauth_required' : 'connected';

    await portfolioStore.updateBrokerConnection(userId, brokerId, {
      connectionStatus: newStatus,
      lastErrorMessage: syncErr.message,
    });

    throw syncErr;
  }
}

module.exports = {
  getBrokersCatalog,
  getAdapter,
  syncBrokerHoldings,
  MIN_SYNC_INTERVAL_MS,
};
