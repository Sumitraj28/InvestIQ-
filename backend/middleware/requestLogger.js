function requestLogger(req, res, next) {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || Math.random().toString(36).substring(2, 10);
  req.id = requestId;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(
      `[${new Date().toISOString()}] ${requestId} ${req.method} ${req.path} ${statusColor}${res.statusCode}${reset} ${duration}ms`
    );
  });

  next();
}

module.exports = requestLogger;