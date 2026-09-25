const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');
const config = require('../config/env');
const {
  fetchStockFromPythonService,
  fetchPredictionFromPythonService,
  PythonDataServiceError,
} = require('../services/pythonDataService');
const { fetchAndSaveStock, buildOfflineStockData } = require('../services/nseService');
const { generateAiCompanyBrief } = require('../services/aiSummaryService');
const { computeSignal } = require('../services/signalEngine');
const { getStockFinancials } = require('../services/growwService');
const { validateTicker } = require('../middleware/validation');
const { successResponse, errorResponse } = require('../utils/response');

const CACHE_TTL_MS = config.cacheTtl.nse;

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

router.get('/:ticker/prediction', validateTicker, async (req, res) => {
  const cleanTicker = req.validatedTicker;

  try {
    let stock = await Stock.findOne({ ticker: cleanTicker });
    const predictionFetched = stock?.prediction?.lastFetchedAt
      ? new Date(stock.prediction.lastFetchedAt).getTime()
      : 0;
    const hasPrediction = stock?.prediction?.predictions?.length > 0;
    const isPredictionFresh = hasPrediction && (Date.now() - predictionFetched < CACHE_TTL_MS);

    if (isPredictionFresh) {
      return res.status(200).json(successResponse({
        ticker: stock.ticker,
        predictions: stock.prediction.predictions,
        r2Score: stock.prediction.r2Score,
        model: 'LinearRegression',
        horizonDays: 90,
        stale: false,
      }));
    }

    try {
      const predictionData = await fetchPredictionFromPythonService(cleanTicker);
      const updatedStock = await savePrediction(cleanTicker, predictionData);

      return res.status(200).json(successResponse({
        ticker: updatedStock.ticker,
        predictions: updatedStock.prediction.predictions,
        r2Score: updatedStock.prediction.r2Score,
        model: 'LinearRegression',
        horizonDays: 90,
        stale: false,
      }));
    } catch (fetchErr) {
      console.error(`[StockRoutes] Prediction fetch failed for ${cleanTicker}: ${fetchErr.message}`);

      if (hasPrediction) {
        return res.status(200).json(successResponse({
          ticker: stock.ticker,
          predictions: stock.prediction.predictions,
          r2Score: stock.prediction.r2Score,
          model: 'LinearRegression',
          horizonDays: 90,
          stale: true,
        }));
      }

      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json(errorResponse(
        status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Prediction data temporarily unavailable, please try again.',
        'PREDICTION_UNAVAILABLE',
        status,
        req.id
      ));
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing prediction for ${cleanTicker}:`, err);
    return res.status(500).json(errorResponse('An unexpected server error occurred.', 'INTERNAL_ERROR', 500, req.id));
  }
});

router.get('/:ticker/ai-summary', validateTicker, async (req, res) => {
  const cleanTicker = req.validatedTicker;

  try {
    let stock = await Stock.findOne({ ticker: cleanTicker });

    if (!stock) {
      try {
        const freshStockData = await fetchStockFromPythonService(cleanTicker);
        stock = await Stock.findOneAndUpdate(
          { ticker: cleanTicker },
          freshStockData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (fetchErr) {
        console.error(`[AI Summary] Live fetch failed for ${cleanTicker}: ${fetchErr.message}`);
        const offlineData = buildOfflineStockData(cleanTicker);
        stock = await Stock.findOneAndUpdate(
          { ticker: cleanTicker },
          offlineData,
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    const stockData = stockToResponse(stock, false, stock.dataSource || 'profile');
    const aiSummary = await generateAiCompanyBrief(stockData);

    return res.status(200).json(successResponse({
      ticker: cleanTicker,
      aiSummary,
    }, { cached: false }));
  } catch (err) {
    console.error(`[AI Summary] Unexpected error for ${cleanTicker}:`, err);
    return res.status(500).json(errorResponse('Unable to generate AI company summary.', 'AI_SUMMARY_ERROR', 500, req.id));
  }
});

router.get('/:ticker/financials', validateTicker, async (req, res) => {
  const cleanTicker = req.validatedTicker;

  try {
    const data = await getStockFinancials(cleanTicker);
    return res.status(200).json(successResponse({
      ticker: cleanTicker,
      financials: data,
      source: 'groww',
      cached: false,
    }));
  } catch (err) {
    console.error(`[Financials] Error for ${cleanTicker}:`, err.message);
    return res.status(500).json(errorResponse('Unable to fetch financial performance data.', 'FINANCIALS_ERROR', 500, req.id));
  }
});

router.get('/:ticker', validateTicker, async (req, res) => {
  const cleanTicker = req.validatedTicker;

  try {
    let stock = await Stock.findOne({ ticker: cleanTicker });

    const now = Date.now();
    const lastFetched = stock && stock.lastFetchedAt ? new Date(stock.lastFetchedAt).getTime() : 0;
    const isCacheFresh = stock && (now - lastFetched < CACHE_TTL_MS);

    if (isCacheFresh) {
      console.log(`[Cache HIT] Serving cached data for ${cleanTicker} (cached ${Math.round((now - lastFetched) / 1000)}s ago)`);
      return res.status(200).json(successResponse(
        stockToResponse(stock, false, 'cache'),
        { cached: true, stale: false }
      ));
    }

    console.log(`[Cache MISS/EXPIRED] Fetching fresh data for ${cleanTicker}...`);
    try {
      const freshStockData = await fetchStockFromPythonService(cleanTicker);
      const freshStock = await Stock.findOneAndUpdate(
        { ticker: cleanTicker },
        freshStockData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.status(200).json(successResponse(
        stockToResponse(freshStock, false, 'yfinance'),
        { cached: false, stale: false }
      ));
    } catch (fetchErr) {
      console.error(`[StockRoutes] Live fetch failed for ${cleanTicker}: ${fetchErr.message}`);

      try {
        const fallbackStock = await fetchAndSaveStock(cleanTicker);
        return res.status(200).json(successResponse(
          stockToResponse(fallbackStock, false, 'nse-fallback'),
          { cached: false, stale: false, warning: 'Served company details from NSE fallback data because yfinance was unavailable.' }
        ));
      } catch (fallbackErr) {
        console.error(`[StockRoutes] NSE fallback failed for ${cleanTicker}: ${fallbackErr.message}`);
      }

      if (stock) {
        console.log(`[Cache FALLBACK] Serving stale cached data for ${cleanTicker} with stale: true`);
        return res.status(200).json(successResponse(
          stockToResponse(stock, true, 'stale-cache'),
          { cached: true, stale: true }
        ));
      }

      try {
        const offlineStock = await Stock.findOneAndUpdate(
          { ticker: cleanTicker },
          buildOfflineStockData(cleanTicker),
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return res.status(200).json(successResponse(
          stockToResponse(offlineStock, true, 'offline-profile'),
          { cached: false, stale: true, warning: 'Served an offline company profile because live market data was unavailable.' }
        ));
      } catch (offlineErr) {
        console.error(`[StockRoutes] Offline profile fallback failed for ${cleanTicker}: ${offlineErr.message}`);
      }

      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json(errorResponse(
        status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Live data temporarily unavailable, please try again.',
        'STOCK_UNAVAILABLE',
        status,
        req.id
      ));
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing ${cleanTicker}:`, err);
    return res.status(500).json(errorResponse('An unexpected server error occurred.', 'INTERNAL_ERROR', 500, req.id));
  }
});

router.get('/:ticker/history', validateTicker, async (req, res) => {
  const cleanTicker = req.validatedTicker;

  try {
    let stock = await Stock.findOne({ ticker: cleanTicker });

    const now = Date.now();
    const lastFetched = stock && stock.lastFetchedAt ? new Date(stock.lastFetchedAt).getTime() : 0;
    const isCacheFresh = stock && stock.history5y && stock.history5y.length > 0 && (now - lastFetched < CACHE_TTL_MS);

    if (isCacheFresh) {
      console.log(`[Cache HIT] Serving cached history for ${cleanTicker}`);
      return res.status(200).json(successResponse({
        ticker: stock.ticker,
        name: stock.name,
        history5y: stock.history5y,
        stale: false,
      }, { cached: true }));
    }

    console.log(`[Cache MISS/EXPIRED] Fetching fresh history for ${cleanTicker}...`);
    try {
      const freshStockData = await fetchStockFromPythonService(cleanTicker);
      const freshStock = await Stock.findOneAndUpdate(
        { ticker: cleanTicker },
        freshStockData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return res.status(200).json(successResponse({
        ticker: freshStock.ticker,
        name: freshStock.name,
        history5y: freshStock.history5y || [],
        stale: false,
      }, { cached: false }));
    } catch (fetchErr) {
      console.error(`[StockRoutes] Live fetch failed for history of ${cleanTicker}: ${fetchErr.message}`);

      try {
        const fallbackStock = await fetchAndSaveStock(cleanTicker);
        return res.status(200).json(successResponse({
          ticker: fallbackStock.ticker,
          name: fallbackStock.name,
          history5y: fallbackStock.history5y || [],
          stale: false,
        }, { cached: false, warning: 'Served history from NSE fallback data because yfinance was unavailable.' }));
      } catch (fallbackErr) {
        console.error(`[StockRoutes] NSE fallback failed for history of ${cleanTicker}: ${fallbackErr.message}`);
      }

      if (stock && stock.history5y && stock.history5y.length > 0) {
        console.log(`[Cache FALLBACK] Serving stale cached history for ${cleanTicker} with stale: true`);
        return res.status(200).json(successResponse({
          ticker: stock.ticker,
          name: stock.name,
          history5y: stock.history5y,
          stale: true,
        }, { cached: true, stale: true }));
      }

      const status = fetchErr instanceof PythonDataServiceError ? fetchErr.status : 502;
      return res.status(status).json(errorResponse(
        status === 404
          ? `No stock data found for ${cleanTicker}.`
          : 'Live data temporarily unavailable, please try again.',
        'HISTORY_UNAVAILABLE',
        status,
        req.id
      ));
    }
  } catch (err) {
    console.error(`[StockRoutes] Unexpected error processing history for ${cleanTicker}:`, err);
    return res.status(500).json(errorResponse('An unexpected server error occurred.', 'INTERNAL_ERROR', 500, req.id));
  }
});

module.exports = router;