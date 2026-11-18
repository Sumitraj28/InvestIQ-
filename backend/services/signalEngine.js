/**
 * signalEngine.js
 * Algorithmic Stock Research Setup Evaluator for InvestIQ
 * 
 * Replaces arbitrary Buy/Sell guessing with objective technical setup classifications:
 * - POSITIVE_TECHNICAL_SETUP (constructive trend and momentum alignment)
 * - NEUTRAL_OR_MIXED_SETUP (conflicting or consolidating signals)
 * - NEGATIVE_TECHNICAL_SETUP (unfavorable moving average and momentum alignment)
 * - INSUFFICIENT_DATA (inadequate historical price data)
 * 
 * Maintained with full backward-compatibility for legacy frontend widgets.
 */

const { generateResearchAssessment } = require('./ai/researchEngine');

function computeSignal(stock = {}, marketHistory = []) {
  const assessment = generateResearchAssessment(stock, marketHistory);
  const technicals = assessment.technicals || {};
  const indicators = technicals.indicators || {};
  const ma = indicators.movingAverages || {};
  const rsi = indicators.rsi || {};
  const fundamentals = assessment.fundamentals || {};
  const risks = assessment.risks || {};

  // Score normalized between 0.0 and 1.0 based on evidence balance
  let score = 0.50;
  const bullCount = assessment.bullishEvidence?.length || 0;
  const bearCount = assessment.bearishEvidence?.length || 0;
  const totalEvidence = bullCount + bearCount;

  if (totalEvidence > 0) {
    score = Math.min(0.95, Math.max(0.15, Number((bullCount / totalEvidence).toFixed(2))));
  }

  // Legacy verdict fallback: POSITIVE -> BUY, NEUTRAL -> HOLD, NEGATIVE -> AVOID
  let legacyVerdict = 'HOLD';
  if (assessment.classification === 'POSITIVE_TECHNICAL_SETUP') {
    legacyVerdict = 'BUY';
  } else if (assessment.classification === 'NEGATIVE_TECHNICAL_SETUP') {
    legacyVerdict = 'AVOID';
  }

  // Collect top 3 factual reasoning bullets
  const reasoning = [];
  if (assessment.bullishEvidence?.length > 0) {
    reasoning.push(assessment.bullishEvidence[0]);
  }
  if (assessment.bearishEvidence?.length > 0) {
    reasoning.push(assessment.bearishEvidence[0]);
  }
  if (assessment.contradictions?.length > 0) {
    reasoning.push(assessment.contradictions[0]);
  } else if (assessment.keyRisks?.length > 0) {
    reasoning.push(assessment.keyRisks[0]);
  }

  return {
    // New Professional Research Fields
    classification: assessment.classification,
    label: assessment.label,
    color: assessment.color,
    summary: assessment.summary,
    bullishEvidence: assessment.bullishEvidence,
    bearishEvidence: assessment.bearishEvidence,
    contradictions: assessment.contradictions,
    keyRisks: assessment.keyRisks,
    timeHorizon: assessment.timeHorizon,
    dataFreshness: assessment.dataFreshness,

    // Legacy backwards-compatible fields
    verdict: legacyVerdict,
    score,
    metrics: {
      latestPrice: technicals.effectivePrice || stock.lastPrice || null,
      sma50: ma.sma50 || null,
      sma200: ma.sma200 || null,
      priceAboveSma50: Boolean(ma.priceAboveSma50),
      priceAboveSma200: Boolean(ma.priceAboveSma200),
      goldenCross: Boolean(ma.goldenCross),
      rsi14: rsi.value || null,
      peRatio: fundamentals.metrics?.trailingPe || null,
      sectorAveragePe: fundamentals.metrics?.sectorPeBenchmark || null,
      valuationFlag: fundamentals.valuationTag === 'ATTRACTIVE' ? 'ATTRACTIVE' : fundamentals.valuationTag === 'PREMIUM' ? 'EXPENSIVE' : 'NEUTRAL',
      volatility1Y: risks.metrics?.annualizedVolatility1Y || null,
      maxDrawdown1Y: risks.metrics?.maxDrawdown1Y || null,
    },
    reasoning,
    disclaimer: 'Objective quantitative setup assessment. Not an individualized Buy/Sell investment recommendation.',
  };
}

module.exports = {
  computeSignal,
};
