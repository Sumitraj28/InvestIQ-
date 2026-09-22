const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const {
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  normalizeSymbol,
  PythonDataServiceError,
} = require('../services/pythonDataService');
const { fetchAndSaveStock, buildOfflineStockData } = require('../services/nseService');
const { generateAiCompanyBrief } = require('../services/aiSummaryService');
const { computeSignal } = require('../services/signalEngine');

// Cache validity: 15 minutes (Requirement 4)
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Validate ticker input: only allow letters and numbers (with optional .NS/.BO suffix)
 */
function isValidTicker(rawTicker) {
  if (!rawTicker || typeof rawTicker !== 'string') return false;
  const stripped = normalizeSymbol(rawTicker);
  // NSE tickers can include letters, numbers, ampersands, and hyphens.
  return /^[A-Z0-9&-]+$/i.test(stripped);
}

async function saveStockDocument(stockData) {
  return Stock.findOneAndUpdate(
    { ticker: stockData.ticker },
    stockData,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

function stockToResponse(stock, stale = false, dataSource = 'live') {
  const dataObj = stock?.toObject ? stock.toObject() : { ...stock };
  dataObj.stale = stale;
  dataObj.dataSource = dataSource;
  dataObj.signal = computeSignal(dataObj);
  return dataObj;
}

async function savePrediction(ticker, predictionData) {
  return Stock.findOneAndUpdate(
    { ticker },
    {
      $set: {
        ticker,
        prediction: {
          predictions: predictionData.predictions || [],
          r2Score: predictionData.r2Score,
          lastFetchedAt: predictionData.lastFetchedAt || new Date(),
        },
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

// @route   GET /api/stocks/:ticker/prediction
// @desc    Get 90-day predicted close trend from Python data service with MongoDB cache
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
    let stock = await Stock.findOne({ ticker: cleanTicker });
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
      console.error(`[StockRoutes] Prediction fetch failed for ${cleanTicker}: ${fetchErr.message}`);

      if (hasPrediction) {
        return res.status(200).json({
          success: true,
          ticker: stock.ticker,
          predictions: stock.prediction.predictions,
          r2Score: stock.prediction.r2Score,
          stale: true,
        });
      }

      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json({
        success: false,
        error: status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Prediction data temporarily unavailable, please try again.',
      });
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing prediction for ${cleanTicker}:`, err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred.',
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
    let stock = await Stock.findOne({ ticker: cleanTicker });

    if (!stock) {
      try {
        const freshStockData = await fetchStockFromPythonService(rawTicker);
        stock = await saveStockDocument(freshStockData);
      } catch (fetchErr) {
        console.error(`[AI Summary] Live fetch failed for ${cleanTicker}: ${fetchErr.message}`);
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
    console.error(`[AI Summary] Unexpected error for ${cleanTicker}:`, err);
    return res.status(500).json({
      success: false,
      error: 'Unable to generate AI company summary.',
    });
  }
});

// @route   GET /api/stocks/:ticker
// @desc    Get stock by ticker symbol (checks MongoDB cache, fallback to Python yfinance service)
// @access  Public
router.get('/:ticker', async (req, res) => {
  const rawTicker = req.params.ticker;

  // 6. Basic input validation: reject tickers with invalid characters before calling NSE
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only alphanumeric characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    // 4a. Check MongoDB cache first
    let stock = await Stock.findOne({ ticker: cleanTicker });

    const now = Date.now();
    const lastFetched = stock && stock.lastFetchedAt ? new Date(stock.lastFetchedAt).getTime() : 0;
    const isCacheFresh = stock && (now - lastFetched < CACHE_TTL_MS);

    // 4b. If fresh cached copy exists, serve from cache
    if (isCacheFresh) {
      console.log(`[Cache HIT] Serving cached data for ${cleanTicker} (cached ${Math.round((now - lastFetched) / 1000)}s ago)`);
      return res.status(200).json({
        success: true,
        data: stockToResponse(stock, false, 'cache'),
        stale: false,
      });
    }

    // 4c. Missing or older than 15 minutes: call FastAPI service for price + summary + history
    console.log(`[Cache MISS/EXPIRED] Fetching fresh yfinance data for ${cleanTicker}...`);
    try {
      const freshStockData = await fetchStockFromPythonService(rawTicker);
      const freshStock = await saveStockDocument(freshStockData);

      return res.status(200).json({
        success: true,
        data: stockToResponse(freshStock, false, 'yfinance'),
        stale: false,
      });
    } catch (fetchErr) {
      console.error(`[StockRoutes] Live fetch failed for ${cleanTicker}: ${fetchErr.message}`);

      try {
        const fallbackStock = await fetchAndSaveStock(cleanTicker);
        return res.status(200).json({
          success: true,
          data: stockToResponse(fallbackStock, false, 'nse-fallback'),
          stale: false,
          warning: 'Served company details from NSE fallback data because yfinance was unavailable.',
        });
      } catch (fallbackErr) {
        console.error(`[StockRoutes] NSE fallback failed for ${cleanTicker}: ${fallbackErr.message}`);
      }

      // 4d. If live fetch fails but cached copy exists (even if stale), return stale copy with "stale": true
      if (stock) {
        console.log(`[Cache FALLBACK] Serving stale cached data for ${cleanTicker} with stale: true`);

        return res.status(200).json({
          success: true,
          data: stockToResponse(stock, true, 'stale-cache'),
          stale: true,
        });
      }

      try {
        const offlineStock = await saveStockDocument(buildOfflineStockData(cleanTicker));
        return res.status(200).json({
          success: true,
          data: stockToResponse(offlineStock, true, 'offline-profile'),
          stale: true,
          warning: 'Served an offline company profile because live market data was unavailable.',
        });
      } catch (offlineErr) {
        console.error(`[StockRoutes] Offline profile fallback failed for ${cleanTicker}: ${offlineErr.message}`);
      }

      // 4e. If live fetch fails AND there's no cache, return HTTP 502
      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json({
        success: false,
        error: status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Live data temporarily unavailable, please try again.',
      });
    }
  } catch (err) {
    // 4f. Never crash the server on a bad ticker
    console.error(`[StockRoutes] Unexpected error processing ${cleanTicker}:`, err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred.',
    });
  }
});

// @route   GET /api/stocks/:ticker/history
// @desc    Get 5-year historical price data for a stock with stale-cache-fallback
// @access  Public
router.get('/:ticker/history', async (req, res) => {
  const rawTicker = req.params.ticker;

  // 6. Basic input validation
  if (!isValidTicker(rawTicker)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker symbol. Only alphanumeric characters allowed.',
    });
  }

  const cleanTicker = normalizeSymbol(rawTicker);

  try {
    // 5. Check MongoDB cache first
    let stock = await Stock.findOne({ ticker: cleanTicker });

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

    // Try live fetch
    console.log(`[Cache MISS/EXPIRED] Fetching fresh live history for ${cleanTicker}...`);
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
      console.error(`[StockRoutes] Live fetch failed for history of ${cleanTicker}: ${fetchErr.message}`);

      try {
        const fallbackStock = await fetchAndSaveStock(cleanTicker);
        return res.status(200).json({
          success: true,
          ticker: fallbackStock.ticker,
          name: fallbackStock.name,
          history5y: fallbackStock.history5y || [],
          stale: false,
          warning: 'Served history from NSE fallback data because yfinance was unavailable.',
        });
      } catch (fallbackErr) {
        console.error(`[StockRoutes] NSE fallback failed for history of ${cleanTicker}: ${fallbackErr.message}`);
      }

      // Stale fallback
      if (stock && stock.history5y && stock.history5y.length > 0) {
        console.log(`[Cache FALLBACK] Serving stale cached history for ${cleanTicker} with stale: true`);
        return res.status(200).json({
          success: true,
          ticker: stock.ticker,
          name: stock.name,
          history5y: stock.history5y,
          stale: true,
        });
      }

      // No cache at all -> HTTP 502
      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json({
        success: false,
        error: status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Live data temporarily unavailable, please try again.',
      });
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing history for ${cleanTicker}:`, err);
    return res.status(500).json({
      success: false,
      error: 'An unexpected server error occurred.',
    });
  }
});

module.exports = router;
