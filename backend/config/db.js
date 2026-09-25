const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;

function getConnectionState() {
  return mongoose.connection.readyState;
}

function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

const connectDB = async (retries = 3, delayMs = 2000) => {
  const uri = config.mongoUri;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (isConnected && mongoose.connection.readyState === 1) {
        console.log('[MongoDB] Already connected');
        return;
      }

      const conn = await mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });

      isConnected = true;
      console.log(`[MongoDB] Connected: ${conn.connection.host} (attempt ${attempt}/${retries})`);
      return;
    } catch (error) {
      console.warn(`[MongoDB] Connection attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  if (!isConnected) {
    console.error('[MongoDB] All connection attempts failed. Server will continue but DB operations will fail.');
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('[MongoDB] Connection established');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[MongoDB] Disconnected');
});

process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('[MongoDB] Connection closed due to app termination');
  process.exit(0);
});

module.exports = {
  connectDB,
  getConnectionState,
  isDbConnected,
};