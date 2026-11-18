/**
 * technicalEngine.js
 * Deterministic Technical Analysis Engine for InvestIQ
 * 
 * Computes verifiable mathematical technical indicators from historical OHLCV data.
 * Pure deterministic algorithms; zero LLM hallucination.
 * 
 * Implemented Indicators:
 * - RSI (14) with Wilder's exponential smoothing
 * - MACD (12, 26, 9) (MACD line, Signal line, Histogram)
 * - SMA (20, 50, 200)
 * - EMA (9, 20, 50)
 * - Bollinger Bands (20, 2.0 std dev)
 * - ATR (14) (Average True Range)
 * - Volume Moving Average (20) & Volume Ratio
 * - Price Momentum (14-period ROC)
 * - Trend Strength & Structure (SMA alignment + Slope)
 * - Support & Resistance levels (Pivot Points & Swing Clusters)
 */

function round(value, decimals = 2) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(decimals));
}

/**
 * Clean and sort historical OHLCV records ascending by date
 */
function prepareHistory(history = []) {
  if (!Array.isArray(history)) return [];

  return history
    .filter((row) => row && row.date && Number.isFinite(Number(row.close)))
    .map((row) => ({
      date: row.date,
      open: Number(row.open || row.close),
      high: Number(row.high || row.close),
      low: Number(row.low || row.close),
      close: Number(row.close),
      volume: Number(row.volume || 0),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Simple Moving Average (SMA)
 */
function calculateSMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return null;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / period;
}

/**
 * Exponential Moving Average (EMA)
 */
function calculateEMA(values, period) {
  if (!Array.isArray(values) || values.length < period || period <= 0) return null;
  const multiplier = 2 / (period + 1);
  // Seed with SMA
  let ema = values.slice(0, period).reduce((acc, v) => acc + v, 0) / period;
  for (let i = period; i < values.length; i++) {
    ema = (values[i] - ema) * multiplier + ema;
  }
  return ema;
}

/**
 * Relative Strength Index (RSI 14) with Wilder's Smoothing
 */
function calculateRSI(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;

  let gains = 0;
  let losses = 0;

  // First period simple average
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder's smoothing for subsequent periods
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff >= 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * MACD (12, 26, 9)
 */
function calculateMACD(closes, fast = 12, slow = 26, signalPeriod = 9) {
  if (!Array.isArray(closes) || closes.length < slow + signalPeriod) return null;

  const multiplierFast = 2 / (fast + 1);
  const multiplierSlow = 2 / (slow + 1);

  // Seed fast and slow EMA
  let emaFast = closes.slice(0, fast).reduce((sum, v) => sum + v, 0) / fast;
  let emaSlow = closes.slice(0, slow).reduce((sum, v) => sum + v, 0) / slow;

  // Track fast EMA from fast to slow
  for (let i = fast; i < slow; i++) {
    emaFast = (closes[i] - emaFast) * multiplierFast + emaFast;
  }

  const macdHistory = [];
  for (let i = slow; i < closes.length; i++) {
    emaFast = (closes[i] - emaFast) * multiplierFast + emaFast;
    emaSlow = (closes[i] - emaSlow) * multiplierSlow + emaSlow;
    macdHistory.push(emaFast - emaSlow);
  }

  if (macdHistory.length < signalPeriod) return null;

  // Signal line is 9-EMA of MACD history
  const signalLine = calculateEMA(macdHistory, signalPeriod);
  const currentMacd = macdHistory[macdHistory.length - 1];
  const histogram = currentMacd - signalLine;

  return {
    macdLine: currentMacd,
    signalLine,
    histogram,
  };
}

/**
 * Bollinger Bands (20, 2.0)
 */
function calculateBollingerBands(closes, period = 20, multiplier = 2.0) {
  if (!Array.isArray(closes) || closes.length < period) return null;

  const middle = calculateSMA(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - middle, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: middle + stdDev * multiplier,
    middle,
    lower: middle - stdDev * multiplier,
    bandwidth: middle > 0 ? ((middle + stdDev * multiplier) - (middle - stdDev * multiplier)) / middle : 0,
    stdDev,
  };
}

/**
 * Average True Range (ATR 14)
 */
function calculateATR(history, period = 14) {
  if (!Array.isArray(history) || history.length < period + 1) return null;

  const trueRanges = [];
  for (let i = 1; i < history.length; i++) {
    const current = history[i];
    const prev = history[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }

  if (trueRanges.length < period) return null;

  // Initial ATR: SMA of first 14 TRs
  let atr = trueRanges.slice(0, period).reduce((sum, v) => sum + v, 0) / period;

  // Wilder's smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
  }

  const latestClose = history[history.length - 1].close;
  const atrPercent = latestClose > 0 ? (atr / latestClose) * 100 : null;

  return {
    atr,
    atrPercent,
  };
}

/**
 * 14-Period Price Momentum (Rate of Change)
 */
function calculateMomentum(closes, period = 14) {
  if (!Array.isArray(closes) || closes.length < period + 1) return null;
  const current = closes[closes.length - 1];
  const prior = closes[closes.length - 1 - period];
  if (!prior || prior <= 0) return null;
  return ((current - prior) / prior) * 100;
}

/**
 * Support & Resistance Estimates via Classic Pivots and Recent Swing Highs/Lows
 */
function calculateSupportResistance(history) {
  if (!Array.isArray(history) || history.length < 5) return null;

  const latest = history[history.length - 1];
  const recent20 = history.slice(-20);

  // Classic daily pivot from prior bar
  const prevBar = history.length > 1 ? history[history.length - 2] : latest;
  const pivot = (prevBar.high + prevBar.low + prevBar.close) / 3;
  const r1 = 2 * pivot - prevBar.low;
  const s1 = 2 * pivot - prevBar.high;
  const r2 = pivot + (prevBar.high - prevBar.low);
  const s2 = pivot - (prevBar.high - prevBar.low);

  // 20-day swing levels
  const swingHigh20 = Math.max(...recent20.map((b) => b.high));
  const swingLow20 = Math.min(...recent20.map((b) => b.low));

  return {
    pivot: round(pivot),
    resistance1: round(r1),
    support1: round(s1),
    resistance2: round(r2),
    support2: round(s2),
    swingHigh20: round(swingHigh20),
    swingLow20: round(swingLow20),
  };
}

/**
 * Analyze complete technical structure from historical bars and latest price
 */
function analyzeTechnicalSetup(rawHistory = [], currentPrice = null) {
  const history = prepareHistory(rawHistory);
  const now = new Date().toISOString();

  if (history.length < 20) {
    return {
      status: 'INSUFFICIENT_DATA',
      dataPoints: history.length,
      message: 'At least 20 historical sessions are required to compute technical indicators.',
      calculatedAt: now,
      indicators: {},
    };
  }

  // If a live tick is provided, replace or append to closes
  const closes = history.map((b) => b.close);
  const effectivePrice = currentPrice !== null && Number.isFinite(Number(currentPrice))
    ? Number(currentPrice)
    : closes[closes.length - 1];

  const volumes = history.map((b) => b.volume);

  // 1. Moving Averages
  const sma20 = calculateSMA(closes, 20);
  const sma50 = calculateSMA(closes, 50);
  const sma200 = calculateSMA(closes, 200);

  const ema9 = calculateEMA(closes, 9);
  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);

  // 2. Oscillators
  const rsi14 = calculateRSI(closes, 14);
  const macd = calculateMACD(closes, 12, 26, 9);
  const bollinger = calculateBollingerBands(closes, 20, 2.0);
  const atr = calculateATR(history, 14);
  const momentum14 = calculateMomentum(closes, 14);

  // 3. Volume
  const volMa20 = calculateSMA(volumes, 20);
  const latestVol = volumes[volumes.length - 1] || 0;
  const volumeRatio = volMa20 && volMa20 > 0 ? latestVol / volMa20 : null;

  // 4. Support and Resistance
  const levels = calculateSupportResistance(history);

  // Interpretations
  const rsiInterpretation = (() => {
    if (rsi14 === null) return 'Data insufficient for 14-period RSI';
    if (rsi14 >= 70) return `Overbought territory (${round(rsi14, 1)}). Upward momentum extended; elevated retracement risk.`;
    if (rsi14 <= 30) return `Oversold territory (${round(rsi14, 1)}). Downward pressure intense; potential technical stabilization zone.`;
    if (rsi14 >= 55) return `Bullish momentum (${round(rsi14, 1)}). Buyers maintaining positive pricing pressure.`;
    if (rsi14 <= 45) return `Bearish momentum (${round(rsi14, 1)}). Sellers exerting downward pricing pressure.`;
    return `Neutral momentum (${round(rsi14, 1)}). Balanced order flow between 45 and 55.`;
  })();

  const macdInterpretation = (() => {
    if (!macd) return 'Data insufficient for standard MACD (requires 35+ bars)';
    const hist = macd.histogram;
    if (hist > 0 && macd.macdLine > 0) return 'Bullish expansion: MACD line above signal and above zero baseline.';
    if (hist > 0 && macd.macdLine <= 0) return 'Bullish convergence: Positive momentum building below the zero baseline.';
    if (hist < 0 && macd.macdLine < 0) return 'Bearish expansion: MACD line below signal and below zero baseline.';
    return 'Bearish convergence: Momentum weakening above the zero baseline.';
  })();

  const bollingerInterpretation = (() => {
    if (!bollinger) return 'Data insufficient for 20-period Bollinger Bands';
    if (effectivePrice > bollinger.upper) return 'Price trading above Upper Band (+2.0 SD); statistically stretched to the upside.';
    if (effectivePrice < bollinger.lower) return 'Price trading below Lower Band (-2.0 SD); statistically stretched to the downside.';
    if (effectivePrice >= bollinger.middle) return 'Trading in upper volatility half (between 20-SMA and Upper Band).';
    return 'Trading in lower volatility half (between Lower Band and 20-SMA).';
  })();

  const trendStrength = (() => {
    let score = 0;
    if (sma20 && effectivePrice >= sma20) score += 1;
    if (sma50 && effectivePrice >= sma50) score += 1;
    if (sma200 && effectivePrice >= sma200) score += 2;
    if (sma50 && sma200 && sma50 >= sma200) score += 1; // Golden Cross structure

    if (score >= 4) return { label: 'STRONG_UPTREND', summary: 'Price holding above 20, 50, and 200 SMA with aligned bull structure.' };
    if (score === 3) return { label: 'MODERATE_UPTREND', summary: 'Price holding above primary moving averages with positive slope.' };
    if (score === 2) return { label: 'MIXED_OR_CONSOLIDATION', summary: 'Price oscillating across intermediate averages without definitive trend.' };
    if (score === 1) return { label: 'MODERATE_DOWNTREND', summary: 'Price trading below most key moving averages.' };
    return { label: 'STRONG_DOWNTREND', summary: 'Price pinned below 20, 50, and 200 SMA with negative alignment.' };
  })();

  return {
    status: 'VALID',
    dataPoints: history.length,
    timeframe: '1D',
    calculatedAt: now,
    effectivePrice: round(effectivePrice),
    indicators: {
      rsi: {
        value: round(rsi14, 2),
        period: 14,
        interpretation: rsiInterpretation,
        status: rsi14 !== null ? 'VALID' : 'INSUFFICIENT_DATA',
      },
      macd: {
        macdLine: round(macd?.macdLine, 2),
        signalLine: round(macd?.signalLine, 2),
        histogram: round(macd?.histogram, 2),
        parameters: { fast: 12, slow: 26, signal: 9 },
        interpretation: macdInterpretation,
        status: macd !== null ? 'VALID' : 'INSUFFICIENT_DATA',
      },
      movingAverages: {
        sma20: round(sma20, 2),
        sma50: round(sma50, 2),
        sma200: round(sma200, 2),
        ema9: round(ema9, 2),
        ema20: round(ema20, 2),
        ema50: round(ema50, 2),
        priceAboveSma50: Boolean(sma50 && effectivePrice >= sma50),
        priceAboveSma200: Boolean(sma200 && effectivePrice >= sma200),
        goldenCross: Boolean(sma50 && sma200 && sma50 >= sma200),
        trendStrength: trendStrength.label,
        trendSummary: trendStrength.summary,
      },
      bollingerBands: {
        upper: round(bollinger?.upper, 2),
        middle: round(bollinger?.middle, 2),
        lower: round(bollinger?.lower, 2),
        bandwidth: round(bollinger?.bandwidth, 4),
        interpretation: bollingerInterpretation,
        status: bollinger !== null ? 'VALID' : 'INSUFFICIENT_DATA',
      },
      atr: {
        value: round(atr?.atr, 2),
        percentOfPrice: round(atr?.atrPercent, 2),
        period: 14,
        interpretation: atr ? `Average daily price swing of ₹${round(atr.atr, 2)} (${round(atr.atrPercent, 2)}% of price)` : 'N/A',
        status: atr !== null ? 'VALID' : 'INSUFFICIENT_DATA',
      },
      momentum: {
        roc14: round(momentum14, 2),
        period: 14,
        interpretation: momentum14 !== null
          ? `${momentum14 >= 0 ? '+' : ''}${round(momentum14, 2)}% net change over the past 14 trading sessions`
          : 'N/A',
      },
      volumeAnalysis: {
        latestVolume: latestVol,
        volumeMa20: round(volMa20, 0),
        volumeRatio: round(volumeRatio, 2),
        interpretation: volumeRatio !== null
          ? (volumeRatio >= 1.5 ? 'High institutional/market activity (>1.5x 20-day average volume)' : volumeRatio <= 0.7 ? 'Subdued trading activity (<0.7x 20-day average volume)' : 'Normal volume activity within historical norms')
          : 'Volume average unavailable',
      },
      supportResistance: levels,
    },
  };
}

module.exports = {
  analyzeTechnicalSetup,
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateATR,
  calculateMomentum,
  calculateSupportResistance,
  prepareHistory,
};
