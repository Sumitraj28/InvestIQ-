const mongoose = require('mongoose');

const ReconciliationRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    manualInvestmentId: {
      type: String,
      default: null,
      index: true,
    },
    syncedHoldingId: {
      type: String,
      default: null,
      index: true,
    },
    broker: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
    },
    matchStatus: {
      type: String,
      enum: ['auto_matched', 'user_linked', 'conflict_review', 'unmatched'],
      default: 'auto_matched',
      index: true,
    },
    manualQuantity: {
      type: Number,
      default: 0,
    },
    syncedQuantity: {
      type: Number,
      default: 0,
    },
    quantityDifference: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

ReconciliationRecordSchema.index({ userId: 1, symbol: 1, broker: 1 });

module.exports = mongoose.model('ReconciliationRecord', ReconciliationRecordSchema);
