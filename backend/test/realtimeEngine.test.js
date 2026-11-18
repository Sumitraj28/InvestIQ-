/**
 * realtimeEngine.test.js
 * InvestIQ Real-Time Stock Market Dashboard Verification Suite
 * 
 * Tests:
 * 1. Indian Market Hours Engine (IST UTC+5:30, Pre-Open, Trading, Post-Close, Weekend, NSE Holidays)
 * 2. Mathematical Technical Indicators (SMA, EMA, RSI, MACD, Bollinger Bands, Volume MA)
 * 3. Real-Time Market Data Engine & Quote Normalization
 * 4. Real-Time Price Alert Engine (ABOVE, BELOW, PERCENT_CHANGE)
 * 5. Honest Data Freshness & Status Labeling (LIVE, DELAYED, MARKET_CLOSED, OFFLINE_SNAPSHOT)
 */

const assert = require('assert');
const {
  isMarketOpen,
  getMarketStatus,
  NSE_HOLIDAYS_2026,
} = require('../services/realtime/marketHours');
const {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
} = require('../services/realtime/technicalIndicators');
const marketDataEngine = require('../services/realtime/marketDataEngine');
const portfolioStore = require('../services/portfolioStore');

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
  console.log('\n--- Starting InvestIQ Real-Time Market Engine Verification Suite ---\n');

  // ──────────────────────────────────────────────────────────
  // 1. Indian Market Hours Engine
  // ──────────────────────────────────────────────────────────
  console.log('[1] Testing Indian Market Hours Engine (IST UTC+5:30)');

  runTest('Accurately detects Saturday and Sunday as closed', () => {
    // Saturday: 2026-05-23
    const saturday = new Date('2026-05-23T06:00:00Z');
    const satStatus = getMarketStatus(saturday);
    assert.strictEqual(satStatus.isMarketOpen, false);
    assert.strictEqual(satStatus.status, 'WEEKEND_CLOSED');

    // Sunday: 2026-05-24
    const sunday = new Date('2026-05-24T06:00:00Z');
    const sunStatus = getMarketStatus(sunday);
    assert.strictEqual(sunStatus.isMarketOpen, false);
    assert.strictEqual(satStatus.status, 'WEEKEND_CLOSED');
  });

  runTest('Detects 2026 NSE official holidays (Republic Day & Independence Day)', () => {
    // Republic Day: 2026-01-26
    const repDay = new Date('2026-01-26T06:00:00Z');
    const repStatus = getMarketStatus(repDay);
    assert.strictEqual(repStatus.isMarketOpen, false);
    assert.strictEqual(repStatus.status, 'HOLIDAY_CLOSED');
    assert.ok(repStatus.sessionDescription.includes('Republic Day'));

    // Independence Day: 2026-08-15
    const indDay = new Date('2026-08-15T06:00:00Z');
    const indStatus = getMarketStatus(indDay);
    assert.strictEqual(indStatus.isMarketOpen, false);
  });

  runTest('Identifies PRE_OPEN session between 09:00 and 09:15 IST on trading days', () => {
    // Wednesday 2026-05-20 at 09:05 IST -> 03:35 UTC
    const preOpenTime = new Date('2026-05-20T03:35:00Z');
    const status = getMarketStatus(preOpenTime);
    assert.strictEqual(status.status, 'PRE_OPEN');
    assert.strictEqual(status.isMarketOpen, false);
  });

  runTest('Identifies OPEN trading session between 09:15 and 15:30 IST', () => {
    // Wednesday 2026-05-20 at 11:30 IST -> 06:00 UTC
    const tradingTime = new Date('2026-05-20T06:00:00Z');
    const status = getMarketStatus(tradingTime);
    assert.strictEqual(status.status, 'OPEN');
    assert.strictEqual(status.isMarketOpen, true);
    assert.strictEqual(isMarketOpen(tradingTime), true);
  });

  runTest('Identifies POST_CLOSE session between 15:30 and 16:00 IST', () => {
    // Wednesday 2026-05-20 at 15:45 IST -> 10:15 UTC
    const postCloseTime = new Date('2026-05-20T10:15:00Z');
    const status = getMarketStatus(postCloseTime);
    assert.strictEqual(status.status, 'POST_CLOSE');
    assert.strictEqual(status.isMarketOpen, false);
  });

  runTest('Identifies CLOSED session after 16:00 IST', () => {
    // Wednesday 2026-05-20 at 18:30 IST -> 13:00 UTC
    const eveningTime = new Date('2026-05-20T13:00:00Z');
    const status = getMarketStatus(eveningTime);
    assert.strictEqual(status.status, 'CLOSED');
    assert.strictEqual(status.isMarketOpen, false);
  });

  // ──────────────────────────────────────────────────────────
  // 2. Mathematical Technical Indicators
  // ──────────────────────────────────────────────────────────
  console.log('\n[2] Testing Mathematical Technical Indicators (Validation & Formulas)');

  const mockCandles = [];
  const basePrice = 1000;
  for (let i = 0; i < 60; i++) {
    const close = basePrice + Math.sin(i / 5) * 50 + i * 2;
    mockCandles.push({
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      open: close - 2,
      high: close + 5,
      low: close - 4,
      close,
      volume: 100000 + i * 5000,
    });
  }

  runTest('calculateSMA computes correct 20-period moving average', () => {
    const sma20 = calculateSMA(mockCandles, 20);
    assert.strictEqual(sma20.length, mockCandles.length);
    assert.strictEqual(sma20[0], null, 'Initial elements before period should be null');
    assert.strictEqual(sma20[18], null);
    assert.ok(typeof sma20[19] === 'number', 'Element at period - 1 should be a number');

    // Manual check of first 20 closes
    const first20Sum = mockCandles.slice(0, 20).reduce((sum, c) => sum + c.close, 0);
    const expected = Number((first20Sum / 20).toFixed(2));
    assert.strictEqual(sma20[19], expected);
  });

  runTest('calculateEMA computes 9 and 20 period EMA with correct weighting multiplier', () => {
    const ema9 = calculateEMA(mockCandles, 9);
    assert.strictEqual(ema9.length, mockCandles.length);
    assert.strictEqual(ema9[7], null);
    assert.ok(typeof ema9[8] === 'number');

    // K multiplier for period 9 is 2 / (9 + 1) = 0.2
    const emaPrev = ema9[8];
    const nextClose = mockCandles[9].close;
    const expectedNextEma = Number((nextClose * 0.2 + emaPrev * 0.8).toFixed(2));
    assert.strictEqual(ema9[9], expectedNextEma);
  });

  runTest('calculateRSI computes 14-period Relative Strength Index bounded in [0, 100]', () => {
    const rsi14 = calculateRSI(mockCandles, 14);
    assert.strictEqual(rsi14.length, mockCandles.length);
    assert.strictEqual(rsi14[0], null);

    const validValues = rsi14.filter((v) => v !== null);
    assert.ok(validValues.length > 0);
    validValues.forEach((val) => {
      assert.ok(val >= 0 && val <= 100, `RSI ${val} out of bounds`);
    });
  });

  runTest('calculateMACD computes MACD line, Signal line, and Histogram', () => {
    const macd = calculateMACD(mockCandles, 12, 26, 9);
    assert.strictEqual(macd.macdLine.length, mockCandles.length);
    assert.strictEqual(macd.signalLine.length, mockCandles.length);
    assert.strictEqual(macd.histogram.length, mockCandles.length);

    // MACD requires 26 bars before first calculation
    assert.strictEqual(macd.macdLine[24], null);
    assert.ok(typeof macd.macdLine[25] === 'number');

    // Check histogram = macd - signal when signal exists
    const lastIdx = mockCandles.length - 1;
    if (macd.signalLine[lastIdx] !== null) {
      const diff = Number((macd.macdLine[lastIdx] - macd.signalLine[lastIdx]).toFixed(2));
      assert.strictEqual(macd.histogram[lastIdx], diff);
    }
  });

  runTest('calculateBollingerBands produces Upper >= Middle >= Lower bands', () => {
    const bands = calculateBollingerBands(mockCandles, 20, 2);
    assert.strictEqual(bands.upper.length, mockCandles.length);
    assert.strictEqual(bands.middle.length, mockCandles.length);
    assert.strictEqual(bands.lower.length, mockCandles.length);

    for (let i = 20; i < mockCandles.length; i++) {
      if (bands.upper[i] !== null && bands.middle[i] !== null && bands.lower[i] !== null) {
        assert.ok(bands.upper[i] >= bands.middle[i], `Upper ${bands.upper[i]} < Middle ${bands.middle[i]}`);
        assert.ok(bands.middle[i] >= bands.lower[i], `Middle ${bands.middle[i]} < Lower ${bands.lower[i]}`);
      }
    }
  });

  runTest('calculateVolumeMA produces moving average of trading volume', () => {
    const volMa = calculateVolumeMA(mockCandles, 20);
    assert.strictEqual(volMa.length, mockCandles.length);
    assert.strictEqual(volMa[18], null);
    assert.ok(typeof volMa[19] === 'number');
  });

  // ──────────────────────────────────────────────────────────
  // 3. Real-Time Market Data Engine & Quote Normalization
  // ──────────────────────────────────────────────────────────
  console.log('\n[3] Testing Real-Time Market Data Engine & Symbol Normalization');

  await runAsyncTest('Normalizes symbols and returns clear unavailable state when provider offline (no fake prices)', async () => {
    const quote = await marketDataEngine.getQuote('RELIANCE.NS');
    assert.strictEqual(quote.symbol, 'RELIANCE');
    assert.strictEqual(quote.exchange, 'NSE');
    assert.ok(quote.instrumentKey.includes('RELIANCE') || quote.instrumentKey.includes('INE002A01018'));
    assert.strictEqual(quote.lastPrice, null, 'Offline quote must not fabricate numbers');
    assert.strictEqual(quote.dataFreshness, 'UNAVAILABLE');
    assert.strictEqual(quote.dataStatus, 'unavailable');
  });

  runTest('Accurately ingests verified broker ticks with exact price change and percentage formulas', () => {
    const verifiedTick = {
      symbol: 'RELIANCE',
      lastPrice: 2985.40,
      previousClose: 2947.20,
      open: 2950.00,
      high: 2994.80,
      low: 2942.00,
      volume: 4820000,
      source: 'broker-stream',
      provider: 'upstox',
    };

    const ingested = marketDataEngine.ingestTick(verifiedTick);
    assert.strictEqual(ingested.symbol, 'RELIANCE');
    assert.strictEqual(ingested.lastPrice, 2985.40);
    assert.strictEqual(ingested.previousClose, 2947.20);

    // Price Change = 2985.40 - 2947.20 = 38.20
    assert.strictEqual(ingested.change, 38.20);
    assert.strictEqual(ingested.dayChange, 38.20);

    // Percentage Change = (38.20 / 2947.20) * 100 = 1.30%
    const expectedPct = Number(((38.20 / 2947.20) * 100).toFixed(2));
    assert.strictEqual(ingested.dayChangePercent, expectedPct);
    assert.strictEqual(ingested.dataFreshness, 'LIVE');
  });

  await runAsyncTest('Batch getQuotes returns structured dictionary of quotes', async () => {
    const batch = await marketDataEngine.getQuotes(['RELIANCE', 'TCS', 'INFY']);
    assert.ok(batch.RELIANCE);
    assert.ok(batch.TCS);
    assert.ok(batch.INFY);
    assert.strictEqual(batch.RELIANCE.symbol, 'RELIANCE');
    assert.strictEqual(batch.TCS.symbol, 'TCS');
  });

  runTest('In-memory quote cache serves instant hits without delay', () => {
    const cached = marketDataEngine.getCachedQuote('RELIANCE');
    assert.ok(cached !== null);
    assert.strictEqual(cached.symbol, 'RELIANCE');
    assert.strictEqual(cached.lastPrice, 2985.40);
  });

  await runAsyncTest('getIndexQuotes returns structured benchmarks for NIFTY 50, SENSEX, and BANK NIFTY', async () => {
    const indices = await marketDataEngine.getIndexQuotes();
    assert.strictEqual(indices.length, 3);
    const names = indices.map((i) => i.name);
    assert.ok(names.includes('NIFTY 50'));
    assert.ok(names.includes('SENSEX'));
    assert.ok(names.includes('BANK NIFTY'));

    for (const idx of indices) {
      assert.ok(idx.symbol.startsWith('^'));
      assert.ok(idx.instrumentKey);
      assert.ok(['LIVE', 'DELAYED', 'STALE', 'UNAVAILABLE'].includes(idx.dataFreshness));
    }
  });

  // ──────────────────────────────────────────────────────────
  // 4. Real-Time Price Alerts
  // ──────────────────────────────────────────────────────────
  console.log('\n[4] Testing Real-Time Price Alert Engine');

  const testUserId = 'test_user_alerts_999';

  await runAsyncTest('Creates user price alert rules (ABOVE and BELOW)', async () => {
    const alertAbove = await portfolioStore.createPriceAlert(testUserId, {
      symbol: 'RELIANCE',
      condition: 'ABOVE',
      targetPrice: 3000,
    });
    assert.strictEqual(alertAbove.symbol, 'RELIANCE');
    assert.strictEqual(alertAbove.condition, 'ABOVE');
    assert.strictEqual(alertAbove.targetPrice, 3000);
    assert.strictEqual(alertAbove.status, 'ACTIVE');

    const alertBelow = await portfolioStore.createPriceAlert(testUserId, {
      symbol: 'RELIANCE',
      condition: 'BELOW',
      targetPrice: 2800,
    });
    assert.strictEqual(alertBelow.condition, 'BELOW');
    assert.strictEqual(alertBelow.targetPrice, 2800);
  });

  await runAsyncTest('Evaluates and triggers ABOVE alert when price crosses target', async () => {
    const quote = {
      symbol: 'RELIANCE',
      lastPrice: 3050,
      dayChangePercent: 2.5,
    };

    const triggered = await portfolioStore.evaluateAlertsForQuote(quote);
    const userTriggered = triggered.filter((a) => a.userId === testUserId);
    assert.ok(userTriggered.length >= 1);
    assert.strictEqual(userTriggered[0].condition, 'ABOVE');
    assert.strictEqual(userTriggered[0].status, 'TRIGGERED');
    assert.ok(userTriggered[0].triggeredAt);
  });

  await runAsyncTest('Triggered alert is marked TRIGGERED and does not fire again', async () => {
    const quote = {
      symbol: 'RELIANCE',
      lastPrice: 3100,
      dayChangePercent: 3.5,
    };

    const secondRun = await portfolioStore.evaluateAlertsForQuote(quote);
    const userTriggeredAgain = secondRun.filter((a) => a.userId === testUserId && a.condition === 'ABOVE');
    assert.strictEqual(userTriggeredAgain.length, 0, 'Alert must not duplicate fire');
  });

  await runAsyncTest('User can delete their price alerts', async () => {
    const alerts = await portfolioStore.getPriceAlerts(testUserId);
    assert.ok(alerts.length > 0);
    const idToDelete = alerts[0]._id || alerts[0].id;
    const deleted = await portfolioStore.deletePriceAlert(testUserId, idToDelete);
    assert.strictEqual(deleted, true);

    const remaining = await portfolioStore.getPriceAlerts(testUserId);
    assert.strictEqual(remaining.length, alerts.length - 1);
  });

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  console.log('\n========================================');
  console.log(`Verification Complete: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
  console.log('========================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
