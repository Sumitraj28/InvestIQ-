function notFound(req, res) {
  const requestId = req.headers['x-request-id'] || req.id || 'unknown';

  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.path}`,
    code: 'NOT_FOUND',
    status: 404,
    requestId,
  });
}

module.exports = notFound;