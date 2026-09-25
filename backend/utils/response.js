function successResponse(data, meta = {}) {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

function errorResponse(message, code = 'ERROR', status = 500, requestId = null) {
  const response = {
    success: false,
    error: message,
    code,
    status,
  };
  if (requestId) response.requestId = requestId;
  return response;
}

function paginatedResponse(data, pagination, meta = {}) {
  return {
    success: true,
    data,
    pagination,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
};