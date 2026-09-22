const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables before importing modules that read process.env
dotenv.config();

const connectDB = require('./config/db');
const stockRoutes = require('./routes/stockRoutes');

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'StockSense Backend',
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/stocks', stockRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Port configuration
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`[StockSense] Server running on http://${HOST}:${PORT}`);
});
