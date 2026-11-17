import assert from 'node:assert';
import {
  calculateTotalInvested,
  calculateWeightedAveragePrice,
  groupInvestmentsByHolding,
  filterTransactions,
  getPortfolioMetrics,
  normalizeTransaction,
} from '../src/services/portfolioStorage.js';

console.log('--- Running Phase 1 Portfolio Storage Unit Tests ---');

// Test 1: Normalize Transaction
const sampleRaw = {
  companyName: ' Reliance Industries ',
  symbol: 'reliance.ns',
  broker: 'Groww',
  quantity: '10',
  purchasePrice: '2500',
  transactionCharges: '20',
  purchaseDate: '2026-11-15',
};
const normalized = normalizeTransaction(sampleRaw);
assert.strictEqual(normalized.companyName, 'Reliance Industries');
assert.strictEqual(normalized.symbol, 'RELIANCE.NS');
assert.strictEqual(normalized.quantity, 10);
assert.strictEqual(normalized.purchasePrice, 2500);
assert.strictEqual(normalized.transactionCharges, 20);
assert.strictEqual(normalized.purchaseValue, 25000);
assert.strictEqual(normalized.totalCost, 25020);
console.log('✓ PASS: normalizeTransaction correctly calculates purchaseValue and totalCost');

// Test 2: Weighted Average Purchase Price Calculation
// Purchase 1: 10 shares @ ₹2,500 (₹25,000)
// Purchase 2: 5 shares @ ₹2,800 (₹14,000)
// Total Qty = 15 shares, Total = ₹39,000
// Weighted Avg = 39000 / 15 = ₹2,600.00
const tx1 = normalizeTransaction({
  companyName: 'Reliance Industries',
  symbol: 'RELIANCE',
  broker: 'Groww',
  quantity: 10,
  purchasePrice: 2500,
});
const tx2 = normalizeTransaction({
  companyName: 'Reliance Industries',
  symbol: 'RELIANCE',
  broker: 'Groww',
  quantity: 5,
  purchasePrice: 2800,
});
const tx3 = normalizeTransaction({
  companyName: 'Tata Consultancy Services',
  symbol: 'TCS',
  broker: 'Zerodha Kite',
  quantity: 4,
  purchasePrice: 3800,
  transactionCharges: 15,
});

const weightedAvg = calculateWeightedAveragePrice([tx1, tx2]);
assert.strictEqual(weightedAvg, 2600);
console.log('✓ PASS: calculateWeightedAveragePrice produces exact weighted-average (₹2,600)');

// Test 3: Total Invested Calculation (including transaction charges)
const totalInvested = calculateTotalInvested([tx1, tx2, tx3]);
// tx1 totalCost: 25000, tx2 totalCost: 14000, tx3 totalCost: 4 * 3800 + 15 = 15215
assert.strictEqual(totalInvested, 25000 + 14000 + 15215);
console.log('✓ PASS: calculateTotalInvested correctly sums purchase values and transaction charges');

// Test 4: Group Investments by Holding
const holdings = groupInvestmentsByHolding([tx1, tx2, tx3]);
assert.strictEqual(holdings.length, 2); // 1 for RELIANCE (Groww) and 1 for TCS (Zerodha)
const relHolding = holdings.find((h) => h.stockSymbol === 'RELIANCE');
assert.strictEqual(relHolding.totalQuantity, 15);
assert.strictEqual(relHolding.averagePrice, 2600);
assert.strictEqual(relHolding.totalInvested, 39000);
assert.strictEqual(relHolding.transactionCount, 2);
console.log('✓ PASS: groupInvestmentsByHolding aggregates multiple purchases under weighted-average price');

// Test 5: Portfolio Summary Metrics
const metrics = getPortfolioMetrics([tx1, tx2, tx3]);
assert.strictEqual(metrics.totalRecords, 3);
assert.strictEqual(metrics.totalCompanies, 2);
assert.strictEqual(metrics.totalBrokers, 2);
assert.strictEqual(metrics.totalInvested, 54215);
console.log('✓ PASS: getPortfolioMetrics accurately reports totalInvested, records, companies, and brokers');

// Test 6: Transaction Filtering
const searchResult = filterTransactions([tx1, tx2, tx3], { search: 'tata' });
assert.strictEqual(searchResult.length, 1);
assert.strictEqual(searchResult[0].symbol, 'TCS');

const brokerResult = filterTransactions([tx1, tx2, tx3], { broker: 'Groww' });
assert.strictEqual(brokerResult.length, 2);
console.log('✓ PASS: filterTransactions filters accurately by search term and broker');

console.log('========================================');
console.log('All 6 Phase 1 Portfolio Storage tests passed!');
console.log('========================================');
