const mongoose = require('mongoose');

const BrokerConnectionSchema = new mongoose.Schema(
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
      enum: ['zerodha', 'upstox', 'angelone', 'groww'],
      trim: true,
    },
    brokerDisplayName: {
      type: String,
      required: true,
    },
    externalAccountId: {
      type: String,
      default: null,
      trim: true,
    },
    accountMaskedId: {
      type: String,
      default: null,
    },
    connectionStatus: {
      type: String,
      enum: [
        'not_connected',
        'connecting',
        'connected',
        'syncing',
        'reauth_required',
        'expired',
        'temporarily_unavailable',
        'unsupported',
      ],
      default: 'not_connected',
      index: true,
    },
    encryptedAccessToken: {
      type: String,
      default: null,
    },
    encryptedRefreshToken: {
      type: String,
      default: null,
    },
    tokenExpiresAt: {
      type: Date,
      default: null,
    },
    lastSuccessfulSyncAt: {
      type: Date,
      default: null,
    },
    lastAttemptedSyncAt: {
      type: Date,
      default: null,
    },
    lastErrorMessage: {
      type: String,
      default: null,
    },
    scope: {
      type: [String],
      default: ['read:holdings', 'read:profile'],
    },
    consentGiven: {
      type: Boolean,
      default: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

BrokerConnectionSchema.index({ userId: 1, broker: 1 }, { unique: true });

// Ensure encrypted credentials are never serialized to JSON in responses
BrokerConnectionSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.encryptedAccessToken;
  delete obj.encryptedRefreshToken;
  return obj;
};

module.exports = mongoose.model('BrokerConnection', BrokerConnectionSchema);
