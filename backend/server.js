const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const config = require('./config/env');
const { connectDB, isDbConnected } = require('./config/db');
const stockRoutes = require('./routes/stockRoutes');
const healthRoutes = require('./routes/healthRoutes');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

const createApp = () => {
  const app = express();

  connectDB();

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  }));

  const corsOptions = {
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
  app.use(cors(corsOptions));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(requestLogger);

  app.use('/api', healthRoutes);
  app.use('/api/stocks', stockRoutes);

  app.get('/api/version', (req, res) => {
    res.json({
      version: '1.0.0',
      name: 'InvestIQ Backend',
      timestamp: new Date().toISOString(),
    });
  });

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

const app = createApp();

const PORT = config.port;
const HOST = config.host;

let server;

if (require.main === module) {
  server = app.listen(PORT, HOST, () => {
    console.log(`[InvestIQ] Server running on http://${HOST}:${PORT}`);
    console.log(`[InvestIQ] Environment: ${config.nodeEnv}`);
    console.log(`[InvestIQ] Frontend URL: ${config.frontendUrl}`);
    console.log(`[InvestIQ] Python Service: ${config.pythonDataServiceUrl}`);
  });

  process.on('SIGTERM', () => {
    console.log('[InvestIQ] SIGTERM received, shutting down gracefully');
    if (server) {
      server.close(() => {
        console.log('[InvestIQ] Process terminated');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}

module.exports = { app, createApp };