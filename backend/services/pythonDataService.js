const config = require('../config/env');
const { withTimeout } = require('../utils/timeout');

class PythonDataServiceError extends Error {
  constructor(message, status = 502, details = null) {
    super(message);
    this.name = 'PythonDataServiceError';
    this.status = status;
    this.details = details;
  }
}

function getDataServiceUrl() {
  return config.pythonDataServiceUrl;
}

async function fetchJson(path, options = {}) {
  const timeoutMs = options.timeoutMs || config.timeouts.pythonRequest;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${getDataServiceUrl()}${path}`;
    const response = await fetch(url, {
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
      ? `Data service request timed out after ${timeoutMs}ms`
      : `Unable to reach Python data service: ${err.message}`;
    throw new PythonDataServiceError(message, 502, null);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchStockFromPythonService(symbol) {
  const { normalizeTicker, toYFinanceTicker } = require('../utils/normalizeTicker');

  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);

  const [price, summary, history] = await Promise.all([
    fetchJson(`/price/${encodedTicker}`),
    fetchJson(`/summary/${encodedTicker}`),
    fetchJson(`/history/${encodedTicker}`),
  ]);

  return {
    ticker: normalizeTicker(yfTicker),
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
    dayChangePercent: price.dayChangePercent,
    history5y: history,
    lastFetchedAt: new Date(),
  };
}

async function fetchPredictionFromPythonService(symbol) {
  const { normalizeTicker, toYFinanceTicker } = require('../utils/normalizeTicker');

  const yfTicker = toYFinanceTicker(symbol);
  const encodedTicker = encodeURIComponent(yfTicker);

  const prediction = await fetchJson(`/predict/${encodedTicker}`, {
    method: 'POST',
    timeoutMs: config.timeouts.pythonRequest * 2,
  });

  return {
    ticker: normalizeTicker(yfTicker),
    predictions: prediction.predictions || [],
    r2Score: prediction.r2Score,
    lastFetchedAt: new Date(),
  };
}

module.exports = {
  PythonDataServiceError,
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  getDataServiceUrl,
  fetchJson,
};