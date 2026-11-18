function getDataServiceUrl() {
  return process.env.PYTHON_DATA_SERVICE_URL || 'http://127.0.0.1:8000';
}

class PythonDataServiceError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = 'PythonDataServiceError';
    this.status = status;
    this.details = details;
  }
}

function normalizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  let clean = symbol.trim().toUpperCase();
  if (clean.startsWith('^')) {
    return clean;
  }
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    clean = clean.slice(0, -3);
  }
  return clean;
}

function toYFinanceTicker(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('^')) {
    return clean;
  }
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    return clean;
  }
  return `${normalizeSymbol(clean)}.NS`;
}

async function fetchJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 45000);

  try {
    const response = await fetch(`${getDataServiceUrl()}${path}`, {
      signal: controller.signal,
      method: options.method || 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message = payload?.detail || `Data service request failed with status ${response.status}`;
      throw new PythonDataServiceError(message, response.status, payload);
    }

    return payload;
  } catch (err) {
    if (err instanceof PythonDataServiceError) {
      throw err;
    }

    const message = err.name === 'AbortError'
      ? 'Data service request timed out.'
      : `Unable to reach Python data service: ${err.message}`;
    throw new PythonDataServiceError(message, 502, null);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Fast lightweight quote fetcher (LTP, change, OHLC, volume)
 */
async function fetchQuoteFromPythonService(symbol) {
  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);
  const price = await fetchJson(`/price/${encodedTicker}`, { timeoutMs: 15000 });

  return {
    symbol: normalizeSymbol(yfTicker),
    ticker: yfTicker,
    lastPrice: Number(price.currentPrice),
    previousClose: Number(price.previousClose),
    dayChange: Number(price.dayChange),
    dayChangePercent: Number(price.dayChangePercent),
    open: Number(price.open),
    dayHigh: Number(price.dayHigh),
    dayLow: Number(price.dayLow),
    volume: Number(price.volume || 0),
    quoteTimestamp: price.quoteTimestamp || new Date().toISOString(),
    dataFreshness: price.dataFreshness || 'DELAYED',
    dataSource: price.dataSource || 'yfinance',
  };
}

/**
 * Full profile fetcher (profile + summary + 5y history)
 */
async function fetchStockFromPythonService(symbol) {
  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);

  const [price, summary, history] = await Promise.all([
    fetchJson(`/price/${encodedTicker}`),
    fetchJson(`/summary/${encodedTicker}`),
    fetchJson(`/history/${encodedTicker}`),
  ]);

  return {
    ticker: normalizeSymbol(yfTicker),
    name: summary.name,
    sector: summary.sector,
    industry: summary.industry || '',
    website: summary.website || '',
    businessSummary: summary.businessSummary || '',
    marketCap: summary.marketCap,
    peRatio: summary.peRatio,
    week52High: summary.week52High,
    week52Low: summary.week52Low,
    lastPrice: price.currentPrice,
    previousClose: price.previousClose,
    dayChange: price.dayChange,
    dayChangePercent: price.dayChangePercent,
    open: price.open,
    dayHigh: price.dayHigh,
    dayLow: price.dayLow,
    volume: price.volume,
    quoteTimestamp: price.quoteTimestamp,
    history5y: history,
    lastFetchedAt: new Date(),
  };
}

async function fetchPredictionFromPythonService(symbol) {
  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);
  const prediction = await fetchJson(`/predict/${encodedTicker}`, {
    method: 'POST',
    timeoutMs: 60000,
  });

  return {
    ticker: normalizeSymbol(yfTicker),
    predictions: prediction.predictions || [],
    r2Score: prediction.r2Score,
    validated: Boolean(prediction.validated),
    status: prediction.status,
    message: prediction.message,
    metrics: prediction.metrics || null,
    lastFetchedAt: new Date(),
  };
}

async function fetchForecastFromPythonService(symbol) {
  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);
  const forecast = await fetchJson(`/forecast/${encodedTicker}`, {
    method: 'GET',
    timeoutMs: 60000,
  });

  return {
    ticker: normalizeSymbol(yfTicker),
    validated: Boolean(forecast.validated),
    status: forecast.status,
    message: forecast.message,
    metrics: forecast.metrics || null,
    predictions: forecast.predictions || [],
    disclaimer: forecast.disclaimer,
    lastFetchedAt: new Date(),
  };
}

module.exports = {
  PythonDataServiceError,
  fetchQuoteFromPythonService,
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  fetchForecastFromPythonService,
  normalizeSymbol,
  toYFinanceTicker,
};
