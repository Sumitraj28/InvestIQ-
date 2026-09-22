const SECTOR_PE_AVERAGES = {
  'information technology': 28,
  technology: 28,
  'it services': 28,
  'banking & financial services': 18,
  'financial services': 20,
  banking: 18,
  'private sector bank': 18,
  'public sector banking': 12,
  energy: 24,
  'energy & petrochemicals': 24,
  automobile: 26,
  healthcare: 30,
  pharmaceuticals: 30,
  'consumer defensive': 42,
  fmcg: 42,
  telecommunications: 32,
  utilities: 18,
  industrials: 30,
  'metals & mining': 16,
};

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getSortedCloses(history = []) {
  return [...history]
    .filter((row) => row?.date && toNumber(row.close) !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((row) => ({
      date: row.date,
      close: Number(row.close),
    }));
}

function simpleMovingAverage(values, days) {
  if (!Array.isArray(values) || values.length < days) return null;
  const slice = values.slice(-days);
  const total = slice.reduce((sum, value) => sum + value, 0);
  return total / days;
}

function calculateRsi(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;

  const recent = closes.slice(-(period + 1));
  let gains = 0;
  let losses = 0;

  for (let index = 1; index < recent.length; index += 1) {
    const change = recent[index] - recent[index - 1];
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  const averageGain = gains / period;
  const averageLoss = losses / period;

  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return 100 - (100 / (1 + relativeStrength));
}

function calculateCagr(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return null;

  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first.close || !last.close || first.close <= 0) return null;

  const firstDate = new Date(first.date);
  const lastDate = new Date(last.date);
  const years = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (!Number.isFinite(years) || years <= 0) return null;

  return (Math.pow(last.close / first.close, 1 / years) - 1) * 100;
}

function findSectorAveragePe(sector = '', industry = '') {
  const candidates = [sector, industry]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  for (const candidate of candidates) {
    const exact = SECTOR_PE_AVERAGES[candidate];
    if (exact) return exact;

    const partialKey = Object.keys(SECTOR_PE_AVERAGES).find((key) => (
      candidate.includes(key) || key.includes(candidate)
    ));
    if (partialKey) return SECTOR_PE_AVERAGES[partialKey];
  }

  return null;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getVerdict(score) {
  if (score > 0.6) return 'BUY';
  if (score >= 0.4) return 'HOLD';
  return 'AVOID';
}

function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(digits);
}

function buildReasoning({ latestPrice, sma50, sma200, rsi, cagr, peRatio, sectorAveragePe }) {
  const bullets = [];

  if (latestPrice && sma200) {
    bullets.push(
      latestPrice >= sma200
        ? `Price is above its 200-day average (${formatNumber(sma200)}), showing a positive long-term trend.`
        : `Price is below its 200-day average (${formatNumber(sma200)}), showing weaker long-term momentum.`
    );
  } else {
    bullets.push('Not enough price history to calculate the 200-day trend.');
  }

  if (rsi !== null) {
    if (rsi >= 70) bullets.push(`RSI at ${formatNumber(rsi, 1)} suggests the stock may be overbought.`);
    else if (rsi <= 30) bullets.push(`RSI at ${formatNumber(rsi, 1)} suggests the stock may be oversold.`);
    else bullets.push(`RSI at ${formatNumber(rsi, 1)} is in a neutral range.`);
  }

  if (sectorAveragePe && peRatio > 0) {
    bullets.push(
      peRatio <= sectorAveragePe
        ? `P/E of ${formatNumber(peRatio, 1)} is at or below the sector average of ${formatNumber(sectorAveragePe, 1)}.`
        : `P/E of ${formatNumber(peRatio, 1)} is above the sector average of ${formatNumber(sectorAveragePe, 1)}.`
    );
  } else if (cagr !== null) {
    bullets.push(`5-year CAGR is ${formatNumber(cagr, 1)}%, based on available historical closes.`);
  } else {
    bullets.push('Valuation signal is neutral because sector P/E context is unavailable.');
  }

  return bullets.slice(0, 3);
}

function computeSignal(stock = {}) {
  const rows = getSortedCloses(stock.history5y);
  const closes = rows.map((row) => row.close);
  const latestClose = closes[closes.length - 1] || null;
  const latestPrice = toNumber(stock.lastPrice) || latestClose;
  const sma50 = simpleMovingAverage(closes, 50);
  const sma200 = simpleMovingAverage(closes, 200);
  const rsi = calculateRsi(closes, 14);
  const cagr = calculateCagr(rows);
  const peRatio = toNumber(stock.peRatio) || 0;
  const sectorAveragePe = findSectorAveragePe(stock.sector, stock.industry);

  const trendScore = (() => {
    if (!latestPrice || !sma50 || !sma200) return 0.5;
    let score = 0;
    if (latestPrice >= sma50) score += 0.35;
    if (latestPrice >= sma200) score += 0.45;
    if (sma50 >= sma200) score += 0.2;
    return score;
  })();

  const rsiScore = (() => {
    if (rsi === null) return 0.5;
    if (rsi >= 70) return 0.25;
    if (rsi <= 30) return 0.65;
    if (rsi >= 45 && rsi <= 60) return 0.75;
    return 0.55;
  })();

  const cagrScore = (() => {
    if (cagr === null) return 0.5;
    return clamp((cagr + 5) / 25);
  })();

  const valuationScore = (() => {
    if (!sectorAveragePe || !peRatio) return 0.5;
    const discount = (sectorAveragePe - peRatio) / sectorAveragePe;
    return clamp(0.5 + discount);
  })();

  const score = clamp(
    (trendScore * 0.4)
    + (rsiScore * 0.2)
    + (cagrScore * 0.2)
    + (valuationScore * 0.2)
  );

  return {
    verdict: getVerdict(score),
    score: Number(score.toFixed(3)),
    metrics: {
      latestPrice,
      sma50: sma50 ? Number(sma50.toFixed(2)) : null,
      sma200: sma200 ? Number(sma200.toFixed(2)) : null,
      priceAboveSma50: Boolean(latestPrice && sma50 && latestPrice >= sma50),
      priceAboveSma200: Boolean(latestPrice && sma200 && latestPrice >= sma200),
      goldenCross: Boolean(sma50 && sma200 && sma50 >= sma200),
      rsi14: rsi !== null ? Number(rsi.toFixed(2)) : null,
      cagr5y: cagr !== null ? Number(cagr.toFixed(2)) : null,
      peRatio,
      sectorAveragePe,
      valuationFlag: !sectorAveragePe || !peRatio
        ? 'NEUTRAL'
        : peRatio <= sectorAveragePe
          ? 'ATTRACTIVE'
          : 'EXPENSIVE',
    },
    reasoning: buildReasoning({
      latestPrice,
      sma50,
      sma200,
      rsi,
      cagr,
      peRatio,
      sectorAveragePe,
    }),
    disclaimer: 'Algorithmic estimate, not financial advice.',
  };
}

module.exports = {
  computeSignal,
};
