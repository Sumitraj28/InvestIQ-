/**
 * researchEngine.js
 * Structured Stock Research Assessment Engine for InvestIQ
 * 
 * Aggregates deterministic outputs from:
 * 1. Technical Engine (technicalEngine.js)
 * 2. Risk Engine (riskEngine.js)
 * 3. Fundamental Engine (fundamentalEngine.js)
 * 
 * Enforces FinTech Compliance:
 * - NO Buy / Sell / Avoid orders.
 * - Categorizes into 4 objective technical & research states:
 *   - POSITIVE_TECHNICAL_SETUP
 *   - NEUTRAL_OR_MIXED_SETUP
 *   - NEGATIVE_TECHNICAL_SETUP
 *   - INSUFFICIENT_DATA
 * - Delivers balanced Bullish Evidence, Bearish Evidence, Contradictions, and Key Risks.
 */

const { analyzeTechnicalSetup } = require('./technicalEngine');
const { analyzeRiskProfile } = require('./riskEngine');
const { analyzeFundamentals } = require('./fundamentalEngine');

function generateResearchAssessment(stock = {}, marketHistory = []) {
  const history = stock.history5y || [];
  const currentPrice = stock.lastPrice || null;

  // 1. Execute deterministic quantitative engines
  const technicals = analyzeTechnicalSetup(history, currentPrice);
  const risks = analyzeRiskProfile(history, marketHistory, currentPrice);
  const fundamentals = analyzeFundamentals(stock);

  if (technicals.status === 'INSUFFICIENT_DATA' || history.length < 20) {
    return {
      status: 'INSUFFICIENT_DATA',
      classification: 'INSUFFICIENT_DATA',
      label: 'Insufficient Historical Data',
      color: 'slate',
      timeHorizon: 'Short to Intermediate Term (1-3 Months)',
      dataFreshness: stock.dataFreshness || 'UNAVAILABLE',
      evaluatedAt: new Date().toISOString(),
      summary: 'Insufficient historical market sessions available to construct an evidence-based technical or risk assessment.',
      bullishEvidence: [],
      bearishEvidence: [],
      contradictions: ['Trading history is below the minimum required statistical threshold (20 sessions).'],
      keyRisks: ['Data gaps or recent listing limits reliable quantitative indicator analysis.'],
      assumptions: 'Minimum 20 continuous trading sessions needed for valid SMA and volatility calculations.',
      technicals,
      risks,
      fundamentals,
    };
  }

  const { indicators } = technicals;
  const { rsi, macd, movingAverages, bollingerBands, momentum } = indicators;

  const bullishEvidence = [];
  const bearishEvidence = [];
  const contradictions = [];
  const keyRisks = [...(risks.observations || [])];

  // Moving Average Structure
  if (movingAverages.sma20 && technicals.effectivePrice >= movingAverages.sma20) {
    bullishEvidence.push(`Price is trading above 20-day SMA (₹${movingAverages.sma20}), confirming short-term trend strength.`);
  } else if (movingAverages.sma20) {
    bearishEvidence.push(`Price is trading below 20-day SMA (₹${movingAverages.sma20}), reflecting short-term consolidation.`);
  }

  if (movingAverages.priceAboveSma50) {
    bullishEvidence.push(`Price is trading above 50-day SMA (₹${movingAverages.sma50}), confirming medium-term trend support.`);
  } else if (movingAverages.sma50) {
    bearishEvidence.push(`Price is trading below 50-day SMA (₹${movingAverages.sma50}), indicating medium-term resistance.`);
  }

  if (movingAverages.priceAboveSma200) {
    bullishEvidence.push(`Price is trading above 200-day SMA (₹${movingAverages.sma200}), supporting long-term structural uptrend.`);
  } else if (movingAverages.sma200) {
    bearishEvidence.push(`Price is trading below 200-day SMA (₹${movingAverages.sma200}), reflecting long-term structural lag.`);
  }

  if (movingAverages.goldenCross) {
    bullishEvidence.push('Golden Cross confirmed: 50-day SMA is positioned above the 200-day SMA.');
  } else if (movingAverages.sma50 && movingAverages.sma200 && movingAverages.sma50 < movingAverages.sma200) {
    bearishEvidence.push('Death Cross / Bearish Alignment: 50-day SMA is positioned below the 200-day SMA.');
  }

  // Momentum & Oscillators
  if (rsi.value !== null) {
    if (rsi.value >= 70) {
      contradictions.push(`RSI is in overbought territory (${rsi.value}), which may limit immediate upside momentum without a consolidation phase.`);
    } else if (rsi.value <= 30) {
      bullishEvidence.push(`RSI is in deep oversold territory (${rsi.value}), indicating potential seller exhaustion.`);
    } else if (rsi.value >= 50) {
      bullishEvidence.push(`RSI (${rsi.value}) is positive and holds above the 50 centerline.`);
    } else {
      bearishEvidence.push(`RSI (${rsi.value}) is weak and holds below the 50 centerline.`);
    }
  }

  if (macd.histogram !== null) {
    if (macd.histogram > 0) {
      bullishEvidence.push(`MACD histogram is positive (+${macd.histogram}), signaling expanding short-term upward momentum.`);
    } else if (macd.histogram < 0) {
      bearishEvidence.push(`MACD histogram is negative (${macd.histogram}), signaling short-term downward momentum.`);
    }
  }

  // Bollinger Bands
  if (bollingerBands.upper && technicals.effectivePrice) {
    if (technicals.effectivePrice >= bollingerBands.upper) {
      contradictions.push('Price is pressing against the upper Bollinger Band (+2.0 SD), reflecting stretched near-term price distribution.');
    } else if (technicals.effectivePrice <= bollingerBands.lower) {
      contradictions.push('Price is pressing against the lower Bollinger Band (-2.0 SD), indicating near-term statistical extension to the downside.');
    }
  }

  // Fundamental Contradictions & Additions
  if (fundamentals.strengths?.length > 0) {
    fundamentals.strengths.slice(0, 2).forEach((s) => bullishEvidence.push(s));
  }
  if (fundamentals.weaknesses?.length > 0) {
    fundamentals.weaknesses.slice(0, 2).forEach((w) => bearishEvidence.push(w));
  }

  // Determine Objective Setup Classification
  let bullPoints = bullishEvidence.length;
  let bearPoints = bearishEvidence.length;

  let classification = 'NEUTRAL_OR_MIXED_SETUP';
  let label = 'Neutral or Mixed Setup';
  let color = 'amber';
  let summary = 'Technical and fundamental signals present balanced or offsetting pressures without a clear single-direction consensus.';

  if (bullPoints >= bearPoints + 2 && movingAverages.priceAboveSma50) {
    classification = 'POSITIVE_TECHNICAL_SETUP';
    label = 'Positive Technical Setup';
    color = 'emerald';
    summary = 'Price structure displays constructive moving average alignment and positive momentum, supported by favorable volume characteristics.';
  } else if (bearPoints >= bullPoints + 2 && !movingAverages.priceAboveSma50) {
    classification = 'NEGATIVE_TECHNICAL_SETUP';
    label = 'Negative Technical Setup';
    color = 'rose';
    summary = 'Price structure is pressured below major moving averages with negative momentum and unfavorable risk-reward parameters.';
  }

  return {
    status: 'VALID',
    classification,
    label,
    color,
    timeHorizon: 'Intermediate Term (1-3 Months)',
    dataFreshness: stock.dataFreshness || 'LIVE',
    evaluatedAt: new Date().toISOString(),
    summary,
    bullishEvidence,
    bearishEvidence,
    contradictions,
    keyRisks,
    assumptions: 'Calculations assume daily continuous trading with standard market hours. Past indicator behavior does not guarantee future price action.',
    technicals,
    risks,
    fundamentals,
  };
}

module.exports = {
  generateResearchAssessment,
};
