/**
 * symbolMapping.js
 * Centralized Indian Equity & Index Symbol Mapping Service
 * 
 * Maps between:
 * - NSE / BSE Ticker Symbols (e.g. RELIANCE, TCS.NS)
 * - National Securities Depository Limited ISINs (e.g. INE002A01018)
 * - Official Upstox Market Data Instrument Keys (e.g. NSE_EQ|INE002A01018, NSE_INDEX|Nifty 50)
 */

const INSTRUMENT_DIRECTORY = {
  RELIANCE: {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries Limited',
    exchange: 'NSE',
    isin: 'INE002A01018',
    upstoxKey: 'NSE_EQ|INE002A01018',
    yfTicker: 'RELIANCE.NS',
  },
  TCS: {
    symbol: 'TCS',
    companyName: 'Tata Consultancy Services Limited',
    exchange: 'NSE',
    isin: 'INE467B01029',
    upstoxKey: 'NSE_EQ|INE467B01029',
    yfTicker: 'TCS.NS',
  },
  INFY: {
    symbol: 'INFY',
    companyName: 'Infosys Limited',
    exchange: 'NSE',
    isin: 'INE009A01021',
    upstoxKey: 'NSE_EQ|INE009A01021',
    yfTicker: 'INFY.NS',
  },
  HDFCBANK: {
    symbol: 'HDFCBANK',
    companyName: 'HDFC Bank Limited',
    exchange: 'NSE',
    isin: 'INE040A01034',
    upstoxKey: 'NSE_EQ|INE040A01034',
    yfTicker: 'HDFCBANK.NS',
  },
  ICICIBANK: {
    symbol: 'ICICIBANK',
    companyName: 'ICICI Bank Limited',
    exchange: 'NSE',
    isin: 'INE090A01021',
    upstoxKey: 'NSE_EQ|INE090A01021',
    yfTicker: 'ICICIBANK.NS',
  },
  SBIN: {
    symbol: 'SBIN',
    companyName: 'State Bank of India',
    exchange: 'NSE',
    isin: 'INE062A01020',
    upstoxKey: 'NSE_EQ|INE062A01020',
    yfTicker: 'SBIN.NS',
  },
  ITC: {
    symbol: 'ITC',
    companyName: 'ITC Limited',
    exchange: 'NSE',
    isin: 'INE154A01025',
    upstoxKey: 'NSE_EQ|INE154A01025',
    yfTicker: 'ITC.NS',
  },
  BHARTIARTL: {
    symbol: 'BHARTIARTL',
    companyName: 'Bharti Airtel Limited',
    exchange: 'NSE',
    isin: 'INE397D01024',
    upstoxKey: 'NSE_EQ|INE397D01024',
    yfTicker: 'BHARTIARTL.NS',
  },
  LT: {
    symbol: 'LT',
    companyName: 'Larsen & Toubro Limited',
    exchange: 'NSE',
    isin: 'INE018A01030',
    upstoxKey: 'NSE_EQ|INE018A01030',
    yfTicker: 'LT.NS',
  },
  KOTAKBANK: {
    symbol: 'KOTAKBANK',
    companyName: 'Kotak Mahindra Bank Limited',
    exchange: 'NSE',
    isin: 'INE237A01028',
    upstoxKey: 'NSE_EQ|INE237A01028',
    yfTicker: 'KOTAKBANK.NS',
  },
  AXISBANK: {
    symbol: 'AXISBANK',
    companyName: 'Axis Bank Limited',
    exchange: 'NSE',
    isin: 'INE238A01034',
    upstoxKey: 'NSE_EQ|INE238A01034',
    yfTicker: 'AXISBANK.NS',
  },
  WIPRO: {
    symbol: 'WIPRO',
    companyName: 'Wipro Limited',
    exchange: 'NSE',
    isin: 'INE075A01022',
    upstoxKey: 'NSE_EQ|INE075A01022',
    yfTicker: 'WIPRO.NS',
  },
  MARUTI: {
    symbol: 'MARUTI',
    companyName: 'Maruti Suzuki India Limited',
    exchange: 'NSE',
    isin: 'INE585B01010',
    upstoxKey: 'NSE_EQ|INE585B01010',
    yfTicker: 'MARUTI.NS',
  },
  BAJFINANCE: {
    symbol: 'BAJFINANCE',
    companyName: 'Bajaj Finance Limited',
    exchange: 'NSE',
    isin: 'INE296A01024',
    upstoxKey: 'NSE_EQ|INE296A01024',
    yfTicker: 'BAJFINANCE.NS',
  },
  TATAMOTORS: {
    symbol: 'TATAMOTORS',
    companyName: 'Tata Motors Limited',
    exchange: 'NSE',
    isin: 'INE155A01022',
    upstoxKey: 'NSE_EQ|INE155A01022',
    yfTicker: 'TATAMOTORS.NS',
  },
  TATASTEEL: {
    symbol: 'TATASTEEL',
    companyName: 'Tata Steel Limited',
    exchange: 'NSE',
    isin: 'INE081A01020',
    upstoxKey: 'NSE_EQ|INE081A01020',
    yfTicker: 'TATASTEEL.NS',
  },
  SUNPHARMA: {
    symbol: 'SUNPHARMA',
    companyName: 'Sun Pharmaceutical Industries Limited',
    exchange: 'NSE',
    isin: 'INE044A01036',
    upstoxKey: 'NSE_EQ|INE044A01036',
    yfTicker: 'SUNPHARMA.NS',
  },
  CIPLA: {
    symbol: 'CIPLA',
    companyName: 'Cipla Limited',
    exchange: 'NSE',
    isin: 'INE059A01026',
    upstoxKey: 'NSE_EQ|INE059A01026',
    yfTicker: 'CIPLA.NS',
  },
  ASIANPAINT: {
    symbol: 'ASIANPAINT',
    companyName: 'Asian Paints Limited',
    exchange: 'NSE',
    isin: 'INE021A01026',
    upstoxKey: 'NSE_EQ|INE021A01026',
    yfTicker: 'ASIANPAINT.NS',
  },
  JIOFIN: {
    symbol: 'JIOFIN',
    companyName: 'Jio Financial Services Limited',
    exchange: 'NSE',
    isin: 'INE752E01010',
    upstoxKey: 'NSE_EQ|INE752E01010',
    yfTicker: 'JIOFIN.NS',
  },
  TITAN: {
    symbol: 'TITAN',
    companyName: 'Titan Company Limited',
    exchange: 'NSE',
    isin: 'INE280A01028',
    upstoxKey: 'NSE_EQ|INE280A01028',
    yfTicker: 'TITAN.NS',
  },
};

// Benchmark Indices
const INDEX_DIRECTORY = {
  '^NSEI': {
    symbol: '^NSEI',
    name: 'NIFTY 50',
    exchange: 'NSE',
    upstoxKey: 'NSE_INDEX|Nifty 50',
    yfTicker: '^NSEI',
  },
  'NIFTY 50': {
    symbol: '^NSEI',
    name: 'NIFTY 50',
    exchange: 'NSE',
    upstoxKey: 'NSE_INDEX|Nifty 50',
    yfTicker: '^NSEI',
  },
  '^BSESN': {
    symbol: '^BSESN',
    name: 'SENSEX',
    exchange: 'BSE',
    upstoxKey: 'BSE_INDEX|SENSEX',
    yfTicker: '^BSESN',
  },
  SENSEX: {
    symbol: '^BSESN',
    name: 'SENSEX',
    exchange: 'BSE',
    upstoxKey: 'BSE_INDEX|SENSEX',
    yfTicker: '^BSESN',
  },
  '^NSEBANK': {
    symbol: '^NSEBANK',
    name: 'BANK NIFTY',
    exchange: 'NSE',
    upstoxKey: 'NSE_INDEX|Nifty Bank',
    yfTicker: '^NSEBANK',
  },
  'BANK NIFTY': {
    symbol: '^NSEBANK',
    name: 'BANK NIFTY',
    exchange: 'NSE',
    upstoxKey: 'NSE_INDEX|Nifty Bank',
    yfTicker: '^NSEBANK',
  },
};

/**
 * Clean a symbol string to standard uppercase ticker without suffix
 */
function normalizeSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return '';
  const clean = symbol.trim().toUpperCase();
  if (clean.startsWith('^')) return clean;
  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    return clean.slice(0, -3);
  }
  return clean;
}

/**
 * Determine exchange from ticker or instrument key
 */
function resolveExchange(raw) {
  if (!raw || typeof raw !== 'string') return 'NSE';
  const clean = raw.trim().toUpperCase();
  if (clean.endsWith('.BO') || clean.startsWith('BSE_') || clean === '^BSESN') {
    return 'BSE';
  }
  return 'NSE';
}

/**
 * Resolve an input to official Upstox instrument key
 */
function toUpstoxInstrumentKey(input) {
  if (!input || typeof input !== 'string') return null;
  const clean = input.trim();

  // Already an Upstox key (e.g. NSE_EQ|INE002A01018, NSE_INDEX|Nifty 50)
  if (clean.includes('|')) {
    return clean;
  }

  const upper = clean.toUpperCase();

  // Index check
  if (INDEX_DIRECTORY[upper]) {
    return INDEX_DIRECTORY[upper].upstoxKey;
  }

  const sym = normalizeSymbol(upper);
  if (INSTRUMENT_DIRECTORY[sym]) {
    return INSTRUMENT_DIRECTORY[sym].upstoxKey;
  }

  // Fallback to standard Upstox equity key format
  const exchange = resolveExchange(upper);
  return `${exchange}_EQ|${sym}`;
}

/**
 * Reverse-map Upstox instrument key to human-readable symbol
 */
function fromUpstoxInstrumentKey(instrumentKey) {
  if (!instrumentKey || typeof instrumentKey !== 'string') return null;
  const clean = instrumentKey.trim();

  // Reverse match against directory
  for (const entry of Object.values(INSTRUMENT_DIRECTORY)) {
    if (entry.upstoxKey === clean) {
      return entry.symbol;
    }
  }

  for (const entry of Object.values(INDEX_DIRECTORY)) {
    if (entry.upstoxKey === clean) {
      return entry.symbol;
    }
  }

  // Parse generic format like "NSE_EQ|RELIANCE"
  if (clean.includes('|')) {
    const parts = clean.split('|');
    return parts[1] || clean;
  }

  return clean;
}

/**
 * Get full instrument directory metadata
 */
function getInstrumentMetadata(symbol) {
  const clean = normalizeSymbol(symbol);
  return INSTRUMENT_DIRECTORY[clean] || INDEX_DIRECTORY[clean] || null;
}

module.exports = {
  INSTRUMENT_DIRECTORY,
  INDEX_DIRECTORY,
  normalizeSymbol,
  resolveExchange,
  toUpstoxInstrumentKey,
  fromUpstoxInstrumentKey,
  getInstrumentMetadata,
};
