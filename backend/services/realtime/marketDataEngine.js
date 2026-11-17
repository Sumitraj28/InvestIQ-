const { EventEmitter } = require('events');
const { getMarketStatus } = require('./marketHours');
const { fetchStockFromPythonService, normalizeSymbol } = require('../pythonDataService');
const { buildOfflineStockData } = require('../nseService');

class MarketDataEngine extends EventEmitter {
  constructor() {
    super();
    // In-memory quote cache: symbol -> quote object
    this.quoteCache = new Map();
    // Cache TTL: 5 seconds during market hours, 5 minutes after market hours
    this.MARKET_OPEN_TTL_MS = 5 * 1000;
    this.MARKET_CLOSED_TTL_MS = 5 * 60 * 1000;
  }

  /**
   * Determine data freshness based on source and market status
   */
  resolveDataFreshness(source, marketStatus) {
    if (source === 'offline-profile' || source === 'stale-cache') {
      return 'OFFLINE_SNAPSHOT';
    }
    if (!marketStatus.isTrading) {
      return 'MARKET_CLOSED';
    }
    if (source === 'yfinance' || source === 'python-service') {
      return 'DELAYED'; // yfinance for Indian equities is 15-min delayed per NSE vendor terms
    }
    if (source === 'nse-live' || source === 'broker-stream') {
      return 'LIVE';
    }
    return 'DELAYED';
  }

  /**
   * Retrieve normalized real-time quote for a symbol
   */
  async getQuote(rawSymbol) {
    const symbol = normalizeSymbol(rawSymbol);
    const now = Date.now();
    const marketStatus = getMarketStatus();

    const ttl = marketStatus.isTrading ? this.MARKET_OPEN_TTL_MS : this.MARKET_CLOSED_TTL_MS;
    const cached = this.quoteCache.get(symbol);

    if (cached && now - cached._fetchedAt < ttl) {
      return cached;
    }

    let rawData = null;
    let source = 'offline-profile';

    // 1. Attempt to fetch from Python data service
    try {
      rawData = await fetchStockFromPythonService(symbol);
      source = 'yfinance';
    } catch (pyErr) {
      // 2. Fallback to rich offline profile
      rawData = buildOfflineStockData(symbol);
      source = 'offline-profile';
    }

    const lastPrice = Number(rawData.lastPrice || 0);
    const dayChangePercent = Number(rawData.dayChangePercent || 0);
    const previousClose = lastPrice / (1 + dayChangePercent / 100);
    const change = Number((lastPrice - previousClose).toFixed(2));

    const quote = {
      symbol,
      companyName: rawData.name || `${symbol} Limited`,
      exchange: 'NSE',
      lastPrice,
      change,
      dayChange: change,
      dayChangePercent: Number(dayChangePercent.toFixed(2)),
      open: Number(rawData.open || (lastPrice * 0.995).toFixed(2)),
      dayHigh: Number(rawData.dayHigh || rawData.high || (lastPrice * 1.01).toFixed(2)),
      dayLow: Number(rawData.dayLow || rawData.low || (lastPrice * 0.99).toFixed(2)),
      previousClose: Number(previousClose.toFixed(2)),
      volume: Number(rawData.volume || 1250000),
      week52High: Number(rawData.week52High || (lastPrice * 1.25).toFixed(2)),
      week52Low: Number(rawData.week52Low || (lastPrice * 0.75).toFixed(2)),
      marketCap: Number(rawData.marketCap || 0),
      peRatio: Number(rawData.peRatio || 0),
      marketStatus,
      dataFreshness: this.resolveDataFreshness(source, marketStatus),
      timestamp: new Date().toISOString(),
      quoteTimestamp: new Date().toISOString(),
      dataSource: source,
      _fetchedAt: now,
    };

    this.quoteCache.set(symbol, quote);
    this.emit('quote', quote);
    return quote;
  }

  /**
   * Ingest an official broker/vendor tick
   */
  ingestTick(tick) {
    if (!tick || !tick.symbol) return;
    const symbol = normalizeSymbol(tick.symbol);
    const existing = this.quoteCache.get(symbol) || {};
    const marketStatus = getMarketStatus();

    const lastPrice = Number(tick.lastPrice || tick.ltp || existing.lastPrice || 0);
    const prevClose = Number(existing.previousClose || lastPrice);
    const change = Number((lastPrice - prevClose).toFixed(2));
    const dayChangePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

    const updatedQuote = {
      ...existing,
      symbol,
      companyName: tick.companyName || existing.companyName || `${symbol} Limited`,
      exchange: tick.exchange || existing.exchange || 'NSE',
      lastPrice,
      change,
      dayChangePercent,
      open: Number(tick.open || existing.open || lastPrice),
      dayHigh: Math.max(Number(tick.high || lastPrice), Number(existing.dayHigh || lastPrice)),
      dayLow: Math.min(Number(tick.low || lastPrice), Number(existing.dayLow || lastPrice)),
      previousClose: prevClose,
      volume: Number(tick.volume || existing.volume || 0),
      marketStatus,
      dataFreshness: 'LIVE',
      timestamp: new Date().toISOString(),
      dataSource: 'broker-stream',
      _fetchedAt: Date.now(),
    };

    this.quoteCache.set(symbol, updatedQuote);
    this.emit('quote', updatedQuote);
    return updatedQuote;
  }

  /**
   * Get cached quote if present without refetching
   */
  getCachedQuote(rawSymbol) {
    const symbol = normalizeSymbol(rawSymbol);
    return this.quoteCache.get(symbol) || null;
  }

  /**
   * Batch get quotes for multiple symbols
   */
  async getQuotes(symbols = []) {
    const results = {};
    await Promise.all(
      symbols.map(async (s) => {
        try {
          results[normalizeSymbol(s)] = await this.getQuote(s);
        } catch {
          // Keep null on failure
        }
      })
    );
    return results;
  }
}

// Export singleton instance
const marketDataEngine = new MarketDataEngine();

module.exports = marketDataEngine;
