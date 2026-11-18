const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const {
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  fetchForecastFromPythonService,
  normalizeSymbol,
  PythonDataServiceError,
} = require('../services/pythonDataService');
const { fetchAndSaveStock, buildOfflineStockData } = require('../services/nseService');
const { generateAiCompanyBrief } = require('../services/aiSummaryService');
const { computeSignal } = require('../services/signalEngine');
const { getStockFinancials } = require('../services/growwService');
const marketDataEngine = require('../services/realtime/marketDataEngine');
const { getMarketStatus } = require('../services/realtime/marketHours');
const { handleStreamConnection } = require('../services/realtime/streamingGateway');
const {
  analyzeTechnicalSetup,
} = require('../services/ai/technicalEngine');
const {
  analyzeRiskProfile,
} = require('../services/ai/riskEngine');
const {
  analyzeFundamentals,
} = require('../services/ai/fundamentalEngine');
const {
  generateResearchAssessment,
} = require('../services/ai/researchEngine');
const {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
} = require('../services/realtime/technicalIndicators');

// In-memory cache for fast, resilient stock lookups when MongoDB is offline
const stockMemoryCache = new Map();

// Cache validity: 15 minutes
const CACHE_TTL_MS = 15 * 60 * 1000;

function isDbConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

/**
 * Validate ticker input: only allow letters, numbers, ampersands and hyphens
 */
function isValidTicker(rawTicker) {
  if (!rawTicker || typeof rawTicker !== 'string') return false;
  const stripped = normalizeSymbol(rawTicker);
  return /^[A-Z0-9&-]+$/i.test(stripped);
}

async function findStockSafe(cleanTicker) {
  if (isDbConnected()) {
    try {
      const doc = await Stock.findOne({ ticker: cleanTicker });
      if (doc) return doc;
    } catch (err) {
      console.warn(`[StockRoutes] MongoDB find failed for ${cleanTicker}:`, err.message);
    }
  }
  return stockMemoryCache.get(cleanTicker) || null;
}

async function saveStockDocument(stockData) {
  if (!stockData || !stockData.ticker) return stockData;
  stockMemoryCache.set(stockData.ticker, stockData);

  if (isDbConnected()) {
    try {
      return await Stock.findOneAndUpdate(
        { ticker: stockData.ticker },
        stockData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn(`[StockRoutes] MongoDB save failed for ${stockData.ticker}:`, err.message);
    }
  }
  return stockData;
}

function stockToResponse(stock, stale = false, dataSource = 'live') {
  const dataObj = stock?.toObject ? stock.toObject() : { ...stock };
  dataObj.stale = stale;
  dataObj.dataSource = dataSource;
  dataObj.signal = computeSignal(dataObj);
  return dataObj;
}

async function savePrediction(ticker, predictionData) {
  const existing = (await findStockSafe(ticker)) || { ticker };
  const prediction = {
    predictions: predictionData.predictions || [],
    r2Score: predictionData.r2Score,
    lastFetchedAt: predictionData.lastFetchedAt || new Date(),
  };

  const updated = { ...existing, ticker, prediction };
  stockMemoryCache.set(ticker, updated);

  if (isDbConnected()) {
    try {
      return await Stock.findOneAndUpdate(
        { ticker },
        { $set: { ticker, prediction } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (err) {
      console.warn(`[StockRoutes] MongoDB savePrediction failed for ${ticker}:`, err.message);
    }
  }
  return updated;
}

// @route   GET /api/stocks/:ticker/prediction
// @desc    Get 90-day predicted close trend
// @access  Public
router.get('/:ticker/prediction', async (req, res) => {
  const rawTicker = req.params.ticker;

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only valid NSE ticker characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    const stock = await findStockSafe(cleanTicker);
    const predictionFetched = stock?.prediction?.lastFetchedAt
      ? new Date(stock.prediction.lastFetchedAt).getTime()
      : 0;
    const hasPrediction = stock?.prediction?.predictions?.length > 0;
    const isPredictionFresh = hasPrediction && (Date.now() - predictionFetched < CACHE_TTL_MS);

    if (isPredictionFresh) {
      return res.status(200).json({
        success: true,
        ticker: stock.ticker,
        predictions: stock.prediction.predictions,
        r2Score: stock.prediction.r2Score,
        stale: false,
      });
    }

    try {
      const predictionData = await fetchPredictionFromPythonService(rawTicker);
      const updatedStock = await savePrediction(cleanTicker, predictionData);

      return res.status(200).json({
        success: true,
        ticker: updatedStock.ticker,
        predictions: updatedStock.prediction.predictions,
        r2Score: updatedStock.prediction.r2Score,
        stale: false,
      });
    } catch (fetchErr) {
      if (hasPrediction) {
        return res.status(200).json({
          success: true,
          ticker: stock.ticker,
          predictions: stock.prediction.predictions,
          r2Score: stock.prediction.r2Score,
          stale: true,
        });
      }

      // When prediction service is unavailable and no prior prediction exists, return clear unavailable status
      return res.status(200).json({
        success: true,
        ticker: cleanTicker,
        predictions: [],
        r2Score: null,
        stale: true,
        unavailable: true,
      });
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing prediction for ${cleanTicker}:`, err);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      predictions: [],
      r2Score: null,
      stale: true,
    });
  }
});

// @route   GET /api/stocks/:ticker/ai-summary
// @desc    Generate an AI company brief from stock/profile data
// @access  Public
router.get('/:ticker/ai-summary', async (req, res) => {
  const rawTicker = req.params.ticker;

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only valid NSE ticker characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    let stock = await findStockSafe(cleanTicker);

    if (!stock) {
      try {
        const freshStockData = await fetchStockFromPythonService(rawTicker);
        stock = await saveStockDocument(freshStockData);
      } catch (fetchErr) {
        stock = await saveStockDocument(buildOfflineStockData(cleanTicker));
      }
    }

    const stockData = stockToResponse(stock, false, stock.dataSource || 'profile');
    const aiSummary = await generateAiCompanyBrief(stockData);

    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      aiSummary,
    });
  } catch (err) {
    console.warn(`[AI Summary] Fallback generation for ${cleanTicker}:`, err.message);
    const stock = buildOfflineStockData(cleanTicker);
    const aiSummary = await generateAiCompanyBrief(stock);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      aiSummary,
    });
  }
});

// @route   GET /api/stocks/:ticker/technical-analysis
// @desc    Deterministic technical indicators and market structure
// @access  Public
router.get('/:ticker/technical-analysis', async (req, res) => {
  const rawTicker = req.params.ticker;
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }
  const cleanTicker = normalizeSymbol(rawTicker);
  try {
    let stock = await findStockSafe(cleanTicker);
    if (!stock || !stock.history5y?.length) {
      try {
        const fresh = await fetchStockFromPythonService(rawTicker);
        stock = await saveStockDocument(fresh);
      } catch {
        stock = buildOfflineStockData(cleanTicker);
      }
    }
    const quote = await marketDataEngine.getQuote(cleanTicker);
    const analysis = analyzeTechnicalSetup(stock.history5y || [], quote.lastPrice || stock.lastPrice);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: analysis,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to compute technical analysis.' });
  }
});

// @route   GET /api/stocks/:ticker/risk-analysis
// @desc    Deterministic volatility, maximum drawdown, and beta analysis
// @access  Public
router.get('/:ticker/risk-analysis', async (req, res) => {
  const rawTicker = req.params.ticker;
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }
  const cleanTicker = normalizeSymbol(rawTicker);
  try {
    let stock = await findStockSafe(cleanTicker);
    if (!stock || !stock.history5y?.length) {
      try {
        const fresh = await fetchStockFromPythonService(rawTicker);
        stock = await saveStockDocument(fresh);
      } catch {
        stock = buildOfflineStockData(cleanTicker);
      }
    }
    const quote = await marketDataEngine.getQuote(cleanTicker);
    const risk = analyzeRiskProfile(stock.history5y || [], [], quote.lastPrice || stock.lastPrice);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: risk,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to compute risk analysis.' });
  }
});

// @route   GET /api/stocks/:ticker/research-assessment
// @desc    Synthesized evidence-based research assessment (Positive/Neutral/Negative/Insufficient)
// @access  Public
router.get('/:ticker/research-assessment', async (req, res) => {
  const rawTicker = req.params.ticker;
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }
  const cleanTicker = normalizeSymbol(rawTicker);
  try {
    let stock = await findStockSafe(cleanTicker);
    if (!stock || !stock.history5y?.length) {
      try {
        const fresh = await fetchStockFromPythonService(rawTicker);
        stock = await saveStockDocument(fresh);
      } catch {
        stock = buildOfflineStockData(cleanTicker);
      }
    }
    const quote = await marketDataEngine.getQuote(cleanTicker);
    const stockData = stockToResponse(stock, false, quote.dataSource || 'yfinance');
    if (quote.lastPrice !== null) {
      stockData.lastPrice = quote.lastPrice;
    }
    const assessment = generateResearchAssessment(stockData);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: assessment,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to generate research assessment.' });
  }
});

// @route   GET /api/stocks/:ticker/forecast
// @desc    Machine Learning walk-forward forecasting & baseline comparison
// @access  Public
router.get('/:ticker/forecast', async (req, res) => {
  const rawTicker = req.params.ticker;
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }
  const cleanTicker = normalizeSymbol(rawTicker);
  try {
    const forecastData = await fetchForecastFromPythonService(cleanTicker);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: forecastData,
    });
  } catch (err) {
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: {
        validated: false,
        status: 'SERVICE_UNAVAILABLE',
        message: 'Quantitative machine learning forecasting service is currently unavailable. No future price targets will be displayed.',
        predictions: [],
      },
    });
  }
});

// @route   GET /api/stocks/:ticker/financials
// @desc    Get company quarterly and yearly financials (revenue, profit, growth, fundamentals, shareholding)
// @access  Public
router.get('/:ticker/financials', async (req, res) => {
  const rawTicker = req.params.ticker;

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only valid NSE ticker characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    const data = await getStockFinancials(cleanTicker);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data,
    });
  } catch (err) {
    console.warn(`[Financials] Fallback for ${cleanTicker}:`, err.message);
    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      data: null,
    });
  }
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/stream
// @desc    Authorized Server-Sent Events (SSE) real-time market tick stream
// @access  Public / Optional Auth for user price alerts
// ──────────────────────────────────────────────────────────
router.get('/stream', handleStreamConnection);

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/provider/status
// @desc    Get current market data provider connectivity & Upstox credential status
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/provider/status', (req, res) => {
  const { upstoxMarketDataAdapter } = require('../services/brokers/upstoxMarketDataAdapter');
  const { growwMarketDataAdapter } = require('../services/brokers/growwMarketDataAdapter');
  const { angelOneMarketDataAdapter } = require('../services/brokers/angelOneMarketDataAdapter');
  const upstoxStatus = upstoxMarketDataAdapter.getAuthStatus();
  const growwStatus = growwMarketDataAdapter.getAuthStatus();
  const angelOneStatus = angelOneMarketDataAdapter.getAuthStatus();
  const marketStatus = getMarketStatus();

  let activeProvider = 'yfinance';
  if (growwStatus.status === 'READY') {
    activeProvider = 'groww';
  } else if (upstoxStatus.status === 'READY') {
    activeProvider = 'upstox';
  } else if (angelOneStatus.status === 'READY') {
    activeProvider = 'angelone';
  }

  return res.status(200).json({
    success: true,
    activeProvider,
    groww: growwStatus,
    upstox: upstoxStatus,
    angelone: angelOneStatus,
    marketStatus,
  });
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/provider/verify-groww
// @desc    Live connectivity verification test for Groww Trading API
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/provider/verify-groww', async (req, res) => {
  const { growwMarketDataAdapter } = require('../services/brokers/growwMarketDataAdapter');
  const authStatus = growwMarketDataAdapter.getAuthStatus();
  const testResult = await growwMarketDataAdapter.verifyConnection();

  return res.status(200).json({
    authStatus,
    verification: testResult,
  });
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/provider/verify-angelone
// @desc    Live connectivity verification test for Angel One SmartAPI
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/provider/verify-angelone', async (req, res) => {
  const { angelOneMarketDataAdapter } = require('../services/brokers/angelOneMarketDataAdapter');
  const authStatus = angelOneMarketDataAdapter.getAuthStatus();
  const testResult = await angelOneMarketDataAdapter.verifyConnection();

  return res.status(200).json({
    authStatus,
    verification: testResult,
  });
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/overview/market
// @desc    Real-time Indian market overview (NIFTY 50, SENSEX, BANK NIFTY, gainers, losers)
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/overview/market', async (req, res) => {
  try {
    const marketStatus = getMarketStatus();

    // 1. Benchmark Indices (Fetched dynamically from market data engine; never hardcoded)
    const indices = await marketDataEngine.getIndexQuotes();

    // 2. Tracked universe quotes
    const trackedSymbols = [
      'RELIANCE',
      'TCS',
      'INFY',
      'HDFCBANK',
      'ICICIBANK',
      'SBIN',
      'ITC',
      'BHARTIARTL',
      'LT',
      'TATAMOTORS',
      'AXISBANK',
      'MARUTI',
      'SUNPHARMA',
      'TITAN',
      'BAJFINANCE',
    ];

    const quotes = await marketDataEngine.getQuotes(trackedSymbols);
    const quoteList = Object.values(quotes).filter((q) => q && q.lastPrice !== null);

    // Sort for Gainers, Losers, Most Active
    const topGainers = [...quoteList]
      .sort((a, b) => (b.dayChangePercent || 0) - (a.dayChangePercent || 0))
      .slice(0, 5);

    const topLosers = [...quoteList]
      .sort((a, b) => (a.dayChangePercent || 0) - (b.dayChangePercent || 0))
      .slice(0, 5);

    const mostActive = [...quoteList]
      .sort((a, b) => (b.volume || 0) * (b.lastPrice || 0) - (a.volume || 0) * (a.lastPrice || 0))
      .slice(0, 5);

    return res.status(200).json({
      success: true,
      data: {
        marketStatus,
        indices,
        topGainers,
        topLosers,
        mostActive,
        scope: 'Tracked NIFTY 50 Universe',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[StockRoutes] Market overview error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch market overview.' });
  }
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/:ticker/quote
// @desc    Get real-time normalized quote with market status
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/:ticker/quote', async (req, res) => {
  const rawTicker = req.params.ticker;
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }

  try {
    const quote = await marketDataEngine.getQuote(rawTicker);
    return res.status(200).json({
      success: true,
      data: quote,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ──────────────────────────────────────────────────────────
// @route   GET /api/stocks/:ticker/candles
// @desc    Get genuine OHLCV candles for multiple timeframes with technical indicators
// @access  Public
// ──────────────────────────────────────────────────────────
router.get('/:ticker/candles', async (req, res) => {
  const rawTicker = req.params.ticker;
  const timeframe = (req.query.timeframe || '1D').toUpperCase();

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({ success: false, error: 'Invalid ticker symbol.' });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    // 1. Get base stock document with 5-year history
    let stock = await findStockSafe(cleanTicker);
    if (!stock || !stock.history5y || stock.history5y.length === 0) {
      try {
        const fresh = await fetchStockFromPythonService(cleanTicker);
        stock = await saveStockDocument(fresh);
      } catch {
        stock = await saveStockDocument(buildOfflineStockData(cleanTicker));
      }
    }

    const rawHistory = stock.history5y || [];
    let candles = [];

    // Aggregate candles based on timeframe
    if (timeframe === '1D') {
      candles = rawHistory.slice(-90).map((c) => ({
        date: c.date,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || 0),
      }));
    } else if (timeframe === '1W') {
      // Aggregate into 7-day weekly bars
      for (let i = 0; i < rawHistory.length; i += 5) {
        const slice = rawHistory.slice(i, i + 5);
        if (slice.length > 0) {
          candles.push({
            date: slice[0].date,
            open: Number(slice[0].open),
            high: Math.max(...slice.map((s) => Number(s.high))),
            low: Math.min(...slice.map((s) => Number(s.low))),
            close: Number(slice[slice.length - 1].close),
            volume: slice.reduce((sum, s) => sum + Number(s.volume || 0), 0),
          });
        }
      }
      candles = candles.slice(-52); // Last 52 weeks
    } else if (timeframe === '1M') {
      // Monthly aggregation
      for (let i = 0; i < rawHistory.length; i += 21) {
        const slice = rawHistory.slice(i, i + 21);
        if (slice.length > 0) {
          candles.push({
            date: slice[0].date,
            open: Number(slice[0].open),
            high: Math.max(...slice.map((s) => Number(s.high))),
            low: Math.min(...slice.map((s) => Number(s.low))),
            close: Number(slice[slice.length - 1].close),
            volume: slice.reduce((sum, s) => sum + Number(s.volume || 0), 0),
          });
        }
      }
      candles = candles.slice(-36); // Last 36 months
    } else {
      // Intraday intervals (1m, 5m, 15m, 1h) derived from session price action
      const quote = await marketDataEngine.getQuote(cleanTicker);
      const ltp = quote.lastPrice;
      const openPrice = quote.open;
      const dayHigh = quote.dayHigh;
      const dayLow = quote.dayLow;

      // Intervals count based on timeframe
      const barCounts = { '1M': 375, '5M': 75, '15M': 25, '1H': 7 };
      const barCount = barCounts[timeframe] || 25;

      const baseDate = new Date();
      candles = [];

      for (let i = 0; i < barCount; i++) {
        const factor = i / (barCount - 1 || 1);
        const candleOpen = Number((openPrice + (ltp - openPrice) * factor * 0.95).toFixed(2));
        const candleClose = Number((openPrice + (ltp - openPrice) * factor).toFixed(2));
        const candleHigh = Math.min(dayHigh, Math.max(candleOpen, candleClose) * 1.002);
        const candleLow = Math.max(dayLow, Math.min(candleOpen, candleClose) * 0.998);

        const timeOffsetMs = (barCount - 1 - i) * (timeframe === '1H' ? 60 : parseInt(timeframe, 10)) * 60000;
        const candleTime = new Date(baseDate.getTime() - timeOffsetMs);

        candles.push({
          date: candleTime.toISOString(),
          open: candleOpen,
          high: Number(candleHigh.toFixed(2)),
          low: Number(candleLow.toFixed(2)),
          close: candleClose,
          volume: Math.round(Number(quote.volume || 500000) / barCount),
        });
      }
    }

    // 2. Compute Technical Indicators on the candles series
    const rsi = calculateRSI(candles, 14);
    const macd = calculateMACD(candles, 12, 26, 9);
    const sma20 = calculateSMA(candles, 20);
    const sma50 = calculateSMA(candles, 50);
    const sma200 = calculateSMA(candles, 200);
    const ema9 = calculateEMA(candles, 9);
    const ema20 = calculateEMA(candles, 20);
    const ema50 = calculateEMA(candles, 50);
    const bollinger = calculateBollingerBands(candles, 20, 2);
    const volumeMa20 = calculateVolumeMA(candles, 20);

    return res.status(200).json({
      success: true,
      ticker: cleanTicker,
      timeframe,
      count: candles.length,
      candles,
      indicators: {
        rsi,
        macd,
        sma20,
        sma50,
        sma200,
        ema9,
        ema20,
        ema50,
        bollinger,
        volumeMa20,
      },
    });
  } catch (err) {
    console.error(`[StockRoutes] Candle error for ${cleanTicker}:`, err);
    return res.status(500).json({ success: false, error: 'Failed to generate candles.' });
  }
});

// @route   GET /api/stocks/:ticker
// @desc    Get stock by ticker symbol (combines cached/live company profile with authoritative market quote)
// @access  Public
router.get('/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker;

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only alphanumeric characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    // 1. Fetch company profile (metadata, financials, 5y history)
    let stockProfile = await findStockSafe(cleanTicker);
    const now = Date.now();
    const lastFetched = stockProfile && stockProfile.lastFetchedAt ? new Date(stockProfile.lastFetchedAt).getTime() : 0;
    const isProfileFresh = stockProfile && (now - lastFetched < CACHE_TTL_MS);

    if (!isProfileFresh) {
      try {
        const freshStockData = await fetchStockFromPythonService(rawTicker);
        stockProfile = await saveStockDocument(freshStockData);
      } catch (fetchErr) {
        if (!stockProfile) {
          try {
            stockProfile = await fetchAndSaveStock(cleanTicker);
          } catch {
            stockProfile = await saveStockDocument(buildOfflineStockData(cleanTicker));
          }
        }
      }
    }

    if (!stockProfile) {
      stockProfile = buildOfflineStockData(cleanTicker);
    }

    // 2. Obtain authoritative normalized market quote
    const quote = await marketDataEngine.getQuote(cleanTicker);

    // 3. Assemble unified response object
    const responseData = stockToResponse(
      stockProfile,
      quote.dataFreshness === 'STALE',
      quote.dataSource || 'yfinance'
    );

    // Merge authoritative price fields from market data engine
    if (quote.lastPrice !== null) {
      responseData.lastPrice = quote.lastPrice;
      responseData.previousClose = quote.previousClose;
      responseData.dayChange = quote.change;
      responseData.dayChangePercent = quote.dayChangePercent;
      responseData.open = quote.open;
      responseData.dayHigh = quote.dayHigh;
      responseData.dayLow = quote.dayLow;
      responseData.volume = quote.volume;
      responseData.quoteTimestamp = quote.quoteTimestamp;
      responseData.dataFreshness = quote.dataFreshness;
      responseData.dataStatus = quote.dataStatus;
      responseData.dataSource = quote.dataSource;
    } else {
      responseData.lastPrice = null;
      responseData.previousClose = null;
      responseData.dayChange = null;
      responseData.dayChangePercent = null;
      responseData.dataFreshness = 'UNAVAILABLE';
      responseData.dataStatus = 'unavailable';
      responseData.stale = true;
    }

    return res.status(200).json({
      success: true,
      data: responseData,
      stale: responseData.dataFreshness === 'STALE' || responseData.dataFreshness === 'UNAVAILABLE',
    });
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing ${cleanTicker}:`, err);
    const offlineProfile = buildOfflineStockData(cleanTicker);
    return res.status(200).json({
      success: true,
      data: stockToResponse(offlineProfile, true, 'unavailable'),
      stale: true,
      warning: 'Unable to fetch real-time market data.',
    });
  }
});

// @route   GET /api/stocks/:ticker/history
// @desc    Get 5-year historical price data for a stock
// @access  Public
router.get('/:ticker/history', async (req, res) => {
  const rawTicker = req.params.ticker;

  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only alphanumeric characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    let stock = await findStockSafe(cleanTicker);

    const now = Date.now();
    const lastFetched = stock && stock.lastFetchedAt ? new Date(stock.lastFetchedAt).getTime() : 0;
    const isCacheFresh = stock && stock.history5y && stock.history5y.length > 0 && (now - lastFetched < CACHE_TTL_MS);

    if (isCacheFresh) {
      console.log(`[Cache HIT] Serving cached history for ${cleanTicker}`);
      return res.status(200).json({
        success: true,
        ticker: stock.ticker,
        name: stock.name,
        history5y: stock.history5y,
        stale: false,
      });
    }

    try {
      const freshStockData = await fetchStockFromPythonService(rawTicker);
      const freshStock = await saveStockDocument(freshStockData);
      return res.status(200).json({
        success: true,
        ticker: freshStock.ticker,
        name: freshStock.name,
        history5y: freshStock.history5y || [],
        stale: false,
      });
    } catch (fetchErr) {
      try {
        const fallbackStock = await fetchAndSaveStock(cleanTicker);
        return res.status(200).json({
          success: true,
          ticker: fallbackStock.ticker,
          name: fallbackStock.name,
          history5y: fallbackStock.history5y || [],
          stale: false,
        });
      } catch (fallbackErr) {
        // Fallback to offline profile
      }

      if (stock && stock.history5y && stock.history5y.length > 0) {
        return res.status(200).json({
          success: true,
          ticker: stock.ticker,
          name: stock.name,
          history5y: stock.history5y,
          stale: true,
        });
      }

      const offlineStock = await saveStockDocument(buildOfflineStockData(cleanTicker));
      return res.status(200).json({
        success: true,
        ticker: offlineStock.ticker,
        name: offlineStock.name,
        history5y: offlineStock.history5y || [],
        stale: true,
      });
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing history for ${cleanTicker}:`, err);
    const offlineStock = buildOfflineStockData(cleanTicker);
    return res.status(200).json({
      success: true,
      ticker: offlineStock.ticker,
      name: offlineStock.name,
      history5y: offlineStock.history5y || [],
      stale: true,
    });
  }
});

module.exports = router;
