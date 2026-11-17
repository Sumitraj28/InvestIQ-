const mongoose = require('mongoose');

const BrokerSyncJobSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    brokerConnectionId: {
      type: String,
      required: true,
      index: true,
    },
    broker: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    recordsProcessed: {
      type: Number,
      default: 0,
    },
    errorCode: {
      type: String,
      default: null,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('BrokerSyncJob', BrokerSyncJobSchema);
