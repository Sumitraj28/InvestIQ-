/**
 * InvestIQ Technical Indicators Engine
 * Mathematically validated calculations for:
 * - Simple Moving Average (SMA)
 * - Exponential Moving Average (EMA)
 * - Relative Strength Index (RSI - 14)
 * - Moving Average Convergence Divergence (MACD - 12, 26, 9)
 * - Bollinger Bands (20, 2)
 * - Volume Moving Average (20)
 */

/**
 * Simple Moving Average (SMA)
 * @param {Array<number|object>} data - Price array or candle array
 * @param {number} period - Number of bars
 * @param {string} field - Field to use if data items are objects ('close')
 * @returns {Array<number|null>} Array of SMA values matching input length
 */
function calculateSMA(data = [], period = 20, field = 'close') {
  if (!Array.isArray(data) || data.length === 0 || period <= 0) return [];
  const prices = data.map((d) => (typeof d === 'number' ? d : Number(d[field] ?? d.close ?? 0)));
  const result = new Array(prices.length).fill(null);

  if (prices.length < period) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += prices[i];
  }
  result[period - 1] = Number((sum / period).toFixed(2));

  for (let i = period; i < prices.length; i++) {
    sum += prices[i] - prices[i - period];
    result[i] = Number((sum / period).toFixed(2));
  }

  return result;
}

/**
 * Exponential Moving Average (EMA)
 * Multiplier = 2 / (period + 1)
 */
function calculateEMA(data = [], period = 20, field = 'close') {
  if (!Array.isArray(data) || data.length === 0 || period <= 0) return [];
  const prices = data.map((d) => (typeof d === 'number' ? d : Number(d[field] ?? d.close ?? 0)));
  const result = new Array(prices.length).fill(null);

  if (prices.length < period) return result;

  const k = 2 / (period + 1);

  // Initial EMA is simple average of first period
  let initialSum = 0;
  for (let i = 0; i < period; i++) {
    initialSum += prices[i];
  }
  let prevEma = initialSum / period;
  result[period - 1] = Number(prevEma.toFixed(2));

  for (let i = period; i < prices.length; i++) {
    const currentEma = prices[i] * k + prevEma * (1 - k);
    result[i] = Number(currentEma.toFixed(2));
    prevEma = currentEma;
  }

  return result;
}

/**
 * Relative Strength Index (RSI - 14)
 * Uses Wilder's smoothed moving average
 */
function calculateRSI(data = [], period = 14, field = 'close') {
  if (!Array.isArray(data) || data.length < period + 1) {
    return new Array(data ? data.length : 0).fill(null);
  }
  const prices = data.map((d) => (typeof d === 'number' ? d : Number(d[field] ?? d.close ?? 0)));
  const result = new Array(prices.length).fill(null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = Number((100 - 100 / (1 + rs)).toFixed(2));

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      result[i] = 100;
    } else {
      const currentRs = avgGain / avgLoss;
      result[i] = Number((100 - 100 / (1 + currentRs)).toFixed(2));
    }
  }

  return result;
}

/**
 * Moving Average Convergence Divergence (MACD - 12, 26, 9)
 */
function calculateMACD(data = [], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9, field = 'close') {
  const length = Array.isArray(data) ? data.length : 0;
  const empty = {
    macdLine: new Array(length).fill(null),
    signalLine: new Array(length).fill(null),
    histogram: new Array(length).fill(null),
  };
  if (length < slowPeriod) return empty;

  const fastEMA = calculateEMA(data, fastPeriod, field);
  const slowEMA = calculateEMA(data, slowPeriod, field);

  const macdLine = new Array(length).fill(null);
  for (let i = slowPeriod - 1; i < length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macdLine[i] = Number((fastEMA[i] - slowEMA[i]).toFixed(2));
    }
  }

  // Calculate Signal line (EMA of MACD line)
  const validMacdValues = [];
  const validIndices = [];
  for (let i = 0; i < length; i++) {
    if (macdLine[i] !== null) {
      validMacdValues.push(macdLine[i]);
      validIndices.push(i);
    }
  }

  const signalLine = new Array(length).fill(null);
  const histogram = new Array(length).fill(null);

  if (validMacdValues.length >= signalPeriod) {
    const rawSignal = calculateEMA(validMacdValues, signalPeriod);
    for (let j = 0; j < validMacdValues.length; j++) {
      const originalIdx = validIndices[j];
      const sigVal = rawSignal[j];
      signalLine[originalIdx] = sigVal;
      if (sigVal !== null && macdLine[originalIdx] !== null) {
        histogram[originalIdx] = Number((macdLine[originalIdx] - sigVal).toFixed(2));
      }
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands (period = 20, multiplier = 2)
 */
function calculateBollingerBands(data = [], period = 20, multiplier = 2, field = 'close') {
  const length = Array.isArray(data) ? data.length : 0;
  const empty = {
    upper: new Array(length).fill(null),
    middle: new Array(length).fill(null),
    lower: new Array(length).fill(null),
  };
  if (length < period) return empty;

  const prices = data.map((d) => (typeof d === 'number' ? d : Number(d[field] ?? d.close ?? 0)));
  const sma = calculateSMA(prices, period);

  const upper = new Array(length).fill(null);
  const lower = new Array(length).fill(null);

  for (let i = period - 1; i < length; i++) {
    const middleVal = sma[i];
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(prices[j] - middleVal, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper[i] = Number((middleVal + multiplier * stdDev).toFixed(2));
    lower[i] = Number((middleVal - multiplier * stdDev).toFixed(2));
  }

  return { upper, middle: sma, lower };
}

/**
 * Volume Moving Average (period = 20)
 */
function calculateVolumeMA(data = [], period = 20) {
  return calculateSMA(data, period, 'volume');
}

module.exports = {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
};
