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
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    clean = clean.slice(0, -3);
  }
  return clean;
}

function toYFinanceTicker(symbol) {
  const clean = symbol.trim().toUpperCase();
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
    dayChangePercent: price.dayChangePercent,
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
    lastFetchedAt: new Date(),
  };
}

module.exports = {
  PythonDataServiceError,
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  normalizeSymbol,
  toYFinanceTicker,
};
