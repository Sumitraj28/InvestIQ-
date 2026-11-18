/**
 * aiIntelligence.test.js
 * Comprehensive Verification Suite for InvestIQ Advanced AI Stock Intelligence Engine
 * 
 * Verifies:
 * 1. Deterministic Technical Engine (RSI 14, MACD, SMA, EMA, Bollinger, ATR, Momentum, Support/Resistance)
 * 2. Deterministic Risk Engine (Annualized Volatility, Max Drawdown, Downside Volatility, Beta)
 * 3. Fundamental Analysis Engine (Sector benchmarking, missing-data isolation)
 * 4. Structured Research Assessment Engine (Positive/Neutral/Negative/Insufficient setups, NO Buy/Sell)
 * 5. AI Research Explainer (OpenAI failure handling, transparent rule-based labeling)
 * 6. Error & Boundary Handling (Insufficient history, missing fields, invalid tickers)
 */

const assert = require('assert');
const {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateMomentum,
  calculateSupportResistance,
  analyzeTechnicalSetup,
} = require('../services/ai/technicalEngine');

const {
  calculateHistoricalVolatility,
  calculateDownsideDeviation,
  calculateMaxDrawdown,
  calculateBeta,
  analyzeRiskProfile,
} = require('../services/ai/riskEngine');

const {
  analyzeFundamentals,
  resolveSectorBenchmark,
} = require('../services/ai/fundamentalEngine');

const {
  generateResearchAssessment,
} = require('../services/ai/researchEngine');

const {
  generateStockResearchBrief,
  buildRuleBasedExplanation,
} = require('../services/ai/aiResearchExplainer');

const {
  generateAiCompanyBrief,
} = require('../services/aiSummaryService');

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
  console.log('\n--- Starting InvestIQ AI Stock Intelligence Verification Suite ---\n');

  // ──────────────────────────────────────────────────────────
  // 1. Technical Indicators Mathematical Accuracy
  // ──────────────────────────────────────────────────────────
  console.log('[1] Testing Deterministic Technical Indicator Formulas');

  runTest('calculateSMA computes accurate arithmetic mean over window', () => {
    const data = [10, 20, 30, 40, 50];
    const sma3 = calculateSMA(data, 3);
    assert.strictEqual(sma3, 40); // (30+40+50)/3 = 40
    assert.strictEqual(calculateSMA(data, 10), null); // window > len
  });

  runTest('calculateEMA applies exponential decay weighting correctly', () => {
    const data = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const ema5 = calculateEMA(data, 5);
    assert.ok(Number.isFinite(ema5));
    assert.ok(ema5 > 15 && ema5 < 19);
  });

  runTest('calculateRSI with Wilder smoothing correctly bounds in [0, 100]', () => {
    // 20 strictly increasing closes -> RSI must be 100
    const rising = Array.from({ length: 25 }, (_, i) => 100 + i * 2);
    const rsiBull = calculateRSI(rising, 14);
    assert.strictEqual(rsiBull, 100);

    // 20 strictly decreasing closes -> RSI must approach 0
    const falling = Array.from({ length: 25 }, (_, i) => 200 - i * 2);
    const rsiBear = calculateRSI(falling, 14);
    assert.ok(rsiBear < 5);

    // Oscillating series
    const oscillating = [100, 102, 101, 103, 102, 104, 103, 105, 104, 106, 105, 107, 106, 108, 107, 109];
    const rsiNorm = calculateRSI(oscillating, 14);
    assert.ok(rsiNorm >= 0 && rsiNorm <= 100);
  });

  runTest('calculateMACD generates Line, Signal, and Histogram correctly', () => {
    const trend = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 5 + i * 0.5);
    const macd = calculateMACD(trend, 12, 26, 9);
    assert.ok(macd !== null);
    assert.ok(Number.isFinite(macd.macdLine));
    assert.ok(Number.isFinite(macd.signalLine));
    assert.ok(Number.isFinite(macd.histogram));
    assert.strictEqual(Number((macd.macdLine - macd.signalLine).toFixed(6)), Number(macd.histogram.toFixed(6)));
  });

  runTest('calculateBollingerBands produces Upper >= Middle >= Lower', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 150 + (i % 5) * 2);
    const bands = calculateBollingerBands(closes, 20, 2.0);
    assert.ok(bands !== null);
    assert.ok(bands.upper >= bands.middle);
    assert.ok(bands.middle >= bands.lower);
    assert.ok(bands.bandwidth >= 0);
  });

  runTest('calculateATR handles True Range gaps and Wilder smoothing', () => {
    const bars = [
      { high: 105, low: 95, close: 100 },
      { high: 110, low: 102, close: 108 }, // gap up
      { high: 109, low: 99, close: 101 },  // wide range
      ...Array.from({ length: 20 }, (_, i) => ({ high: 105 + i, low: 98 + i, close: 102 + i })),
    ];
    const atr = calculateATR(bars, 14);
    assert.ok(atr !== null);
    assert.ok(atr.atr > 0);
    assert.ok(atr.atrPercent > 0);
  });

  runTest('calculateMomentum computes 14-period Rate of Change percentage', () => {
    const closes = Array.from({ length: 20 }, () => 100);
    closes[19] = 110; // +10% over 14 bars ago
    const roc = calculateMomentum(closes, 14);
    assert.strictEqual(Number(roc.toFixed(2)), 10.00);
  });

  runTest('analyzeTechnicalSetup handles insufficient data gracefully', () => {
    const sparseHistory = [{ date: '2026-01-01', close: 100 }];
    const res = analyzeTechnicalSetup(sparseHistory);
    assert.strictEqual(res.status, 'INSUFFICIENT_DATA');
    assert.ok(res.message.includes('At least 20 historical sessions'));
  });

  // ──────────────────────────────────────────────────────────
  // 2. Risk Engine Quantitative Metrics
  // ──────────────────────────────────────────────────────────
  console.log('\n[2] Testing Deterministic Risk Engine & Metrics');

  runTest('calculateHistoricalVolatility computes annualized log return volatility', () => {
    // Generate deterministic series with constant 1% daily moves
    const closes = [100];
    for (let i = 1; i < 60; i++) {
      closes.push(closes[i - 1] * (i % 2 === 0 ? 1.01 : 0.99));
    }
    const vol = calculateHistoricalVolatility(closes, 60);
    assert.ok(vol !== null);
    assert.ok(vol > 10 && vol < 25); // typical annualized range
  });

  runTest('calculateMaxDrawdown tracks peak-to-trough drop accurately', () => {
    // 100 -> 150 (peak) -> 90 (trough: -40% drop) -> 120
    const closes = [100, 110, 130, 150, 140, 120, 90, 110, 120];
    const mdd = calculateMaxDrawdown(closes);
    assert.strictEqual(mdd, -40.00);
  });

  runTest('calculateDownsideDeviation measures semi-variance below 0% target', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + (i % 2 === 0 ? 2 : -2));
    const downside = calculateDownsideDeviation(closes, 40);
    assert.ok(downside !== null);
    assert.ok(downside > 0);
  });

  runTest('calculateBeta evaluates stock covariance against market index', () => {
    // Perfect correlation stock with 1.5x beta
    const market = Array.from({ length: 40 }, (_, i) => 100 + i);
    const stock = Array.from({ length: 40 }, (_, i) => 100 + i * 1.5);
    const beta = calculateBeta(stock, market);
    assert.ok(beta !== null);
    assert.ok(Number.isFinite(beta) && beta > 1.2);
  });

  runTest('analyzeRiskProfile assigns plain-English risk categorization and observations', () => {
    const volatileHistory = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      close: 100 + Math.sin(i) * 20,
    }));
    const risk = analyzeRiskProfile(volatileHistory);
    assert.strictEqual(risk.status, 'VALID');
    assert.ok(['HIGH', 'MODERATE', 'LOW_TO_MODERATE'].includes(risk.riskRating));
    assert.ok(risk.observations.length > 0);
    assert.ok(risk.metrics.assumptions.includes('Annualized using 252'));
  });

  // ──────────────────────────────────────────────────────────
  // 3. Fundamental Analysis & Sector Benchmarking
  // ──────────────────────────────────────────────────────────
  console.log('\n[3] Testing Fundamental Analysis & Sector Benchmarks');

  runTest('Resolves sector benchmark correctly and isolates missing data', () => {
    const itBench = resolveSectorBenchmark('Information Technology');
    assert.strictEqual(itBench.pe, 28.0);

    const fmcgBench = resolveSectorBenchmark('FMCG');
    assert.strictEqual(fmcgBench.pe, 42.0);

    // Stock with missing ROE and P/E
    const sparseStock = { ticker: 'TEST', sector: 'IT Services' };
    const fund = analyzeFundamentals(sparseStock);
    assert.strictEqual(fund.valuationTag, 'DATA_UNAVAILABLE');
    assert.strictEqual(fund.metrics.trailingPe, null);
    assert.ok(fund.observations.some(o => o.includes('unavailable')));
  });

  runTest('Identifies attractive valuation and healthy balance sheet', () => {
    const valueStock = {
      ticker: 'GOODCO',
      sector: 'IT Services',
      peRatio: 18.0, // below 28.0 sector benchmark
      roe: 25.0,
      debtToEquity: 0.1,
      marketCap: 500000000000,
    };
    const fund = analyzeFundamentals(valueStock);
    assert.strictEqual(fund.valuationTag, 'ATTRACTIVE');
    assert.ok(fund.strengths.some(s => s.includes('Favorable Valuation')));
    assert.ok(fund.strengths.some(s => s.includes('Conservative Balance Sheet')));
  });

  // ──────────────────────────────────────────────────────────
  // 4. Research Assessment & FinTech Ethics (NO Buy/Sell)
  // ──────────────────────────────────────────────────────────
  console.log('\n[4] Testing Research Assessment & Setup Classification');

  runTest('Classifies positive technical setup when moving averages align', () => {
    // Generate 60 days of consistent uptrend
    const history = Array.from({ length: 60 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: 100 + i * 2,
      high: 103 + i * 2,
      low: 99 + i * 2,
      close: 102 + i * 2,
      volume: 1000000,
    }));

    const stock = {
      ticker: 'BULLCO',
      lastPrice: 222,
      history5y: history,
      sector: 'Technology',
      peRatio: 20,
    };

    const res = generateResearchAssessment(stock);
    assert.strictEqual(res.classification, 'POSITIVE_TECHNICAL_SETUP');
    assert.strictEqual(res.label, 'Positive Technical Setup');
    assert.ok(res.bullishEvidence.length > 0);
    // Enforces compliance: never outputs "BUY" as classification
    assert.strictEqual(res.classification.includes('BUY'), false);
  });

  runTest('Classifies insufficient data when price history is sparse', () => {
    const res = generateResearchAssessment({ ticker: 'NEWLIST', history5y: [] });
    assert.strictEqual(res.classification, 'INSUFFICIENT_DATA');
    assert.strictEqual(res.label, 'Insufficient Historical Data');
  });

  // ──────────────────────────────────────────────────────────
  // 5. AI Research Explainer & Fallback Transparency
  // ──────────────────────────────────────────────────────────
  console.log('\n[5] Testing AI Research Explainer & Fallback Transparency');

  await runAsyncTest('Gracefully falls back to rule-based engine when OpenAI fails or unconfigured', async () => {
    const history = Array.from({ length: 40 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      open: 100 + i,
      high: 102 + i,
      low: 98 + i,
      close: 101 + i,
      volume: 500000,
    }));

    const stock = {
      ticker: 'RELIANCE',
      name: 'Reliance Industries Limited',
      lastPrice: 2980.50,
      sector: 'Energy',
      history5y: history,
    };

    const brief = await generateAiCompanyBrief(stock);
    assert.ok(brief !== null);
    // Explicitly labeled as rule-based quantitative engine, NOT fake AI
    assert.strictEqual(brief.generatedBy, 'rule-based-quantitative-engine');
    assert.strictEqual(brief.isAiGenerated, false);
    assert.ok(brief.companyOverview.includes('Reliance'));
    assert.ok(brief.technicalTrend.length > 0);
    assert.ok(brief.assessment !== undefined);
  });

  runTest('buildRuleBasedExplanation constructs structured narrative without hallucination', () => {
    const stock = { ticker: 'TCS', name: 'Tata Consultancy Services', lastPrice: 4200 };
    const assessment = {
      classification: 'POSITIVE_TECHNICAL_SETUP',
      label: 'Positive Technical Setup',
      color: 'emerald',
      summary: 'Constructive setup.',
      bullishEvidence: ['Price above 50 SMA'],
      bearishEvidence: [],
      contradictions: [],
      technicals: { effectivePrice: 4200, indicators: { movingAverages: {}, rsi: { value: 62 }, macd: { histogram: 1.5 }, atr: { value: 45, percentOfPrice: 1.07 } } },
      risks: { summary: 'Low volatility' },
      fundamentals: { strengths: ['High ROE'], weaknesses: [], metrics: { trailingPe: 30, sectorPeBenchmark: 28 }, valuationTag: 'FAIR' },
    };

    const explanation = buildRuleBasedExplanation(stock, assessment);
    assert.strictEqual(explanation.generatedBy, 'rule-based-quantitative-engine');
    assert.strictEqual(explanation.isAiGenerated, false);
    assert.ok(explanation.priceBehaviour.includes('4,200'));
    assert.ok(explanation.bullishEvidence.includes('Price above 50 SMA'));
  });

  console.log('\n========================================');
  console.log(`Verification Complete: ${passedTests} Passed, ${totalTests - passedTests} Failed`);
  console.log('========================================\n');

  if (totalTests - passedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error in aiIntelligence.test.js:', err);
  process.exit(1);
});
