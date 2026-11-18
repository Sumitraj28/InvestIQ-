/**
 * Automated In-Memory Test Suite for InvestIQ Portfolio & Broker Redirection Backend
 * Executes directly via Express handler without opening network ports.
 */

const { EventEmitter } = require('events');

let jose;

// Helper to create a signed mock Clerk JWT for testing
async function createMockClerkToken(userId) {
  if (!jose) {
    jose = await import('jose');
  }
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      iss: 'https://tender-slug-4200.clerk.accounts.dev',
      iat: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 3600,
    })
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function dispatchRequest(app, method, url, headers = {}, body = null) {
  return new Promise((resolve) => {
    const req = new EventEmitter();
    req.method = method.toUpperCase();
    req.url = url;
    req.headers = {
      'content-type': 'application/json',
      ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])),
    };
    req.body = body || {};

    const res = new EventEmitter();
    let statusCode = 200;
    let resBody = null;

    res.status = function (code) {
      statusCode = code;
      return res;
    };

    res.json = function (obj) {
      resBody = obj;
      resolve({ status: statusCode, data: resBody });
    };

    res.send = function (data) {
      resBody = data;
      resolve({ status: statusCode, data: resBody });
    };

    res.setHeader = function () {};
    res.getHeader = function () {};

    app.handle(req, res);
  });
}

async function runTests() {
  console.log('--- Starting InvestIQ In-Memory Backend Verification Suite ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Clear any existing test data in investments_data.json before starting
  const fs = require('fs');
  const path = require('path');
  const testDataFile = path.join(__dirname, '..', 'data', 'investments_data.json');
  if (fs.existsSync(testDataFile)) {
    fs.writeFileSync(testDataFile, JSON.stringify({ investments: [], brokerSyncs: [] }), 'utf8');
  }

  const express = require('express');
  const app = express();
  app.use(express.json());

  const portfolioRoutes = require('../routes/portfolioRoutes');
  app.use('/api/portfolio', portfolioRoutes);

  // Seed verified test fixture quotes in market data engine for price resolution tests
  const marketDataEngine = require('../services/realtime/marketDataEngine');
  marketDataEngine.ingestTick({
    symbol: 'RELIANCE',
    lastPrice: 2985.40,
    previousClose: 2947.20,
    open: 2950.00,
    high: 2994.80,
    low: 2942.00,
    volume: 4820000,
    source: 'test-fixture',
  });
  marketDataEngine.ingestTick({
    symbol: 'TCS',
    lastPrice: 4210.00,
    previousClose: 4230.00,
    open: 4220.00,
    high: 4240.00,
    low: 4200.00,
    volume: 1200000,
    source: 'test-fixture',
  });

  const tokenUser1 = await createMockClerkToken('user_test_alpha_123');
  const tokenUser2 = await createMockClerkToken('user_test_beta_456');

  // Test 1: Missing authentication header
  console.log('\n[1] Testing Security & Authentication');
  const resNoAuth = await dispatchRequest(app, 'GET', '/api/portfolio/investments');
  assert(resNoAuth.status === 401, 'Rejects unauthenticated requests with HTTP 401');

  // Test 2: Invalid/malformed token
  const resBadAuth = await dispatchRequest(app, 'GET', '/api/portfolio/investments', {
    authorization: 'Bearer invalid_token_garbage',
  });
  assert(resBadAuth.status === 401, 'Rejects malformed tokens with HTTP 401');

  // Test 3: Input validation on Adding investment
  console.log('\n[2] Testing Investment Validation');
  const resMissingName = await dispatchRequest(app, 'POST', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    stockSymbol: 'RELIANCE',
    quantity: 10,
    purchasePrice: 2500,
  });
  assert(resMissingName.status === 400, 'Rejects investment missing company name');

  const resInvalidQty = await dispatchRequest(app, 'POST', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    companyName: 'Reliance Industries',
    stockSymbol: 'RELIANCE',
    quantity: -5,
    purchasePrice: 2500,
  });
  assert(resInvalidQty.status === 400, 'Rejects negative quantity');

  // Test 4: Successfully Add Investment for User 1
  console.log('\n[3] Testing Investment Creation & Calculation');
  const resAdd1 = await dispatchRequest(app, 'POST', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    companyName: 'Reliance Industries Limited',
    stockSymbol: 'RELIANCE',
    brokerName: 'Groww',
    quantity: 10,
    purchasePrice: 2500,
    exchange: 'NSE',
    notes: 'Initial long-term position',
  });
  assert(resAdd1.status === 201, 'Creates investment record for User 1 with HTTP 201');
  assert(resAdd1.data.data.totalInvestment === 25000, 'Correctly calculates Total Investment (10 × 2500 = 25000)');
  const inv1Id = resAdd1.data.data._id;

  // Add second holding for User 1
  const resAdd2 = await dispatchRequest(app, 'POST', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    companyName: 'Tata Consultancy Services',
    stockSymbol: 'TCS',
    brokerName: 'Zerodha Kite',
    quantity: 5,
    purchasePrice: 3800,
    exchange: 'NSE',
  });
  assert(resAdd2.status === 201, 'Creates second investment (TCS) for User 1');
  assert(resAdd2.data.data.totalInvestment === 19000, 'Correctly calculates Total Investment for TCS (5 × 3800 = 19000)');

  // Test 5: User Data Isolation (User 2 should see 0 investments)
  console.log('\n[4] Testing User Data Isolation');
  const resUser2Investments = await dispatchRequest(app, 'GET', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser2}`,
  });
  assert(resUser2Investments.status === 200, 'User 2 can query their investments');
  assert(resUser2Investments.data.count === 0, 'User 2 cannot see User 1 investments (isolated records)');

  // User 2 cannot edit User 1's investment
  const resUnauthorizedEdit = await dispatchRequest(app, 'PUT', `/api/portfolio/investments/${inv1Id}`, {
    authorization: `Bearer ${tokenUser2}`,
  }, {
    quantity: 999,
  });
  assert(resUnauthorizedEdit.status === 404, 'User 2 cannot update User 1 investment record (access denied)');

  // Test 6: Updating Investment by User 1
  console.log('\n[5] Testing Investment Record Updates');
  const resUpdate = await dispatchRequest(app, 'PUT', `/api/portfolio/investments/${inv1Id}`, {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    quantity: 12,
    purchasePrice: 2600,
    notes: 'Averaged up position',
  });
  assert(resUpdate.status === 200, 'User 1 successfully updates holding');
  assert(resUpdate.data.data.quantity === 12, 'Updated quantity to 12');
  assert(resUpdate.data.data.totalInvestment === 31200, 'Recalculated total investment (12 × 2600 = 31200)');

  // Test 7: Portfolio Summary Calculation
  console.log('\n[6] Testing Portfolio Summary & Metrics');
  const resSummary = await dispatchRequest(app, 'GET', '/api/portfolio/summary', {
    authorization: `Bearer ${tokenUser1}`,
  });
  assert(resSummary.status === 200, 'Fetches portfolio summary with HTTP 200');
  const sumData = resSummary.data.data;
  assert(sumData.totalInvested === 50200, 'Total invested matches (31200 + 19000 = 50200)');
  assert(sumData.totalHoldings === 2, 'Total holdings count is 2');
  assert(sumData.uniqueCompanies === 2, 'Unique companies count is 2');
  assert(Array.isArray(sumData.brokerDistribution), 'Generates broker distribution');
  assert(sumData.brokerDistribution.length >= 2, 'Broker distribution includes Groww and Zerodha Kite');

  // Test 8: Batch Stock Prices
  console.log('\n[7] Testing Batch Prices Endpoint');
  const resPrices = await dispatchRequest(app, 'GET', '/api/portfolio/prices?symbols=RELIANCE,TCS', {
    authorization: `Bearer ${tokenUser1}`,
  });
  assert(resPrices.status === 200, 'Batch prices returned HTTP 200');
  assert(resPrices.data.data.RELIANCE && resPrices.data.data.RELIANCE.price > 0, 'Returns price for RELIANCE');

  // Test 9: Broker Synchronization Status & Consent
  console.log('\n[8] Testing Broker Synchronization Architecture');
  const resBrokers = await dispatchRequest(app, 'GET', '/api/portfolio/brokers', {
    authorization: `Bearer ${tokenUser1}`,
  });
  assert(resBrokers.status === 200, 'Returns supported brokers list');
  assert(resBrokers.data.data.length === 4, 'Includes Groww, Zerodha, Angel One, and Upstox');

  const resSyncNoConsent = await dispatchRequest(app, 'POST', '/api/portfolio/brokers/sync', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    broker: 'groww',
    consent: false,
  });
  assert(resSyncNoConsent.status === 400, 'Rejects sync without explicit user consent');

  const resSyncConsent = await dispatchRequest(app, 'POST', '/api/portfolio/brokers/sync', {
    authorization: `Bearer ${tokenUser1}`,
  }, {
    broker: 'groww',
    consent: true,
  });
  assert(resSyncConsent.status === 200, 'Records broker sync with explicit user consent');
  assert(resSyncConsent.data.data.status === 'connected', 'Marks broker sync status as connected');

  // Test 10: Delete Investment
  console.log('\n[9] Testing Deleting Investment Record');
  const resDelete = await dispatchRequest(app, 'DELETE', `/api/portfolio/investments/${inv1Id}`, {
    authorization: `Bearer ${tokenUser1}`,
  });
  assert(resDelete.status === 200, 'Deletes investment record with HTTP 200');

  const resVerifyDelete = await dispatchRequest(app, 'GET', '/api/portfolio/investments', {
    authorization: `Bearer ${tokenUser1}`,
  });
  assert(resVerifyDelete.data.count === 1, 'Holding count decreased to 1 after deletion');

  console.log(`\n========================================`);
  console.log(`Verification Complete: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
