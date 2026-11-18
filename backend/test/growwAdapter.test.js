/**
 * growwAdapter.test.js
 * Verification Suite for Official Groww Trading API v1 Market Data Adapter
 * 
 * Tests:
 * 1. Missing Credentials Handling (Graceful PENDING_CREDENTIALS state)
 * 2. Secret Redaction & Key Masking
 * 3. Token Validation & Daily Expiration
 * 4. LTP Request & Normalization
 * 5. Full Market Quote Normalization & Price Change Calculation
 * 6. Error Handling (Unauthorized, Expired, Network failure)
 */

const assert = require('assert');
const {
  GrowwMarketDataAdapter,
} = require('../services/brokers/growwMarketDataAdapter');

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
  console.log('\n--- Starting InvestIQ Groww Market Data Adapter Verification Suite ---\n');

  // ──────────────────────────────────────────────────────────
  // 1. Missing Credentials & Security Handling
  // ──────────────────────────────────────────────────────────
  console.log('[1] Testing Missing Credentials & Security Handling');

  runTest('Gracefully reports PENDING_CREDENTIALS when credentials are not configured', () => {
    const unconfigured = new GrowwMarketDataAdapter({
      apiKey: null,
      apiSecret: null,
      accessToken: null,
    });

    assert.strictEqual(unconfigured.hasCredentials(), false);
    const status = unconfigured.getAuthStatus();
    assert.strictEqual(status.status, 'PENDING_CREDENTIALS');
    assert.strictEqual(status.configured, false);
    assert.strictEqual(status.hasToken, false);
  });

  runTest('Masks API keys and never leaks secrets in status payloads', () => {
    const configured = new GrowwMarketDataAdapter({
      apiKey: 'groww_api_key_live_999',
      apiSecret: 'secret_dont_leak_me',
      accessToken: 'bearer_token_xyz_live',
    });

    const status = configured.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
    assert.strictEqual(status.maskedKey, 'grow••••••');
    assert.strictEqual(JSON.stringify(status).includes('secret_dont_leak_me'), false);
    assert.strictEqual(JSON.stringify(status).includes('bearer_token_xyz_live'), false);
  });

  await runAsyncTest('getLtp returns PENDING_CREDENTIALS without throwing when unconfigured', async () => {
    const unconfigured = new GrowwMarketDataAdapter({ accessToken: null });
    const res = await unconfigured.getLtp('RELIANCE');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'PENDING_CREDENTIALS');
    assert.ok(res.error.includes('credentials not configured'));
  });

  await runAsyncTest('getFullQuote returns PENDING_CREDENTIALS without throwing when unconfigured', async () => {
    const unconfigured = new GrowwMarketDataAdapter({ accessToken: null });
    const res = await unconfigured.getFullQuote('TCS');
    assert.strictEqual(res.success, false);
    assert.strictEqual(res.status, 'PENDING_CREDENTIALS');
  });

  // ──────────────────────────────────────────────────────────
  // 2. Token Validation & Expiry
  // ──────────────────────────────────────────────────────────
  console.log('\n[2] Testing Token Validation & Daily Expiration');

  runTest('Detects expired Groww access token', () => {
    const pastTime = new Date(Date.now() - 3600000).toISOString();
    const expired = new GrowwMarketDataAdapter({
      apiKey: 'key',
      accessToken: 'expired_token',
      tokenExpiry: pastTime,
    });

    assert.strictEqual(expired.isTokenExpired(), true);
    const status = expired.getAuthStatus();
    assert.strictEqual(status.status, 'EXPIRED');
  });

  runTest('Validates active Groww access token with future expiry', () => {
    const futureTime = new Date(Date.now() + 3600000 * 6).toISOString();
    const active = new GrowwMarketDataAdapter({
      apiKey: 'key',
      accessToken: 'active_token',
      tokenExpiry: futureTime,
    });

    assert.strictEqual(active.isTokenExpired(), false);
    const status = active.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
  });

  // ──────────────────────────────────────────────────────────
  // 3. LTP & Full Quote Normalization
  // ──────────────────────────────────────────────────────────
  console.log('\n[3] Testing LTP & Full Quote Normalization');

  await runAsyncTest('Normalizes Groww LTP response into standard schema', async () => {
    const adapter = new GrowwMarketDataAdapter({ accessToken: 'mock_groww_token' });

    // Mock Groww LTP response
    adapter._request = async (endpoint) => {
      assert.ok(endpoint.includes('trading_symbol=RELIANCE'));
      return {
        success: true,
        data: {
          trading_symbol: 'RELIANCE',
          ltp: 2985.40,
        },
      };
    };

    const res = await adapter.getLtp('RELIANCE');
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.quote.symbol, 'RELIANCE');
    assert.strictEqual(res.quote.lastPrice, 2985.40);
    assert.strictEqual(res.quote.provider, 'groww');
    assert.strictEqual(res.quote.dataStatus, 'live');
  });

  await runAsyncTest('Normalizes Groww Full Quote and calculates Price Change & % Change', async () => {
    const adapter = new GrowwMarketDataAdapter({ accessToken: 'mock_groww_token' });

    // Mock Groww full quote response format
    adapter._request = async (endpoint) => {
      assert.ok(endpoint.includes('trading_symbol=TCS'));
      return {
        success: true,
        data: {
          trading_symbol: 'TCS',
          ltp: 4210.00,
          volume: 1250000,
          ohlc: {
            open: 4220.00,
            high: 4240.00,
            low: 4195.00,
            close: 4230.00, // Previous close
          },
          timestamp: '2026-11-18T10:00:00+05:30',
        },
      };
    };

    const res = await adapter.getFullQuote('TCS');
    assert.strictEqual(res.success, true);
    const quote = res.quote;
    assert.strictEqual(quote.symbol, 'TCS');
    assert.strictEqual(quote.lastPrice, 4210.00);
    assert.strictEqual(quote.previousClose, 4230.00);

    // Price Change = 4210 - 4230 = -20.00
    assert.strictEqual(quote.change, -20.00);
    assert.strictEqual(quote.dayChange, -20.00);

    // Percentage Change = (-20 / 4230) * 100 = -0.47%
    const expectedPct = Number(((-20 / 4230) * 100).toFixed(2));
    assert.strictEqual(quote.changePercent, expectedPct);
    assert.strictEqual(quote.dataFreshness, 'LIVE');
    assert.strictEqual(quote.provider, 'groww');
  });

  // ──────────────────────────────────────────────────────────
  // 4. JWT Auto-Detection & Connection Verification
  // ──────────────────────────────────────────────────────────
  console.log('\n[4] Testing JWT Auto-Detection & Diagnostic Verification');

  runTest('Auto-detects JWT passed in apiKey and populates claims', () => {
    // Generate a valid mock JWT format with exp in future
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', typ: 'JWT' })).toString('base64url');
    const futureExp = Math.floor(Date.now() / 1000) + 7200;
    const payload = Buffer.from(JSON.stringify({
      exp: futureExp,
      sub: JSON.stringify({ sourceIpAddress: '10.0.0.1', vendorName: 'growwApi' }),
    })).toString('base64url');
    const mockJwt = `${header}.${payload}.mockSignature`;

    const adapter = new GrowwMarketDataAdapter({ apiKey: mockJwt });
    assert.strictEqual(adapter.accessToken, mockJwt);
    assert.strictEqual(adapter.isTokenExpired(), false);
    const status = adapter.getAuthStatus();
    assert.strictEqual(status.status, 'READY');
    assert.strictEqual(status.registeredIp, '10.0.0.1');
  });

  await runAsyncTest('verifyConnection reports status gracefully without throwing', async () => {
    const adapter = new GrowwMarketDataAdapter({ accessToken: 'mock_token' });
    adapter.getLtp = async () => ({
      success: false,
      status: 'FORBIDDEN',
      statusCode: 403,
      error: 'IP mismatch or inactive subscription',
    });

    const result = await adapter.verifyConnection();
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'FORBIDDEN');
    assert.strictEqual(result.statusCode, 403);
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
