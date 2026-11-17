const mongoose = require('mongoose');

const SyncedHoldingSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    brokerConnectionId: {
      type: String,
      required: true,
      index: true,
    },
    broker: {
      type: String,
      required: true,
      enum: ['zerodha', 'upstox', 'angelone', 'groww'],
      index: true,
    },
    instrumentId: {
      type: String,
      default: null,
      trim: true,
    },
    isin: {
      type: String,
      default: null,
      trim: true,
      index: true,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE'],
      default: 'NSE',
      uppercase: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    averagePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    costBasis: {
      type: Number,
      default: function () {
        return Number(((this.quantity || 0) * (this.averagePrice || 0)).toFixed(2));
      },
    },
    currentPrice: {
      type: Number,
      default: null,
    },
    marketValue: {
      type: Number,
      default: null,
    },
    unrealizedPnl: {
      type: Number,
      default: null,
    },
    unrealizedPnlPercent: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    snapshotTimestamp: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'broker_sync',
    },
  },
  {
    timestamps: true,
  }
);

SyncedHoldingSchema.index({ userId: 1, broker: 1, symbol: 1 });
SyncedHoldingSchema.index({ userId: 1, isin: 1 });

module.exports = mongoose.model('SyncedHolding', SyncedHoldingSchema);
