const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const config = require('../config/env');

const PYTHON_SERVICE_URL = config.pythonDataServiceUrl;

async function checkPythonService() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return response.ok;
  } catch {
    return false;
  }
}

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'InvestIQ Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

router.get('/ready', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbConnected = dbState === 1;

  const pythonReachable = await checkPythonService();

  const ready = dbConnected;

  const status = ready ? 200 : 503;

  res.status(status).json({
    status: ready ? 'ready' : 'not ready',
    database: dbConnected ? 'connected' : 'disconnected',
    pythonService: pythonReachable ? 'reachable' : 'unreachable',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;