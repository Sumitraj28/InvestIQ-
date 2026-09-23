const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stocksense';
  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB] Primary connection error: ${error.message}`);
    if (primaryUri !== 'mongodb://127.0.0.1:27017/stocksense') {
      try {
        console.log('[MongoDB] Attempting fallback to local MongoDB (mongodb://127.0.0.1:27017/stocksense)...');
        const fallbackConn = await mongoose.connect('mongodb://127.0.0.1:27017/stocksense');
        console.log(`[MongoDB] Connected to local fallback: ${fallbackConn.connection.host}`);
        return;
      } catch (fallbackError) {
        console.error(`[MongoDB] Local fallback also failed: ${fallbackError.message}`);
      }
    }
  }
};

module.exports = connectDB;
