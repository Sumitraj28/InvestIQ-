/**
 * aiSummaryService.js
 * Backwards-compatible facade over the InvestIQ Advanced AI Research Explainer Engine
 */

const { generateStockResearchBrief } = require('./ai/aiResearchExplainer');

async function generateAiCompanyBrief(stock, marketHistory = []) {
  try {
    const research = await generateStockResearchBrief(stock, marketHistory);

    // Provide backwards-compatible properties expected by existing UI while attaching rich research fields
    return {
      generatedBy: research.generatedBy,
      isAiGenerated: Boolean(research.isAiGenerated),
      aiProviderNotice: research.aiProviderNotice || null,
      evaluatedAt: research.evaluatedAt,
      ticker: research.ticker,
      companyName: research.companyName,
      exchange: research.exchange,

      // Core narrative fields
      overview: research.companyOverview,
      stockDetails: [
        research.priceBehaviour,
        research.technicalTrend,
        research.valuationConsiderations,
      ].filter(Boolean),
      strengths: research.fundamentalStrengths || [],
      watchouts: [
        research.importantRisks,
        ...(research.contradictorySignals || []),
      ].filter(Boolean),
      verdict: research.researchVerdict,

      // Rich Sectional Research Data
      companyOverview: research.companyOverview,
      priceBehaviour: research.priceBehaviour,
      technicalTrend: research.technicalTrend,
      fundamentalStrengths: research.fundamentalStrengths,
      fundamentalWeaknesses: research.fundamentalWeaknesses,
      valuationConsiderations: research.valuationConsiderations,
      importantRisks: research.importantRisks,
      bullishEvidence: research.bullishEvidence,
      bearishEvidence: research.bearishEvidence,
      contradictorySignals: research.contradictorySignals,
      researchVerdict: research.researchVerdict,

      // Full quantitative assessment attachment
      assessment: research.assessment,
      classification: research.classification,
      label: research.label,
      color: research.color,
    };
  } catch (err) {
    console.error(`[aiSummaryService] Unexpected error:`, err);
    throw err;
  }
}

module.exports = {
  generateAiCompanyBrief,
};
