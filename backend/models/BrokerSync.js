const mongoose = require('mongoose');

const BrokerSyncSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    broker: {
      type: String,
      required: true,
      enum: ['groww', 'zerodha', 'angelone', 'upstox'],
      trim: true,
    },
    brokerDisplayName: {
      type: String,
      required: true,
      default: 'Groww',
    },
    status: {
      type: String,
      enum: ['connected', 'disconnected', 'syncing', 'error', 'pending_consent'],
      default: 'disconnected',
    },
    consentGiven: {
      type: Boolean,
      default: false,
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
    syncMessage: {
      type: String,
      default: 'Manual portfolio tracking active. Official OAuth authorization ready.',
    },
    accountMaskedId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

BrokerSyncSchema.index({ userId: 1, broker: 1 }, { unique: true });

module.exports = mongoose.model('BrokerSync', BrokerSyncSchema);
