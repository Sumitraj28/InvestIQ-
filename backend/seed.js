const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { syncTopStocks } = require('./services/nseService');

dotenv.config();

const seedLiveNseData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/stocksense';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB at', mongoUri);

    console.log('[Seed] Fetching real live Indian equities from NSE India...');
    const synced = await syncTopStocks();

    console.log(`[Seed] Live database seeding finished. ${synced.length} stocks populated directly from NSE.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding live NSE data:', error);
    process.exit(1);
  }
};

seedLiveNseData();
