const express = require('express');
const router = express.Router();
const { requireAuth, getAuthenticatedUserId } = require('../middleware/auth');
const { encrypt, generateStateToken, verifyStateToken } = require('../services/cryptoService');
const portfolioStore = require('../services/portfolioStore');
const {
  getBrokersCatalog,
  getAdapter,
  syncBrokerHoldings,
} = require('../services/brokers/brokerSyncService');

// @route   GET /api/brokers
// @desc    List all supported brokers, capabilities, and configuration state
// @access  Public
router.get('/', (req, res) => {
  try {
    const catalog = getBrokersCatalog();
    res.status(200).json({
      success: true,
      data: catalog,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   GET /api/brokers/connections
// @desc    List authenticated user's broker connections
// @access  Protected
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);
    const connections = await portfolioStore.getBrokerConnections(userId);

    // Merge with catalog so user sees state for all 4 brokers
    const catalog = getBrokersCatalog();
    const connMap = new Map();
    connections.forEach((c) => connMap.set(c.broker, c));

    const enriched = catalog.map((broker) => {
      const conn = connMap.get(broker.id);
      return {
        ...broker,
        connectionStatus: conn ? conn.connectionStatus : (broker.status === 'unsupported' || broker.status === 'restricted' ? broker.status : 'not_connected'),
        accountMaskedId: conn?.accountMaskedId || null,
        lastSuccessfulSyncAt: conn?.lastSuccessfulSyncAt || null,
        lastAttemptedSyncAt: conn?.lastAttemptedSyncAt || null,
        lastErrorMessage: conn?.lastErrorMessage || null,
        tokenExpiresAt: conn?.tokenExpiresAt || null,
        isConnected: conn?.connectionStatus === 'connected',
      };
    });

    res.status(200).json({
      success: true,
      data: enriched,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// @route   POST /api/brokers/:broker/connect
// @desc    Initiate official broker authorization flow
// @access  Protected
router.post('/:broker/connect', requireAuth, async (req, res) => {
  const { broker } = req.params;
  const userId = getAuthenticatedUserId(req);

  try {
    const adapter = getAdapter(broker);
    const stateToken = generateStateToken(userId, broker);

    const authResult = await adapter.getAuthorizationUrl(userId, stateToken);

    if (!authResult.configured || !authResult.url) {
      return res.status(200).json({
        success: false,
        status: authResult.status || 'not_configured',
        message: authResult.message,
        officialDocs: authResult.officialDocs,
      });
    }

    res.status(200).json({
      success: true,
      authorizationUrl: authResult.url,
      state: stateToken,
      broker,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// @route   GET /api/brokers/:broker/callback
// @desc    Handle official broker OAuth callback redirect
// @access  Public (State token verifies user and prevents CSRF)
router.get('/:broker/callback', async (req, res) => {
  const { broker } = req.params;
  const { code, state, request_token, error, error_description } = req.query;

  // Handle error returned by broker auth page
  if (error) {
    console.warn(`[BrokerCallback] OAuth denied by user or broker: ${error} - ${error_description}`);
    return res.redirect(
      `http://localhost:5173/connected-brokers?status=error&broker=${broker}&message=${encodeURIComponent(
        error_description || error
      )}`
    );
  }

  const tokenParam = code || request_token;
  if (!tokenParam || !state) {
    return res.status(400).send('Invalid callback request: missing code or state token.');
  }

  try {
    // Extract userId from state payload to verify state token
    const raw = Buffer.from(state, 'base64url').toString('utf8');
    const [userId] = raw.split(':');

    const isValidState = verifyStateToken(state, userId, broker);
    if (!isValidState) {
      return res.status(403).send('Invalid or expired anti-CSRF state token. Authorization failed.');
    }

    const adapter = getAdapter(broker);
    const tokenData = await adapter.handleCallback({ code: tokenParam, state, req });

    // Encrypt tokens before storing
    const encryptedAccessToken = encrypt(tokenData.accessToken);
    const encryptedRefreshToken = tokenData.refreshToken ? encrypt(tokenData.refreshToken) : null;

    // Save connection
    await portfolioStore.saveBrokerConnection(userId, {
      broker,
      brokerDisplayName: adapter.getDisplayName(),
      externalAccountId: tokenData.externalAccountId,
      accountMaskedId: tokenData.accountMaskedId,
      connectionStatus: 'connected',
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt: tokenData.tokenExpiresAt,
      lastSuccessfulSyncAt: null,
      lastAttemptedSyncAt: new Date(),
    });

    // Automatically trigger initial holdings sync
    try {
      await syncBrokerHoldings(userId, broker);
    } catch (syncErr) {
      console.warn(`[BrokerCallback] Initial holdings sync warning: ${syncErr.message}`);
    }

    // Redirect to frontend Connected Brokers page
    res.redirect(`http://localhost:5173/connected-brokers?status=connected&broker=${broker}`);
  } catch (err) {
    console.error(`[BrokerCallback] Error processing callback:`, err);
    res.redirect(
      `http://localhost:5173/connected-brokers?status=error&broker=${broker}&message=${encodeURIComponent(
        err.message
      )}`
    );
  }
});

// @route   POST /api/brokers/connections/:broker/sync
// @desc    Trigger rate-limited manual holdings sync
// @access  Protected
router.post('/connections/:broker/sync', requireAuth, async (req, res) => {
  const { broker } = req.params;
  const userId = getAuthenticatedUserId(req);

  try {
    const result = await syncBrokerHoldings(userId, broker);
    res.status(200).json({
      success: true,
      message: `Successfully synchronized ${result.holdingsCount} holdings from ${broker}.`,
      data: result,
    });
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({
      success: false,
      error: err.message,
    });
  }
});

// @route   DELETE /api/brokers/connections/:broker
// @desc    Disconnect broker account and revoke stored tokens
// @access  Protected
router.delete('/connections/:broker', requireAuth, async (req, res) => {
  const { broker } = req.params;
  const userId = getAuthenticatedUserId(req);

  try {
    const connection = await portfolioStore.getBrokerConnection(userId, broker);
    if (connection) {
      try {
        const adapter = getAdapter(broker);
        await adapter.revokeConnection(connection);
      } catch (revErr) {
        console.warn(`[BrokerDisconnect] Warning revoking remote token: ${revErr.message}`);
      }
    }

    await portfolioStore.deleteBrokerConnection(userId, broker);

    res.status(200).json({
      success: true,
      message: `Successfully disconnected ${broker} and deleted synchronized holdings.`,
      broker,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
