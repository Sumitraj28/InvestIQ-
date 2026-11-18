/**
 * upstoxAdapter.test.js
 * Verification Suite for Official Upstox Market Data API v2/v3 Adapter & Streaming Connector
 * 
 * Tests:
 * 1. Missing Credentials Handling (Graceful PENDING_CREDENTIALS state without crash or fake data)
 * 2. Token Validation & Daily Expiration Handling
 * 3. Symbol to Upstox Instrument Key Mapping (NSE Equities, BSE Equities, Indices)
 * 4. Reverse Instrument Key Resolution
 * 5. LTP Response Normalization
 * 6. Full Market Quote Normalization & Price Change Calculation
 * 7. Upstox Market Data Feed V3 Subscription Payload Generation
 * 8. WebSocket Streaming Connector Life-Cycle & Error Handling (Mock-based)
 * 9. Secret & Token Redaction in Log/Status Outputs
 */

const assert = require('assert');
const {
  UpstoxMarketDataAdapter,
} = require('../services/brokers/upstoxMarketDataAdapter');
const {
  UpstoxStreamingConnector,
} = require('../services/brokers/upstoxStreamingConnector');
const {
  toUpstoxInstrumentKey,
  fromUpstoxInstrumentKey,
  normalizeSymbol,
  resolveExchange,
  getInstrumentMetadata,
} = require('../services/realtime/symbolMapping');

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runSuite() {
  console.log('\n--- Starting InvestIQ Upstox Market Data Adapter Verification Suite ---\n');

  // ──────────────────────────────────────────────────────────
  // 1. Missing Credentials & Security Handling
  // ──────────────────────────────────────────────────────────
  console.log('[1] Testing Missing Credentials & Security Handling');

  runTest('Gracefully reports PENDING_CREDENTIALS when credentials are not set', () => {
    const unconfiguredAdapter = new UpstoxMarketDataAdapter({
      apiKey: null,
      apiSecret: null,
      accessToken: null,
    });

    assert.strictEqual(unconfiguredAdapter.hasCredentials(), false);
    const status = unconfiguredAdapter.getAuthStatus();
    assert.strictEqual(status.status, 'PENDING_CREDENTIALS');
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.hasToken, false);
  });

  runTest('Redacts API keys and never leaks secrets in status payloads', () => {
    const configuredAdapter = new UpstoxMarketDataAdapter({
      apiKey: 'test_upstox_api_key_12345',
      apiSecret: 'super_secret_unmasked_value',
      accessToken: 'bearer_token_xyz_secret',
    });

    const status = configuredAdapter.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
    assert.strictEqual(status.maskedKey, 'test••••••');
    // Ensure raw secret is not present in output
    assert.strictEqual(JSON.stringify(status).includes('super_secret_unmasked_value'), false);
    assert.strictEqual(JSON.stringify(status).includes('bearer_token_xyz_secret'), false);
  });

  await runAsyncTest('getLtp returns PENDING_CREDENTIALS without throwing when unconfigured', async () => {
    const unconfigured = new UpstoxMarketDataAdapter({ accessToken: null });
    const res = await unconfigured.getLtp(['RELIANCE']);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'PENDING_CREDENTIALS');
    assert.ok(res.error.includes('credentials not configured'));
  });

  await runAsyncTest('getFullQuote returns PENDING_CREDENTIALS without throwing when unconfigured', async () => {
    const unconfigured = new UpstoxMarketDataAdapter({ accessToken: null });
    const res = await unconfigured.getFullQuote(['TCS', 'INFY']);
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'PENDING_CREDENTIALS');
  });

  // ──────────────────────────────────────────────────────────
  // 2. Token Validation & Daily Expiration
  // ──────────────────────────────────────────────────────────
  console.log('\n[2] Testing Token Validation & Daily Expiration');

  runTest('Detects expired Upstox token past daily validity cutoff', () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString();
    const expiredAdapter = new UpstoxMarketDataAdapter({
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      accessToken: 'old_expired_token',
      tokenExpiry: pastTime,
    });

    assert.strictEqual(expiredAdapter.isTokenExpired(), true);
    const status = expiredAdapter.getAuthStatus();
    assert.strictEqual(status.status, 'EXPIRED');
    assert.ok(status.message.includes('expired'));
  });

  runTest('Validates active token with future expiry', () => {
    const futureTime = new Date(Date.now() + 3600000 * 8).toISOString();
    const activeAdapter = new UpstoxMarketDataAdapter({
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      accessToken: 'valid_active_token',
      tokenExpiry: futureTime,
    });

    assert.strictEqual(activeAdapter.isTokenExpired(), false);
    const status = activeAdapter.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
  });

  // ──────────────────────────────────────────────────────────
  // 3. Indian Symbol & Upstox Instrument Key Mapping
  // ──────────────────────────────────────────────────────────
  console.log('\n[3] Testing Indian Symbol & Upstox Instrument Key Mapping');

  runTest('Maps major NSE equities to official Upstox ISIN instrument keys', () => {
    assert.strictEqual(toUpstoxInstrumentKey('RELIANCE'), 'NSE_EQ|INE002A01018');
    assert.strictEqual(toUpstoxInstrumentKey('RELIANCE.NS'), 'NSE_EQ|INE002A01018');
    assert.strictEqual(toUpstoxInstrumentKey('TCS'), 'NSE_EQ|INE467B01029');
    assert.strictEqual(toUpstoxInstrumentKey('INFY'), 'NSE_EQ|INE009A01021');
    assert.strictEqual(toUpstoxInstrumentKey('HDFCBANK'), 'NSE_EQ|INE040A01034');
    assert.strictEqual(toUpstoxInstrumentKey('ICICIBANK'), 'NSE_EQ|INE090A01021');
    assert.strictEqual(toUpstoxInstrumentKey('JIOFIN'), 'NSE_EQ|INE752E01010');
  });

  runTest('Maps benchmark indices to official Upstox index instrument keys', () => {
    assert.strictEqual(toUpstoxInstrumentKey('^NSEI'), 'NSE_INDEX|Nifty 50');
    assert.strictEqual(toUpstoxInstrumentKey('NIFTY 50'), 'NSE_INDEX|Nifty 50');
    assert.strictEqual(toUpstoxInstrumentKey('^BSESN'), 'BSE_INDEX|SENSEX');
    assert.strictEqual(toUpstoxInstrumentKey('SENSEX'), 'BSE_INDEX|SENSEX');
    assert.strictEqual(toUpstoxInstrumentKey('^NSEBANK'), 'NSE_INDEX|Nifty Bank');
    assert.strictEqual(toUpstoxInstrumentKey('BANK NIFTY'), 'NSE_INDEX|Nifty Bank');
  });

  runTest('Reverse-maps Upstox instrument keys to standard tickers', () => {
    assert.strictEqual(fromUpstoxInstrumentKey('NSE_EQ|INE002A01018'), 'RELIANCE');
    assert.strictEqual(fromUpstoxInstrumentKey('NSE_EQ|INE467B01029'), 'TCS');
    assert.strictEqual(fromUpstoxInstrumentKey('NSE_INDEX|Nifty 50'), '^NSEI');
    assert.strictEqual(fromUpstoxInstrumentKey('BSE_INDEX|SENSEX'), '^BSESN');
  });

  // ──────────────────────────────────────────────────────────
  // 4. Quote Normalization & Mathematical Accuracy
  // ──────────────────────────────────────────────────────────
  console.log('\n[4] Testing Quote Normalization & Mathematical Accuracy');

  runTest('Correctly calculates Price Change and Percentage Change from Upstox payload', () => {
    const adapter = new UpstoxMarketDataAdapter({ accessToken: 'mock_token' });

    // Mock Upstox full quote response format
    const mockUpstoxPayload = {
      'NSE_EQ:INE002A01018': {
        instrument_token: 'NSE_EQ|INE002A01018',
        last_price: 2985.40,
        volume: 4820000,
        ohlc: {
          open: 2950.00,
          high: 2994.80,
          low: 2942.00,
          close: 2947.20, // Previous close
        },
        timestamp: '2026-11-17T15:30:00+05:30',
      },
    };

    // Simulate mock request implementation
    adapter._request = async () => ({ success: true, data: mockUpstoxPayload });

    return adapter.getFullQuote(['RELIANCE']).then((res) => {
      assert.strictEqual(res.success, true);
      const quote = res.quotes.RELIANCE;
      assert.ok(quote, 'RELIANCE quote must exist');
      assert.strictEqual(quote.lastPrice, 2985.40);
      assert.strictEqual(quote.previousClose, 2947.20);

      // Price Change = 2985.40 - 2947.20 = 38.20
      assert.strictEqual(quote.change, 38.20);

      // Percentage Change = (38.20 / 2947.20) * 100 = 1.30%
      const expectedPct = Number(((38.20 / 2947.20) * 100).toFixed(2));
      assert.strictEqual(quote.changePercent, expectedPct);
      assert.strictEqual(quote.dataFreshness, 'LIVE');
      assert.strictEqual(quote.provider, 'upstox');
    });
  });

  // ──────────────────────────────────────────────────────────
  // 5. Upstox Market Data Feed V3 Streaming Connector
  // ──────────────────────────────────────────────────────────
  console.log('\n[5] Testing Upstox Market Data Feed V3 Streaming Connector');

  runTest('Builds valid Upstox Market Data Feed V3 JSON subscription payload', () => {
    const adapter = new UpstoxMarketDataAdapter();
    const payload = adapter.buildSubscriptionPayload(['RELIANCE', 'TCS'], 'full');

    assert.ok(payload.guid.startsWith('investiq_'));
    assert.strictEqual(payload.method, 'sub');
    assert.strictEqual(payload.params.mode, 'full');
    assert.deepStrictEqual(payload.params.instrumentKeys, [
      'NSE_EQ|INE002A01018',
      'NSE_EQ|INE467B01029',
    ]);
  });

  runTest('Streaming connector remains gracefully disabled when credentials missing', async () => {
    const connector = new UpstoxStreamingConnector({
      adapter: new UpstoxMarketDataAdapter({ accessToken: null }),
    });

    const res = await connector.connect();
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'DISABLED_NO_CREDENTIALS');
    assert.strictEqual(connector.getStatus().status, 'DISABLED_NO_CREDENTIALS');
  });

  await runAsyncTest('Streaming connector manages mock WebSocket lifecycle & tick ingestion', async () => {
    let sentData = null;
    let closed = false;

    // Create a mock WebSocket client
    class MockWs {
      constructor(url) {
        this.url = url;
        setTimeout(() => {
          if (this.onopen) this.onopen();
        }, 10);
      }
      send(data) {
        sentData = data;
      }
      close() {
        closed = true;
        if (this.onclose) this.onclose();
      }
    }

    const mockAdapter = new UpstoxMarketDataAdapter({
      accessToken: 'valid_mock_token',
      tokenExpiry: new Date(Date.now() + 3600000).toISOString(),
    });
    mockAdapter.getAuthorizedFeedUrl = async () => ({
      success: true,
      feedUrl: 'wss://api.upstox.com/v2/feed/market-data-feed',
    });

    const connector = new UpstoxStreamingConnector({
      adapter: mockAdapter,
      wsClientFactory: (url) => new MockWs(url),
    });

    const ticksReceived = [];
    connector.on('tick', (t) => ticksReceived.push(t));

    connector.subscribe('RELIANCE');
    await connector.connect();

    // Wait for mock connection to open
    await new Promise((r) => setTimeout(r, 25));
    assert.strictEqual(connector.status, 'CONNECTED');

    // Simulate incoming Upstox tick
    const mockFeedPacket = {
      feeds: {
        'NSE_EQ:INE002A01018': {
          ltpc: { ltp: 2988.50, cp: 2947.20 },
          volume: 4850000,
        },
      },
    };

    connector._handleIncomingMessage(JSON.stringify(mockFeedPacket));
    assert.strictEqual(ticksReceived.length, 1);
    assert.strictEqual(ticksReceived[0].symbol, 'RELIANCE');
    assert.strictEqual(ticksReceived[0].lastPrice, 2988.50);

    connector.disconnect();
    assert.strictEqual(closed, true);
    assert.strictEqual(connector.status, 'DISCONNECTED');
  });

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`Verification Complete: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
  console.log('========================================\n');

  if (totalTests - passedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
