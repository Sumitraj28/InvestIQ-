const { EventEmitter } = require('events');
const { getMarketStatus } = require('./marketHours');
const {
  fetchQuoteFromPythonService,
  fetchStockFromPythonService,
} = require('../pythonDataService');
const {
  normalizeSymbol,
  resolveExchange,
  toUpstoxInstrumentKey,
  getInstrumentMetadata,
  INDEX_DIRECTORY,
} = require('./symbolMapping');
const { upstoxMarketDataAdapter } = require('../brokers/upstoxMarketDataAdapter');
const { growwMarketDataAdapter } = require('../brokers/growwMarketDataAdapter');

class MarketDataEngine extends EventEmitter {
  constructor() {
    super();
    // In-memory quote cache: symbol -> normalized quote object
    this.quoteCache = new Map();
    // In-memory index quote cache
    this.indexCache = new Map();
    // TTL: 5 seconds during market hours, 60 seconds after market hours
    this.MARKET_OPEN_TTL_MS = 5 * 1000;
    this.MARKET_CLOSED_TTL_MS = 60 * 1000;
  }

  /**
   * Determine data freshness based on source and market status
   */
  resolveDataFreshness(source, marketStatus) {
    if (source === 'stale-cache') {
      return 'STALE';
    }
    if (source === 'unavailable' || source === 'none') {
      return 'UNAVAILABLE';
    }
    if (!marketStatus.isTrading) {
      return 'MARKET_CLOSED';
    }
    if (source === 'groww' || source === 'groww-stream' || source === 'upstox' || source === 'upstox-stream') {
      return 'LIVE';
    }
    if (source === 'yfinance' || source === 'python-service') {
      return 'DELAYED'; // Free yfinance exchange feed is 15-min delayed
    }
    return 'DELAYED';
  }

  /**
   * Normalize an incoming raw quote into the application-wide standard schema
   */
  normalizeQuote(data, source = 'yfinance') {
    const symbol = normalizeSymbol(data.symbol || data.ticker);
    const meta = getInstrumentMetadata(symbol) || {};
    const exchange = data.exchange || meta.exchange || resolveExchange(symbol);
    const instrumentKey = data.instrumentKey || toUpstoxInstrumentKey(symbol);
    const marketStatus = getMarketStatus();

    const lastPrice = data.lastPrice !== undefined && data.lastPrice !== null
      ? Number(Number(data.lastPrice).toFixed(2))
      : null;

    let previousClose = data.previousClose !== undefined && data.previousClose !== null
      ? Number(Number(data.previousClose).toFixed(2))
      : null;

    let change = null;
    let changePercent = null;

    if (lastPrice !== null) {
      if (previousClose === null && data.dayChangePercent !== undefined && data.dayChangePercent !== null) {
        previousClose = Number((lastPrice / (1 + data.dayChangePercent / 100)).toFixed(2));
      }

      if (previousClose !== null) {
        // Price Change = Last Traded Price - Previous Close
        change = Number((lastPrice - previousClose).toFixed(2));
        // Percentage Change = (Price Change / Previous Close) * 100
        changePercent = previousClose > 0
          ? Number(((change / previousClose) * 100).toFixed(2))
          : 0;
      }
    }

    const dataFreshness = this.resolveDataFreshness(source, marketStatus);
    const dataStatus = dataFreshness.toLowerCase();

    return {
      symbol,
      companyName: data.name || data.companyName || meta.companyName || meta.name || `${symbol} Limited`,
      exchange,
      instrumentKey,
      lastPrice,
      previousClose,
      change,
      dayChange: change,
      changePercent,
      dayChangePercent: changePercent,
      open: data.open !== undefined && data.open !== null ? Number(Number(data.open).toFixed(2)) : null,
      dayHigh: data.dayHigh !== undefined && data.dayHigh !== null ? Number(Number(data.dayHigh).toFixed(2)) : null,
      dayLow: data.dayLow !== undefined && data.dayLow !== null ? Number(Number(data.dayLow).toFixed(2)) : null,
      volume: data.volume !== undefined && data.volume !== null ? Number(data.volume) : null,
      week52High: data.week52High ? Number(Number(data.week52High).toFixed(2)) : null,
      week52Low: data.week52Low ? Number(Number(data.week52Low).toFixed(2)) : null,
      marketCap: data.marketCap ? Number(data.marketCap) : null,
      peRatio: data.peRatio ? Number(data.peRatio) : null,
      marketStatus,
      dataFreshness,
      dataStatus,
      timestamp: new Date().toISOString(),
      quoteTimestamp: data.quoteTimestamp || (lastPrice !== null ? new Date().toISOString() : null),
      dataSource: source,
      provider: source,
      _fetchedAt: Date.now(),
    };
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

    if (cached && now - cached._fetchedAt < ttl && cached.lastPrice !== null) {
      return cached;
    }

    // 1. Primary: Official Groww Trading API (if credentials active)
    if (growwMarketDataAdapter.hasCredentials() && !growwMarketDataAdapter.isTokenExpired()) {
      try {
        const growwRes = await growwMarketDataAdapter.getFullQuote(symbol);
        if (growwRes.success && growwRes.quote && growwRes.quote.lastPrice !== null) {
          const normalized = this.normalizeQuote(growwRes.quote, 'groww');
          this.quoteCache.set(symbol, normalized);
          this.emit('quote', normalized);
          return normalized;
        }
      } catch (growwErr) {
        console.warn(`[MarketDataEngine] Groww quote attempt notice for ${symbol}:`, growwErr.message);
      }
    }

    // 2. Secondary: Official Upstox Market Data API (if credentials active)
    if (upstoxMarketDataAdapter.hasCredentials() && !upstoxMarketDataAdapter.isTokenExpired()) {
      try {
        const upstoxRes = await upstoxMarketDataAdapter.getFullQuote([symbol]);
        if (upstoxRes.success && upstoxRes.quotes && upstoxRes.quotes[symbol]) {
          const upstoxQuote = upstoxRes.quotes[symbol];
          const normalized = this.normalizeQuote(upstoxQuote, 'upstox');
          this.quoteCache.set(symbol, normalized);
          this.emit('quote', normalized);
          return normalized;
        }
      } catch (upstoxErr) {
        console.warn(`[MarketDataEngine] Upstox quote attempt notice for ${symbol}:`, upstoxErr.message);
      }
    }

    // 3. Tertiary: Authorized Python Market Data Service (yfinance fast_info / LTP)
    try {
      const quoteData = await fetchQuoteFromPythonService(symbol);
      if (quoteData && quoteData.lastPrice !== null && !isNaN(quoteData.lastPrice)) {
        const normalized = this.normalizeQuote(quoteData, 'yfinance');
        this.quoteCache.set(symbol, normalized);
        this.emit('quote', normalized);
        return normalized;
      }
    } catch (pyErr) {
      // Python data service unavailable or offline
    }

    // 3. Tertiary: Full profile fetcher fallback
    try {
      const stockData = await fetchStockFromPythonService(symbol);
      if (stockData && stockData.lastPrice !== null && !isNaN(stockData.lastPrice)) {
        const normalized = this.normalizeQuote(stockData, 'yfinance');
        this.quoteCache.set(symbol, normalized);
        this.emit('quote', normalized);
        return normalized;
      }
    } catch (fullErr) {
      // Continue to stale cache check
    }

    // 4. Stale cache fallback: If previous quote was cached and verified, serve as STALE
    if (cached && cached.lastPrice !== null) {
      const staleQuote = {
        ...cached,
        dataFreshness: 'STALE',
        dataStatus: 'stale',
        dataSource: 'stale-cache',
        _fetchedAt: now,
      };
      this.quoteCache.set(symbol, staleQuote);
      return staleQuote;
    }

    // 5. Explicit UNAVAILABLE state — Never fabricate fake stock prices
    const meta = getInstrumentMetadata(symbol) || {};
    const unavailableQuote = {
      symbol,
      companyName: meta.companyName || meta.name || `${symbol} Limited`,
      exchange: meta.exchange || resolveExchange(symbol),
      instrumentKey: toUpstoxInstrumentKey(symbol),
      lastPrice: null,
      previousClose: null,
      change: null,
      dayChange: null,
      changePercent: null,
      dayChangePercent: null,
      open: null,
      dayHigh: null,
      dayLow: null,
      volume: null,
      week52High: null,
      week52Low: null,
      marketCap: null,
      peRatio: null,
      marketStatus,
      dataFreshness: 'UNAVAILABLE',
      dataStatus: 'unavailable',
      timestamp: new Date().toISOString(),
      quoteTimestamp: null,
      dataSource: 'none',
      provider: 'none',
      _fetchedAt: now,
    };

    this.quoteCache.set(symbol, unavailableQuote);
    return unavailableQuote;
  }

  /**
   * Ingest an official broker/vendor tick
   */
  ingestTick(tick) {
    if (!tick || !tick.symbol) return null;
    const symbol = normalizeSymbol(tick.symbol);
    const existing = this.quoteCache.get(symbol) || {};
    const marketStatus = getMarketStatus();

    const lastPrice = Number(tick.lastPrice || tick.ltp || existing.lastPrice || 0);
    const previousClose = Number(tick.previousClose || existing.previousClose || lastPrice);
    const change = Number((lastPrice - previousClose).toFixed(2));
    const dayChangePercent = previousClose > 0
      ? Number(((change / previousClose) * 100).toFixed(2))
      : 0;

    const updatedQuote = {
      ...existing,
      symbol,
      companyName: tick.companyName || existing.companyName || `${symbol} Limited`,
      exchange: tick.exchange || existing.exchange || resolveExchange(symbol),
      instrumentKey: tick.instrumentKey || existing.instrumentKey || toUpstoxInstrumentKey(symbol),
      lastPrice,
      previousClose,
      change,
      dayChange: change,
      changePercent: dayChangePercent,
      dayChangePercent,
      open: Number(tick.open || existing.open || lastPrice),
      dayHigh: Math.max(Number(tick.dayHigh || tick.high || lastPrice), Number(existing.dayHigh || lastPrice)),
      dayLow: Math.min(Number(tick.dayLow || tick.low || lastPrice), Number(existing.dayLow || lastPrice)),
      volume: Number(tick.volume || existing.volume || 0),
      marketStatus,
      dataFreshness: 'LIVE',
      dataStatus: 'live',
      timestamp: new Date().toISOString(),
      quoteTimestamp: tick.timestamp || new Date().toISOString(),
      dataSource: tick.source || 'broker-stream',
      provider: tick.provider || 'upstox',
      _fetchedAt: Date.now(),
    };

    this.quoteCache.set(symbol, updatedQuote);
    this.emit('quote', updatedQuote);
    return updatedQuote;
  }

  /**
   * Get cached quote if present
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
          const sym = normalizeSymbol(s);
          results[sym] = await this.getQuote(s);
        } catch {
          // Fail gracefully per symbol
        }
      })
    );
    return results;
  }

  /**
   * Retrieve genuine Indian benchmark index quotes (NIFTY 50, SENSEX, BANK NIFTY)
   * Never serves hardcoded static values
   */
  async getIndexQuotes() {
    const now = Date.now();
    const marketStatus = getMarketStatus();
    const ttl = marketStatus.isTrading ? this.MARKET_OPEN_TTL_MS : this.MARKET_CLOSED_TTL_MS;

    const targets = [
      { name: 'NIFTY 50', symbol: '^NSEI', upstoxKey: 'NSE_INDEX|Nifty 50', fallbackRef: 24150.25 },
      { name: 'SENSEX', symbol: '^BSESN', upstoxKey: 'BSE_INDEX|SENSEX', fallbackRef: 79480.1 },
      { name: 'BANK NIFTY', symbol: '^NSEBANK', upstoxKey: 'NSE_INDEX|Nifty Bank', fallbackRef: 51200.4 },
    ];

    const results = [];

    for (const target of targets) {
      const cached = this.indexCache.get(target.symbol);
      if (cached && now - cached._fetchedAt < ttl && cached.lastPrice !== null) {
        results.push(cached);
        continue;
      }

      let quote = null;

      // 1. Try Groww if credentials configured
      if (growwMarketDataAdapter.hasCredentials() && !growwMarketDataAdapter.isTokenExpired()) {
        try {
          const growwRes = await growwMarketDataAdapter.getFullQuote(target.name);
          if (growwRes.success && growwRes.quote && growwRes.quote.lastPrice !== null) {
            quote = {
              name: target.name,
              symbol: target.symbol,
              instrumentKey: target.upstoxKey,
              lastPrice: growwRes.quote.lastPrice,
              previousClose: growwRes.quote.previousClose,
              change: growwRes.quote.change,
              percentChange: growwRes.quote.changePercent,
              open: growwRes.quote.open,
              dayHigh: growwRes.quote.dayHigh,
              dayLow: growwRes.quote.dayLow,
              dataFreshness: 'LIVE',
              dataStatus: 'live',
              quoteTimestamp: growwRes.quote.providerTimestamp,
              dataSource: 'groww',
              _fetchedAt: now,
            };
          }
        } catch (e) {
          // Continue to Upstox
        }
      }

      // 2. Try Upstox if credentials configured
      if (!quote && upstoxMarketDataAdapter.hasCredentials() && !upstoxMarketDataAdapter.isTokenExpired()) {
        try {
          const upRes = await upstoxMarketDataAdapter.getFullQuote([target.upstoxKey]);
          if (upRes.success && upRes.quotes) {
            const match = Object.values(upRes.quotes)[0];
            if (match && match.lastPrice) {
              quote = {
                name: target.name,
                symbol: target.symbol,
                instrumentKey: target.upstoxKey,
                lastPrice: match.lastPrice,
                previousClose: match.previousClose,
                change: match.change,
                percentChange: match.changePercent,
                open: match.open,
                dayHigh: match.dayHigh,
                dayLow: match.dayLow,
                dataFreshness: 'LIVE',
                dataStatus: 'live',
                quoteTimestamp: match.providerTimestamp,
                dataSource: 'upstox',
                _fetchedAt: now,
              };
            }
          }
        } catch (e) {
          // Continue to fallback
        }
      }

      // 2. Try Python market data service
      if (!quote) {
        try {
          const pyQuote = await fetchQuoteFromPythonService(target.symbol);
          if (pyQuote && pyQuote.lastPrice !== null && !isNaN(pyQuote.lastPrice)) {
            quote = {
              name: target.name,
              symbol: target.symbol,
              instrumentKey: target.upstoxKey,
              lastPrice: pyQuote.lastPrice,
              previousClose: pyQuote.previousClose,
              change: pyQuote.dayChange,
              dayChange: pyQuote.dayChange,
              changePercent: pyQuote.dayChangePercent,
              dayChangePercent: pyQuote.dayChangePercent,
              percentChange: pyQuote.dayChangePercent,
              open: pyQuote.open,
              dayHigh: pyQuote.dayHigh,
              dayLow: pyQuote.dayLow,
              dataFreshness: pyQuote.dataFreshness || 'DELAYED',
              dataStatus: (pyQuote.dataFreshness || 'DELAYED').toLowerCase(),
              quoteTimestamp: pyQuote.quoteTimestamp,
              dataSource: 'yfinance',
              _fetchedAt: now,
            };
          }
        } catch (e) {
          // Service offline or error
        }
      }

      // 3. Stale cache fallback
      if (!quote && cached && cached.lastPrice !== null) {
        quote = {
          ...cached,
          dataFreshness: 'STALE',
          dataStatus: 'stale',
          _fetchedAt: now,
        };
      }

      // 4. Unavailable state if cannot be resolved
      if (!quote) {
        quote = {
          name: target.name,
          symbol: target.symbol,
          instrumentKey: target.upstoxKey,
          lastPrice: null,
          previousClose: null,
          change: null,
          percentChange: null,
          open: null,
          dayHigh: null,
          dayLow: null,
          dataFreshness: 'UNAVAILABLE',
          dataStatus: 'unavailable',
          quoteTimestamp: null,
          dataSource: 'none',
          _fetchedAt: now,
        };
      }

      this.indexCache.set(target.symbol, quote);
      results.push(quote);
    }

    return results;
  }
}

// Export singleton instance
const marketDataEngine = new MarketDataEngine();

module.exports = marketDataEngine;
