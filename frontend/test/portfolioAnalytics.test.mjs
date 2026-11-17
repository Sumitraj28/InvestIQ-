import assert from 'node:assert';
import {
  calculatePortfolioMetrics,
  calculateBrokerAnalysis,
  enrichHoldingWithQuote,
  getGainersAndLosers,
  generatePortfolioInsights,
  formatINR,
  formatPercent,
} from '../src/services/portfolioAnalytics.js';

console.log('--- Running Phase 3 Portfolio Analytics Engine Tests ---');

// Test 1: Enrich Holding with Live Quote
const sampleHolding1 = {
  holdingKey: 'RELIANCE_Groww',
  companyName: 'Reliance Industries',
  stockSymbol: 'RELIANCE',
  exchange: 'NSE',
  brokerName: 'Groww',
  totalQuantity: 10,
  averagePrice: 2500,
  totalInvested: 25000,
};

// Quote: Current price ₹2,750 (+10%)
const enriched1 = enrichHoldingWithQuote(sampleHolding1, {
  price: 2750,
  dayChangePercent: 1.25,
  isLive: true,
});

assert.strictEqual(enriched1.currentPrice, 2750);
assert.strictEqual(enriched1.currentValue, 27500); // 10 * 2750
assert.strictEqual(enriched1.unrealizedPnl, 2500); // 27500 - 25000
assert.strictEqual(enriched1.returnPercent, 10); // (2500 / 25000) * 100
assert.strictEqual(enriched1.priceStatus, 'LIVE');
console.log('✓ PASS: enrichHoldingWithQuote correctly calculates current value, unrealized P&L, and return %');

// Test 2: Enrich Holding with Negative Return
const sampleHolding2 = {
  holdingKey: 'TCS_Zerodha',
  companyName: 'Tata Consultancy Services',
  stockSymbol: 'TCS',
  exchange: 'NSE',
  brokerName: 'Zerodha Kite',
  totalQuantity: 5,
  averagePrice: 3800,
  totalInvested: 19000,
};

// Quote: Current price ₹3,700 (-2.63%)
const enriched2 = enrichHoldingWithQuote(sampleHolding2, {
  price: 3700,
  dayChangePercent: -0.5,
  isLive: false,
});

assert.strictEqual(enriched2.currentValue, 18500); // 5 * 3700
assert.strictEqual(enriched2.unrealizedPnl, -500); // 18500 - 19000
assert.strictEqual(enriched2.returnPercent, -2.63); // (-500 / 19000) * 100
console.log('✓ PASS: enrichHoldingWithQuote accurately tracks negative returns (-2.63%)');

// Test 3: Handling Missing / Unavailable Prices Safely
const sampleHolding3 = {
  holdingKey: 'INFY_AngelOne',
  companyName: 'Infosys Limited',
  stockSymbol: 'INFY',
  exchange: 'NSE',
  brokerName: 'Angel One',
  totalQuantity: 10,
  averagePrice: 1500,
  totalInvested: 15000,
};

// Quote: price is null
const enriched3 = enrichHoldingWithQuote(sampleHolding3, null);
assert.strictEqual(enriched3.currentPrice, null);
assert.strictEqual(enriched3.currentValue, null);
assert.strictEqual(enriched3.unrealizedPnl, null);
assert.strictEqual(enriched3.returnPercent, null);
assert.strictEqual(enriched3.priceStatus, 'UNAVAILABLE');
console.log('✓ PASS: Missing prices marked UNAVAILABLE without fabricating market value');

// Test 4: Portfolio-Wide Metrics Calculation
const metrics = calculatePortfolioMetrics([enriched1, enriched2, enriched3]);
// Total Invested: 25000 + 19000 + 15000 = 59000
assert.strictEqual(metrics.totalInvested, 59000);
// Calculable Invested (only priced): 25000 + 19000 = 44000
assert.strictEqual(metrics.calculableInvested, 44000);
// Total Current Value: 27500 + 18500 = 46000
assert.strictEqual(metrics.totalCurrentValue, 46000);
// Total Unrealized P&L: 46000 - 44000 = 2000
assert.strictEqual(metrics.totalUnrealizedPnl, 2000);
// Overall return: (2000 / 44000) * 100 = +4.55%
assert.strictEqual(metrics.overallReturnPercent, 4.55);
assert.strictEqual(metrics.totalHoldings, 3);
assert.strictEqual(metrics.pricedCount, 2);
assert.strictEqual(metrics.hasMissingPrices, true);
console.log('✓ PASS: calculatePortfolioMetrics aggregates accurately with partial valuation detection');

// Test 5: Gainers & Losers Ranking
const { gainers, losers } = getGainersAndLosers([enriched1, enriched2, enriched3]);
assert.strictEqual(gainers.length, 1);
assert.strictEqual(gainers[0].stockSymbol, 'RELIANCE');
assert.strictEqual(gainers[0].returnPercent, 10);
assert.strictEqual(losers.length, 1);
assert.strictEqual(losers[0].stockSymbol, 'TCS');
assert.strictEqual(losers[0].returnPercent, -2.63);
console.log('✓ PASS: getGainersAndLosers correctly identifies best and worst performers');

// Test 6: Broker-Wise Analysis
const brokerAnalysis = calculateBrokerAnalysis([enriched1, enriched2, enriched3]);
assert.strictEqual(brokerAnalysis.length, 3);
const groww = brokerAnalysis.find((b) => b.brokerName === 'Groww');
assert.strictEqual(groww.totalInvested, 25000);
assert.strictEqual(groww.currentValue, 27500);
assert.strictEqual(groww.unrealizedPnl, 2500);
assert.strictEqual(groww.returnPercent, 10);
console.log('✓ PASS: calculateBrokerAnalysis segments holdings and P&L by broker');

// Test 7: Rule-Based Insights Generation
const insights = generatePortfolioInsights([enriched1, enriched2, enriched3], metrics);
assert.ok(insights.length >= 3);
const hasValuationInsight = insights.some((i) => i.title.includes('Valuation Coverage'));
assert.strictEqual(hasValuationInsight, true);
console.log('✓ PASS: generatePortfolioInsights generates factual, non-prescriptive insights');

console.log('========================================');
console.log('All 7 Phase 3 Portfolio Analytics tests passed!');
console.log('========================================');
