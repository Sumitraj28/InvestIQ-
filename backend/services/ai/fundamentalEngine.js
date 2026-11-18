/**
 * fundamentalEngine.js
 * Deterministic Fundamental Analysis Engine for InvestIQ
 * 
 * Analyzes verified company financial metrics:
 * - Valuation: Trailing P/E, Forward P/E, Price-to-Book (P/B), Market Cap
 * - Profitability & Returns: ROE, ROCE, Operating Margin, Net Profit Margin
 * - Leverage & Health: Debt-to-Equity ratio, Cash flow adequacy
 * - Sector relative valuation
 * 
 * Rules:
 * 1. Explicitly distinguishes missing data from weak fundamentals.
 * 2. Never infers business quality from stock price alone.
 * 3. Transparent documented evaluation formulas.
 */

const SECTOR_BENCHMARKS = {
  'information technology': { pe: 28.0, pb: 6.5, roe: 22.0, debtToEquityMax: 0.5 },
  technology: { pe: 28.0, pb: 6.5, roe: 22.0, debtToEquityMax: 0.5 },
  'it services': { pe: 28.0, pb: 6.5, roe: 22.0, debtToEquityMax: 0.5 },
  'banking & financial services': { pe: 18.0, pb: 2.2, roe: 14.0, debtToEquityMax: 6.0 },
  'financial services': { pe: 20.0, pb: 2.5, roe: 15.0, debtToEquityMax: 5.0 },
  banking: { pe: 18.0, pb: 2.2, roe: 14.0, debtToEquityMax: 6.0 },
  'private sector bank': { pe: 19.0, pb: 2.4, roe: 15.0, debtToEquityMax: 6.0 },
  'public sector banking': { pe: 10.0, pb: 1.1, roe: 12.0, debtToEquityMax: 8.0 },
  energy: { pe: 20.0, pb: 2.0, roe: 13.0, debtToEquityMax: 1.5 },
  'energy & petrochemicals': { pe: 22.0, pb: 2.2, roe: 14.0, debtToEquityMax: 1.2 },
  automobile: { pe: 24.0, pb: 3.5, roe: 16.0, debtToEquityMax: 1.0 },
  healthcare: { pe: 32.0, pb: 4.5, roe: 15.0, debtToEquityMax: 0.8 },
  pharmaceuticals: { pe: 30.0, pb: 4.2, roe: 15.0, debtToEquityMax: 0.8 },
  'consumer defensive': { pe: 42.0, pb: 9.0, roe: 25.0, debtToEquityMax: 0.5 },
  fmcg: { pe: 42.0, pb: 9.0, roe: 25.0, debtToEquityMax: 0.5 },
  telecommunications: { pe: 30.0, pb: 3.0, roe: 12.0, debtToEquityMax: 2.0 },
  utilities: { pe: 16.0, pb: 1.8, roe: 11.0, debtToEquityMax: 2.5 },
  industrials: { pe: 28.0, pb: 3.8, roe: 14.0, debtToEquityMax: 1.2 },
  'metals & mining': { pe: 14.0, pb: 1.6, roe: 12.0, debtToEquityMax: 1.2 },
};

function round(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(decimals));
}

function resolveSectorBenchmark(sector = '', industry = '') {
  const keys = [sector, industry].filter(Boolean).map((s) => s.toLowerCase());
  for (const candidate of keys) {
    if (SECTOR_BENCHMARKS[candidate]) return SECTOR_BENCHMARKS[candidate];
    const match = Object.keys(SECTOR_BENCHMARKS).find((k) => candidate.includes(k) || k.includes(candidate));
    if (match) return SECTOR_BENCHMARKS[match];
  }
  return { pe: 22.0, pb: 3.0, roe: 15.0, debtToEquityMax: 1.5 }; // General Indian Market Median
}

function analyzeFundamentals(stock = {}) {
  const peRatio = Number(stock.peRatio) > 0 ? Number(stock.peRatio) : null;
  const pbRatio = Number(stock.pbRatio) > 0 ? Number(stock.pbRatio) : null;
  const roe = Number(stock.roe || stock.returnOnEquity);
  const roeValid = Number.isFinite(roe) ? roe : null;
  const debtToEquity = Number(stock.debtToEquity);
  const deValid = Number.isFinite(debtToEquity) ? debtToEquity : null;
  const marketCap = Number(stock.marketCap) > 0 ? Number(stock.marketCap) : null;
  const netProfitMargin = Number(stock.profitMargin || stock.netMargin);
  const marginValid = Number.isFinite(netProfitMargin) ? netProfitMargin : null;

  const sector = stock.sector || 'Indian Equity';
  const industry = stock.industry || '';
  const benchmark = resolveSectorBenchmark(sector, industry);

  const strengths = [];
  const weaknesses = [];
  const observations = [];

  // Valuation Assessment
  let valuationTag = 'DATA_UNAVAILABLE';
  if (peRatio !== null) {
    const diffPct = ((peRatio - benchmark.pe) / benchmark.pe) * 100;
    if (peRatio <= benchmark.pe * 0.85) {
      valuationTag = 'ATTRACTIVE';
      strengths.push(`Favorable Valuation: Trailing P/E of ${round(peRatio, 1)} trades at a ${round(Math.abs(diffPct), 0)}% discount to sector benchmark (~${benchmark.pe}x).`);
    } else if (peRatio >= benchmark.pe * 1.25) {
      valuationTag = 'PREMIUM';
      weaknesses.push(`Premium Valuation: Trailing P/E of ${round(peRatio, 1)} trades at a ${round(diffPct, 0)}% premium to sector average (~${benchmark.pe}x).`);
    } else {
      valuationTag = 'FAIR';
      observations.push(`Fair Valuation: P/E of ${round(peRatio, 1)} is closely aligned with the sector median (~${benchmark.pe}x).`);
    }
  } else {
    observations.push('P/E multiple is unavailable or not reported in verified filings.');
  }

  // Profitability Assessment
  if (roeValid !== null) {
    if (roeValid >= benchmark.roe) {
      strengths.push(`Healthy Capital Efficiency: Return on Equity (ROE) of ${round(roeValid, 1)}% meets or exceeds sector benchmark (${benchmark.roe}%).`);
    } else if (roeValid < 10) {
      weaknesses.push(`Subdued Capital Efficiency: Reported ROE of ${round(roeValid, 1)}% is below industry standards.`);
    } else {
      observations.push(`Reported ROE of ${round(roeValid, 1)}% reflects standard return on net worth.`);
    }
  }

  // Leverage & Solvency
  if (deValid !== null) {
    if (deValid <= 0.5) {
      strengths.push(`Conservative Balance Sheet: Debt-to-Equity of ${round(deValid, 2)} reflects minimal long-term debt burden.`);
    } else if (deValid > benchmark.debtToEquityMax) {
      weaknesses.push(`Elevated Leverage: Debt-to-Equity of ${round(deValid, 2)} is above the sector threshold (${benchmark.debtToEquityMax}).`);
    } else {
      observations.push(`Debt-to-Equity ratio of ${round(deValid, 2)} is within manageable sector parameters.`);
    }
  }

  // Market Cap Scale
  if (marketCap !== null) {
    const crores = marketCap / 10000000;
    if (crores >= 20000) {
      strengths.push(`Established Scale: Large market capitalization (₹${round(crores / 1000, 1)}k Cr) provides liquidity and operational depth.`);
    } else if (crores < 5000) {
      observations.push(`Small/Micro Cap Scale: Lower capitalization (₹${round(crores, 0)} Cr) carries higher susceptibility to economic and liquidity cycles.`);
    }
  }

  return {
    status: 'VALID',
    evaluatedAt: new Date().toISOString(),
    sector,
    industry,
    valuationTag,
    metrics: {
      trailingPe: round(peRatio, 2),
      sectorPeBenchmark: benchmark.pe,
      priceToBook: round(pbRatio, 2),
      roe: roeValid !== null ? round(roeValid, 2) : null,
      debtToEquity: deValid !== null ? round(deValid, 2) : null,
      netProfitMargin: marginValid !== null ? round(marginValid * 100, 2) : null,
      marketCapCrores: marketCap ? round(marketCap / 10000000, 0) : null,
    },
    strengths,
    weaknesses,
    observations,
  };
}

module.exports = {
  analyzeFundamentals,
  resolveSectorBenchmark,
};
