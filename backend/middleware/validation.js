function validateTicker(req, res, next) {
  const { ticker } = req.params;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Ticker parameter is required',
      code: 'INVALID_TICKER',
      status: 400,
      requestId: req.id,
    });
  }

  const clean = ticker.trim().toUpperCase();
  const tickerPattern = /^[A-Z0-9&.-]+$/;

  if (!tickerPattern.test(clean)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker format. Only alphanumeric characters, &, ., and - are allowed.',
      code: 'INVALID_TICKER_FORMAT',
      status: 400,
      requestId: req.id,
    });
  }

  req.validatedTicker = clean;
  next();
}

function validateTickerBody(req, res, next) {
  const { ticker } = req.body;

  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Ticker is required in request body',
      code: 'INVALID_TICKER',
      status: 400,
      requestId: req.id,
    });
  }

  const clean = ticker.trim().toUpperCase();
  const tickerPattern = /^[A-Z0-9&.-]+$/;

  if (!tickerPattern.test(clean)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid ticker format',
      code: 'INVALID_TICKER_FORMAT',
      status: 400,
      requestId: req.id,
    });
  }

  req.validatedTicker = clean;
  next();
}

module.exports = {
  validateTicker,
  validateTickerBody,
};