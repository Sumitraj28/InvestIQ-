const mongoose = require('mongoose');

const InvestmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    stockSymbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    brokerName: {
      type: String,
      required: [true, 'Broker name is required'],
      trim: true,
      enum: ['Groww', 'Zerodha Kite', 'Angel One', 'Upstox', 'Other'],
      default: 'Groww',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity of shares is required'],
      min: [0.0001, 'Quantity must be greater than zero'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price per share is required'],
      min: [0, 'Purchase price cannot be negative'],
    },
    purchaseDate: {
      type: Date,
      required: [true, 'Purchase date is required'],
      default: Date.now,
    },
    exchange: {
      type: String,
      enum: ['NSE', 'BSE'],
      default: 'NSE',
      uppercase: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 1000,
    },
    totalInvestment: {
      type: Number,
      default: function () {
        return (this.quantity || 0) * (this.purchasePrice || 0);
      },
    },
    source: {
      type: String,
      enum: ['manual', 'broker_sync'],
      default: 'manual',
    },
    brokerOrderId: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate total investment
InvestmentSchema.pre('save', function (next) {
  if (this.quantity && this.purchasePrice !== undefined) {
    this.totalInvestment = Number((this.quantity * this.purchasePrice).toFixed(2));
  }
  next();
});

// Index to quickly query user holdings for a specific symbol
InvestmentSchema.index({ userId: 1, stockSymbol: 1 });
InvestmentSchema.index({ userId: 1, purchaseDate: -1 });

module.exports = mongoose.model('Investment', InvestmentSchema);
