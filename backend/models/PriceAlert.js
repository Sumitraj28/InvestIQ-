const mongoose = require('mongoose');

const PriceAlertSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
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
      default: '',
    },
    condition: {
      type: String,
      enum: ['ABOVE', 'BELOW', 'PERCENT_CHANGE'],
      required: true,
    },
    targetPrice: {
      type: Number,
      required: true,
    },
    thresholdPercent: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'TRIGGERED', 'DISABLED'],
      default: 'ACTIVE',
      index: true,
    },
    triggeredAt: {
      type: Date,
      default: null,
    },
    notificationMessage: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

PriceAlertSchema.index({ userId: 1, symbol: 1, status: 1 });

module.exports = mongoose.model('PriceAlert', PriceAlertSchema);
