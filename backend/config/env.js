const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/investiq',

  pythonDataServiceUrl: process.env.PYTHON_DATA_SERVICE_URL || 'http://localhost:8000',

  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  groww: {
    apiKey: process.env.GROWW_API_KEY || '',
    apiSecret: process.env.GROWW_API_SECRET || '',
  },

  cacheTtl: {
    nse: parseInt(process.env.NSE_CACHE_TTL_SECONDS || '900', 10) * 1000,
    ai: parseInt(process.env.AI_CACHE_TTL_SECONDS || '21600', 10) * 1000,
    history: parseInt(process.env.HISTORY_CACHE_TTL_SECONDS || '900', 10) * 1000,
  },

  timeouts: {
    request: parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10),
    pythonRequest: parseInt(process.env.PYTHON_REQUEST_TIMEOUT_MS || '30000', 10),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  isProduction: process.env.NODE_ENV === 'production',
};

module.exports = config;