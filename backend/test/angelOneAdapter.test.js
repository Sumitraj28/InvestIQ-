/**
 * angelOneAdapter.test.js
 * Verification Suite for Official Angel One SmartAPI Market Data Adapter
 */

const assert = require('assert');
const {
  AngelOneMarketDataAdapter,
} = require('../services/brokers/angelOneMarketDataAdapter');

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
  console.log('\n--- Starting InvestIQ Angel One Market Data Adapter Verification Suite ---\n');

  console.log('[1] Testing Credentials & Security Handling');

  runTest('Reports PENDING_CREDENTIALS when apiKey is missing', () => {
    const unconfigured = new AngelOneMarketDataAdapter({ apiKey: null });
    assert.strictEqual(unconfigured.hasCredentials(), false);
    const status = unconfigured.getAuthStatus();
    assert.strictEqual(status.status, 'PENDING_CREDENTIALS');
  });

  runTest('Reports AWAITING_JWT_TOKEN and masks API key when key is configured', () => {
    const keyOnly = new AngelOneMarketDataAdapter({ apiKey: 'W3JelCDO' });
    assert.strictEqual(keyOnly.hasCredentials(), true);
    const status = keyOnly.getAuthStatus();
    assert.strictEqual(status.status, 'AWAITING_JWT_TOKEN');
    assert.strictEqual(status.maskedKey, 'W3J••••DO');
    assert.strictEqual(JSON.stringify(status).includes('W3JelCDO'), false);
  });

  runTest('Reports READY when both apiKey and active accessToken are configured', () => {
    const futureTime = new Date(Date.now() + 3600000 * 5).toISOString();
    const ready = new AngelOneMarketDataAdapter({
      apiKey: 'W3JelCDO',
      accessToken: 'valid_jwt_token',
      tokenExpiry: futureTime,
    });
    assert.strictEqual(ready.hasCredentials(), true);
    const status = ready.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
  });

  console.log('\n[2] Testing Request Header Formation & LTP Normalization');

  runTest('Builds valid Angel One headers including X-PrivateKey and Authorization', () => {
    const adapter = new AngelOneMarketDataAdapter({
      apiKey: 'W3JelCDO',
      accessToken: 'mock_jwt_session',
    });
    const headers = adapter._buildHeaders();
    assert.strictEqual(headers['X-PrivateKey'], 'W3JelCDO');
    assert.strictEqual(headers['Authorization'], 'Bearer mock_jwt_session');
    assert.strictEqual(headers['X-UserType'], 'USER');
  });

  await runAsyncTest('Normalizes Angel One LTP response correctly', async () => {
    const adapter = new AngelOneMarketDataAdapter({
      apiKey: 'W3JelCDO',
      accessToken: 'mock_jwt_session',
    });

    adapter._request = async (endpoint, body) => {
      assert.strictEqual(body.symboltoken, '2885');
      return {
        success: true,
        data: {
          exchange: 'NSE',
          tradingsymbol: 'RELIANCE-EQ',
          symboltoken: '2885',
          ltp: 2985.50,
          open: 2970.00,
          high: 2995.00,
          low: 2965.00,
          close: 2980.00,
        },
      };
    };

    const res = await adapter.getLtp('RELIANCE');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.quote.symbol, 'RELIANCE');
    assert.strictEqual(res.quote.lastPrice, 2985.50);
    assert.strictEqual(res.quote.provider, 'angelone');
  });

  await runAsyncTest('verifyConnection reports status gracefully without throwing', async () => {
    const adapter = new AngelOneMarketDataAdapter({ apiKey: 'W3JelCDO' });
    const result = await adapter.verifyConnection();
    assert.ok(result.status !== undefined);
  });

  console.log('\n========================================');
  console.log(`Verification Complete: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
  console.log('========================================\n');

  if (totalTests - passedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
