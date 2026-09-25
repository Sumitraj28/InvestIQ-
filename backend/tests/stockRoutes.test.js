const request = require('supertest');
const { app } = require('../server');
const Stock = require('../models/Stock');

jest.mock('../services/pythonDataService', () => ({
  fetchStockFromPythonService: jest.fn(),
  fetchPredictionFromPythonService: jest.fn(),
  PythonDataServiceError: class extends Error {
    constructor(message, status = 502) {
      super(message);
      this.status = status;
    }
  },
}));

jest.mock('../services/nseService', () => ({
  fetchAndSaveStock: jest.fn(),
  buildOfflineStockData: jest.fn(),
  NSEFetchError: class extends Error {
    constructor(message, symbol) {
      super(message);
      this.symbol = symbol;
    }
  },
}));

jest.mock('../services/aiSummaryService', () => ({
  generateAiCompanyBrief: jest.fn().mockResolvedValue({
    generatedBy: 'local-ai-fallback',
    overview: 'Test overview',
    stockDetails: ['Detail 1'],
    strengths: ['Strength 1'],
    watchouts: ['Watchout 1'],
    verdict: 'Test verdict',
  }),
}));

jest.mock('../services/growwService', () => ({
  getStockFinancials: jest.fn().mockResolvedValue({
    source: 'groww',
    quarterly: [],
    yearly: [],
    summary: {},
    fundamentals: {},
    shareholding: null,
  }),
}));

jest.mock('../config/db', () => ({
  connectDB: jest.fn(),
  isDbConnected: jest.fn(() => true),
}));

const { fetchStockFromPythonService, fetchPredictionFromPythonService, PythonDataServiceError } = require('../services/pythonDataService');
const { fetchAndSaveStock, buildOfflineStockData, NSEFetchError } = require('../services/nseService');
const { generateAiCompanyBrief } = require('../services/aiSummaryService');
const { getStockFinancials } = require('../services/growwService');

describe('Stock Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/stocks/:ticker', () => {
    test('returns 400 for invalid ticker', async () => {
      const response = await request(app).get('/api/stocks/INVALID!');
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.code).toBe('INVALID_TICKER_FORMAT');
    });

    test('returns 200 with stock data from cache when fresh', async () => {
      const mockStock = {
        ticker: 'RELIANCE',
        name: 'Reliance Industries',
        sector: 'Energy',
        lastPrice: 2500,
        dayChangePercent: 1.5,
        history5y: [],
        lastFetchedAt: new Date(),
        toObject: function() { return this; },
      };
      Stock.findOne = jest.fn().mockResolvedValue(mockStock);

      const response = await request(app).get('/api/stocks/RELIANCE');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticker).toBe('RELIANCE');
      expect(response.body.meta.cached).toBe(true);
    });

    test('fetches from Python service when cache miss', async () => {
      const pythonStockData = {
        ticker: 'RELIANCE',
        name: 'Reliance Industries',
        sector: 'Energy',
        lastPrice: 2500,
        dayChangePercent: 1.5,
        history5y: [],
        lastFetchedAt: new Date(),
      };
      Stock.findOne = jest.fn().mockResolvedValue(null);
      fetchStockFromPythonService.mockResolvedValue(pythonStockData);

      const mockSavedStock = {
        ...pythonStockData,
        toObject: function() { return this; },
      };
      Stock.findOneAndUpdate = jest.fn().mockResolvedValue(mockSavedStock);

      const response = await request(app).get('/api/stocks/RELIANCE');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/stocks/:ticker/history', () => {
    test('returns 400 for invalid ticker', async () => {
      const response = await request(app).get('/api/stocks/INVALID!/history');
      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_TICKER_FORMAT');
    });

    test('returns history from cache when fresh', async () => {
      const mockStock = {
        ticker: 'RELIANCE',
        name: 'Reliance Industries',
        history5y: [{ date: '2023-01-01', close: 2500 }],
        lastFetchedAt: new Date(),
      };
      Stock.findOne = jest.fn().mockResolvedValue(mockStock);

      const response = await request(app).get('/api/stocks/RELIANCE/history');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.ticker).toBe('RELIANCE');
    });
  });

  describe('GET /api/stocks/:ticker/prediction', () => {
    test('returns 400 for invalid ticker', async () => {
      const response = await request(app).get('/api/stocks/INVALID!/prediction');
      expect(response.status).toBe(400);
    });

    test('returns prediction from cache when fresh', async () => {
      const mockStock = {
        ticker: 'RELIANCE',
        prediction: {
          predictions: [{ date: '2024-01-01', predictedClose: 2600 }],
          r2Score: 0.85,
          lastFetchedAt: new Date(),
        },
      };
      Stock.findOne = jest.fn().mockResolvedValue(mockStock);

      const response = await request(app).get('/api/stocks/RELIANCE/prediction');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/stocks/:ticker/ai-summary', () => {
    test('returns 400 for invalid ticker', async () => {
      const response = await request(app).get('/api/stocks/INVALID!/ai-summary');
      expect(response.status).toBe(400);
    });

    test('returns AI summary', async () => {
      const mockStock = {
        ticker: 'RELIANCE',
        name: 'Reliance Industries',
        sector: 'Energy',
        lastPrice: 2500,
        dayChangePercent: 1.5,
        history5y: [],
        toObject: function() { return this; },
      };
      Stock.findOne = jest.fn().mockResolvedValue(mockStock);

      const response = await request(app).get('/api/stocks/RELIANCE/ai-summary');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.aiSummary).toBeDefined();
    });
  });

  describe('GET /api/stocks/:ticker/financials', () => {
    test('returns 400 for invalid ticker', async () => {
      const response = await request(app).get('/api/stocks/INVALID!/financials');
      expect(response.status).toBe(400);
    });

    test('returns financials', async () => {
      const response = await request(app).get('/api/stocks/RELIANCE/financials');
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.financials).toBeDefined();
    });
  });
});