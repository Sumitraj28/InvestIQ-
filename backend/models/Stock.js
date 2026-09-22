const mongoose = require('mongoose');

const HistoryItemSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    open: {
      type: Number,
      default: 0,
    },
    high: {
      type: Number,
      default: 0,
    },
    low: {
      type: Number,
      default: 0,
    },
    close: {
      type: Number,
      default: 0,
    },
    volume: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const PredictionItemSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    predictedClose: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const StockSchema = new mongoose.Schema(
  {
    ticker: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sector: {
      type: String,
      trim: true,
      default: 'Unknown',
    },
    industry: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    businessSummary: {
      type: String,
      trim: true,
      default: '',
    },
    marketCap: {
      type: Number,
      default: 0,
    },
    peRatio: {
      type: Number,
      default: 0,
    },
    week52High: {
      type: Number,
      default: 0,
    },
    week52Low: {
      type: Number,
      default: 0,
    },
    lastPrice: {
      type: Number,
      default: 0,
    },
    dayChangePercent: {
      type: Number,
      default: 0,
    },
    history5y: {
      type: [HistoryItemSchema],
      default: [],
    },
    prediction: {
      predictions: {
        type: [PredictionItemSchema],
        default: [],
      },
      r2Score: {
        type: Number,
        default: null,
      },
      lastFetchedAt: {
        type: Date,
        default: null,
      },
    },
    lastFetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Stock', StockSchema);
