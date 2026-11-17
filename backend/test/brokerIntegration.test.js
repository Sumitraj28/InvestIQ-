/**
 * InvestIQ Phase 4 Automated Test Suite
 * Covers Cryptographic Security, Broker Adapters, Holdings Normalization,
 * Rate Limiting, Deduplication, and Multi-Broker Reconciliation.
 */

const assert = require('assert');
const {
  encrypt,
  decrypt,
  generateStateToken,
  verifyStateToken,
  redactSecrets,
} = require('../services/cryptoService');
const ZerodhaAdapter = require('../services/brokers/zerodhaAdapter');
const UpstoxAdapter = require('../services/brokers/upstoxAdapter');
const GrowwAdapter = require('../services/brokers/growwAdapter');
const AngelOneAdapter = require('../services/brokers/angelOneAdapter');
const { normalizeHoldings } = require('../services/brokers/holdingsNormalizer');
const { reconcilePortfolio } = require('../services/brokers/reconciliationService');
const portfolioStore = require('../services/portfolioStore');

let passedTests = 0;
let totalTests = 0;

function it(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${description}`);
    console.error(`    ${err.message}`);
  }
}

async function itAsync(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ PASS: ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${description}`);
    console.error(`    ${err.message}`);
  }
}

console.log('\n--- Starting InvestIQ Phase 4 Broker Integration & Security Verification ---');

// ── 1. Cryptography & Security Tests ──
console.log('\n[1] Testing AES-256-GCM Encryption & Anti-CSRF Protection');

it('AES-256-GCM successfully encrypts and decrypts broker access tokens', () => {
  const secretToken = 'mock_kite_access_token_abc123xyz789';
  const encrypted = encrypt(secretToken);

  assert.ok(encrypted && typeof encrypted === 'string', 'Should return encrypted string');
  assert.strictEqual(encrypted.split(':').length, 3, 'Payload should have iv:tag:ciphertext');

  const decrypted = decrypt(encrypted);
  assert.strictEqual(decrypted, secretToken, 'Decrypted token must exactly match original');
});

it('Decryption fails when encrypted payload is tampered', () => {
  const secretToken = 'mock_secure_token';
  const encrypted = encrypt(secretToken);
  const parts = encrypted.split(':');
  // Tamper ciphertext
  const tampered = `${parts[0]}:${parts[1]}:badCiphertext==`;

  assert.throws(() => {
    decrypt(tampered);
  }, 'Should throw an authentication error on tampered payload');
});

it('Generates and verifies cryptographic anti-CSRF state token', () => {
  const userId = 'usr_test_alpha';
  const brokerId = 'zerodha';

  const stateToken = generateStateToken(userId, brokerId);
  assert.ok(stateToken && stateToken.length > 20, 'State token must be non-empty');

  const isValid = verifyStateToken(stateToken, userId, brokerId);
  assert.strictEqual(isValid, true, 'Valid state token must verify successfully');

  // Mismatched user should fail
  const isInvalidUser = verifyStateToken(stateToken, 'different_user', brokerId);
  assert.strictEqual(isInvalidUser, false, 'Mismatched user must be rejected');

  // Mismatched broker should fail
  const isInvalidBroker = verifyStateToken(stateToken, userId, 'upstox');
  assert.strictEqual(isInvalidBroker, false, 'Mismatched broker must be rejected');
});

it('Redacts sensitive tokens and secrets from logged response objects', () => {
  const payload = {
    broker: 'zerodha',
    accessToken: 'secret_token_123',
    encryptedAccessToken: 'iv:tag:data',
    user: {
      password: 'mypassword',
      apiSecret: 'mysecret',
      email: 'investor@example.com',
    },
  };

  const clean = redactSecrets(payload);
  assert.strictEqual(clean.accessToken, '•••REDACTED•••');
  assert.strictEqual(clean.encryptedAccessToken, '•••REDACTED•••');
  assert.strictEqual(clean.user.password, '•••REDACTED•••');
  assert.strictEqual(clean.user.apiSecret, '•••REDACTED•••');
  assert.strictEqual(clean.user.email, 'investor@example.com');
});

// ── 2. Broker Adapter Capabilities ──
console.log('\n[2] Testing Broker Adapter Capabilities & Security Constraints');

it('ZerodhaAdapter reports Kite Connect capabilities and daily 6 AM expiry', () => {
  const adapter = new ZerodhaAdapter();
  const caps = adapter.getCapabilities();

  assert.strictEqual(caps.holdings, true, 'Zerodha supports holdings');
  assert.strictEqual(caps.orderHistory, false, 'InvestIQ disables trading order history');
  assert.strictEqual(caps.readOnlyEnforced, true, 'Read-only must be strictly enforced');

  const expiry = adapter.calculateDailyExpiry();
  assert.ok(expiry instanceof Date, 'Should calculate Date expiry');
});

it('UpstoxAdapter reports OAuth 2.0 authorization code capabilities', () => {
  const adapter = new UpstoxAdapter();
  const caps = adapter.getCapabilities();

  assert.strictEqual(caps.holdings, true, 'Upstox supports holdings');
  assert.strictEqual(caps.authType, 'oauth2_authorization_code');
  assert.strictEqual(caps.readOnlyEnforced, true);
});

it('GrowwAdapter correctly reports unsupported retail OAuth status', () => {
  const adapter = new GrowwAdapter();
  const caps = adapter.getCapabilities();

  assert.strictEqual(caps.status, 'unsupported', 'Groww should report unsupported status');
  assert.strictEqual(caps.holdings, false);
});

it('AngelOneAdapter enforces zero-credential policy and marks status restricted', () => {
  const adapter = new AngelOneAdapter();
  const caps = adapter.getCapabilities();

  assert.strictEqual(caps.status, 'restricted', 'Angel One should report restricted status');
  assert.strictEqual(caps.authType, 'credentials_restricted');
});

// ── 3. Holdings Normalizer Tests ──
console.log('\n[3] Testing Holdings Normalization');

it('Normalizes Zerodha holdings payload into standard SyncedHolding format', () => {
  const rawZerodha = [
    {
      tradingsymbol: 'RELIANCE',
      exchange: 'NSE',
      isin: 'INE002A01018',
      quantity: 15,
      average_price: 2800.5,
      last_price: 2985.4,
      pnl: 2773.5,
    },
  ];

  const normalized = normalizeHoldings('zerodha', rawZerodha);
  assert.strictEqual(normalized.length, 1);
  const h = normalized[0];

  assert.strictEqual(h.symbol, 'RELIANCE');
  assert.strictEqual(h.companyName, 'Reliance Industries Limited');
  assert.strictEqual(h.quantity, 15);
  assert.strictEqual(h.averagePrice, 2800.5);
  assert.strictEqual(h.costBasis, 42007.5);
  assert.strictEqual(h.currentPrice, 2985.4);
  assert.strictEqual(h.marketValue, 44781);
  assert.strictEqual(h.unrealizedPnl, 2773.5);
  assert.strictEqual(h.source, 'broker_sync');
});

it('Normalizes Upstox holdings payload into standard format', () => {
  const rawUpstox = [
    {
      trading_symbol: 'TCS',
      company_name: 'Tata Consultancy Services',
      exchange: 'NSE',
      isin: 'INE467B01029',
      quantity: 10,
      average_price: 3800.0,
      last_price: 4210.0,
    },
  ];

  const normalized = normalizeHoldings('upstox', rawUpstox);
  assert.strictEqual(normalized.length, 1);
  const h = normalized[0];

  assert.strictEqual(h.symbol, 'TCS');
  assert.strictEqual(h.quantity, 10);
  assert.strictEqual(h.costBasis, 38000.0);
  assert.strictEqual(h.marketValue, 42100.0);
  assert.strictEqual(h.unrealizedPnl, 4100.0);
  assert.strictEqual(h.unrealizedPnlPercent, 10.79);
});

// ── 4. Reconciliation & Multi-Broker Deduplication Tests ──
console.log('\n[4] Testing Multi-Broker Holdings Reconciliation & Deduplication');

it('Reconciles matching manual transaction with synced holding without double-counting', () => {
  const manual = [
    {
      stockSymbol: 'RELIANCE',
      brokerName: 'Zerodha Kite',
      quantity: 10,
      purchasePrice: 2800,
      totalInvestment: 28000,
    },
  ];

  const synced = [
    {
      broker: 'zerodha',
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Limited',
      exchange: 'NSE',
      quantity: 10,
      averagePrice: 2800,
      costBasis: 28000,
      currentPrice: 2985.4,
      marketValue: 29854,
      unrealizedPnl: 1854,
    },
  ];

  const result = reconcilePortfolio(manual, synced);

  assert.strictEqual(result.unifiedHoldings.length, 1, 'Must contain exactly 1 deduplicated holding');
  assert.strictEqual(result.unifiedHoldings[0].quantity, 10, 'Must NOT double count to 20 shares');
  assert.strictEqual(result.unifiedHoldings[0].reconciled, true);
  assert.strictEqual(result.reconciliationRecords.length, 1);
  assert.strictEqual(result.reconciliationRecords[0].matchStatus, 'auto_matched');
});

it('Flags quantity variance for user review when manual and synced quantities diverge', () => {
  const manual = [
    {
      stockSymbol: 'INFY',
      brokerName: 'Zerodha Kite',
      quantity: 12,
      purchasePrice: 1800,
      totalInvestment: 21600,
    },
  ];

  const synced = [
    {
      broker: 'zerodha',
      symbol: 'INFY',
      companyName: 'Infosys Limited',
      quantity: 10, // Divergence: 10 vs 12
      averagePrice: 1800,
      costBasis: 18000,
    },
  ];

  const result = reconcilePortfolio(manual, synced);
  assert.strictEqual(result.reconciliationRecords[0].matchStatus, 'conflict_review');
  assert.strictEqual(result.reconciliationRecords[0].quantityDifference, -2);
});

it('Maintains separate holdings when the same stock is held across different brokers', () => {
  const synced = [
    {
      broker: 'zerodha',
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Limited',
      quantity: 10,
      averagePrice: 2800,
      costBasis: 28000,
    },
    {
      broker: 'upstox',
      symbol: 'RELIANCE',
      companyName: 'Reliance Industries Limited',
      quantity: 5,
      averagePrice: 2900,
      costBasis: 14500,
    },
  ];

  const result = reconcilePortfolio([], synced);
  assert.strictEqual(result.unifiedHoldings.length, 2, 'Must maintain separate broker accounts for same company');

  const zerodhaItem = result.unifiedHoldings.find((h) => h.broker === 'zerodha');
  const upstoxItem = result.unifiedHoldings.find((h) => h.broker === 'upstox');

  assert.strictEqual(zerodhaItem.quantity, 10);
  assert.strictEqual(upstoxItem.quantity, 5);
});

it('Safely preserves manual-only investments alongside synced broker holdings', () => {
  const manual = [
    {
      stockSymbol: 'HDFCBANK',
      brokerName: 'Groww',
      quantity: 8,
      purchasePrice: 1650,
      totalInvestment: 13200,
    },
  ];

  const synced = [
    {
      broker: 'zerodha',
      symbol: 'TCS',
      companyName: 'Tata Consultancy Services',
      quantity: 5,
      averagePrice: 4000,
      costBasis: 20000,
    },
  ];

  const result = reconcilePortfolio(manual, synced);
  assert.strictEqual(result.unifiedHoldings.length, 2);

  const hdfc = result.unifiedHoldings.find((h) => h.symbol === 'HDFCBANK');
  assert.strictEqual(hdfc.source, 'manual');
  assert.strictEqual(hdfc.reconciled, false);

  const tcs = result.unifiedHoldings.find((h) => h.symbol === 'TCS');
  assert.strictEqual(tcs.source, 'broker_synced');
});

// ── 5. Broker Connection Store Operations ──
console.log('\n[5] Testing Portfolio Store Broker Operations');

itAsync('Saves, updates, and deletes broker connection without leaking tokens', async () => {
  const testUserId = `test_usr_${Date.now()}`;
  const encryptedToken = encrypt('test_token_secret');

  const connection = await portfolioStore.saveBrokerConnection(testUserId, {
    broker: 'zerodha',
    brokerDisplayName: 'Zerodha Kite',
    accountMaskedId: 'ZER-•••5678',
    connectionStatus: 'connected',
    encryptedAccessToken: encryptedToken,
  });

  assert.strictEqual(connection.broker, 'zerodha');
  assert.strictEqual(connection.accountMaskedId, 'ZER-•••5678');
  assert.strictEqual(connection.encryptedAccessToken, undefined, 'Must not leak encrypted token in public object');

  // Verify list
  const list = await portfolioStore.getBrokerConnections(testUserId);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].encryptedAccessToken, undefined);

  // Delete
  await portfolioStore.deleteBrokerConnection(testUserId, 'zerodha');
  const postDelete = await portfolioStore.getBrokerConnections(testUserId);
  assert.strictEqual(postDelete.length, 0);
});

// ── Summary ──
setTimeout(() => {
  console.log('\n========================================');
  console.log(`Verification Complete: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
  console.log('========================================\n');
  process.exit(totalTests - passedTests === 0 ? 0 : 1);
}, 200);
