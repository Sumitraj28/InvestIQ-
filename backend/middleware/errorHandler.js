const config = require('../config/env');

function errorHandler(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || req.id || 'unknown';

  console.error(`[Error] ${requestId} ${req.method} ${req.path}:`, {
    message: err.message,
    stack: config.isProduction ? undefined : err.stack,
    status: err.status || err.statusCode || 500,
  });

  const status = err.status || err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = config.isProduction && status === 500
    ? 'An unexpected server error occurred.'
    : err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    error: message,
    code,
    status,
    requestId,
  });
}

module.exports = errorHandler;