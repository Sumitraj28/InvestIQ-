/**
 * Holdings Normalizer
 * Standardizes heterogeneous raw broker holdings into InvestIQ's unified SyncedHolding schema.
 */

// Well-known NSE companies mapping for trading symbols without company name in raw broker responses
const SYMBOL_COMPANY_NAMES = {
  RELIANCE: 'Reliance Industries Limited',
  TCS: 'Tata Consultancy Services Limited',
  INFY: 'Infosys Limited',
  HDFCBANK: 'HDFC Bank Limited',
  ICICIBANK: 'ICICI Bank Limited',
  SBIN: 'State Bank of India',
  ITC: 'ITC Limited',
  BHARTIARTL: 'Bharti Airtel Limited',
  LT: 'Larsen & Toubro Limited',
  HINDUNILVR: 'Hindustan Unilever Limited',
  TATAMOTORS: 'Tata Motors Limited',
  KOTAKBANK: 'Kotak Mahindra Bank Limited',
  AXISBANK: 'Axis Bank Limited',
  MARUTI: 'Maruti Suzuki India Limited',
  SUNPHARMA: 'Sun Pharmaceutical Industries Limited',
  TITAN: 'Titan Company Limited',
  BAJFINANCE: 'Bajaj Finance Limited',
  ASIANPAINT: 'Asian Paints Limited',
  WIPRO: 'Wipro Limited',
  ULTRACEMCO: 'UltraTech Cement Limited',
};

function resolveCompanyName(symbol, rawName) {
  if (rawName && typeof rawName === 'string' && rawName.trim().length > 1) {
    return rawName.trim();
  }
  const cleanSym = String(symbol || '').trim().toUpperCase();
  return SYMBOL_COMPANY_NAMES[cleanSym] || `${cleanSym} Limited`;
}

function normalizeZerodhaHolding(rawItem) {
  const symbol = String(rawItem.tradingsymbol || rawItem.symbol || '').trim().toUpperCase();
  const quantity = Number(rawItem.quantity || rawItem.t1_quantity || 0);
  const averagePrice = Number(rawItem.average_price || rawItem.avg_price || 0);
  const currentPrice = Number(rawItem.last_price || rawItem.close_price || averagePrice);
  const costBasis = Number((quantity * averagePrice).toFixed(2));
  const marketValue = Number((quantity * currentPrice).toFixed(2));
  const unrealizedPnl = Number((marketValue - costBasis).toFixed(2));
  const unrealizedPnlPercent = costBasis > 0 ? Number(((unrealizedPnl / costBasis) * 100).toFixed(2)) : 0;

  return {
    broker: 'zerodha',
    instrumentId: String(rawItem.instrument_token || rawItem.tradingsymbol || symbol),
    isin: rawItem.isin || null,
    exchange: (rawItem.exchange || 'NSE').toUpperCase(),
    symbol,
    companyName: resolveCompanyName(symbol, rawItem.company_name),
    quantity,
    averagePrice,
    costBasis,
    currentPrice,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    currency: 'INR',
    snapshotTimestamp: new Date(),
    source: 'broker_sync',
  };
}

function normalizeUpstoxHolding(rawItem) {
  const symbol = String(rawItem.trading_symbol || rawItem.symbol || '').trim().toUpperCase();
  const quantity = Number(rawItem.quantity || 0);
  const averagePrice = Number(rawItem.average_price || 0);
  const currentPrice = Number(rawItem.last_price || rawItem.close_price || averagePrice);
  const costBasis = Number((quantity * averagePrice).toFixed(2));
  const marketValue = Number((quantity * currentPrice).toFixed(2));
  const unrealizedPnl = Number((marketValue - costBasis).toFixed(2));
  const unrealizedPnlPercent = costBasis > 0 ? Number(((unrealizedPnl / costBasis) * 100).toFixed(2)) : 0;

  return {
    broker: 'upstox',
    instrumentId: String(rawItem.instrument_token || rawItem.isin || symbol),
    isin: rawItem.isin || null,
    exchange: (rawItem.exchange || 'NSE').toUpperCase(),
    symbol,
    companyName: resolveCompanyName(symbol, rawItem.company_name),
    quantity,
    averagePrice,
    costBasis,
    currentPrice,
    marketValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    currency: 'INR',
    snapshotTimestamp: new Date(),
    source: 'broker_sync',
  };
}

function normalizeHoldings(brokerId, rawHoldings) {
  if (!Array.isArray(rawHoldings)) return [];

  return rawHoldings
    .map((item) => {
      if (!item) return null;
      if (brokerId === 'zerodha') {
        return normalizeZerodhaHolding(item);
      }
      if (brokerId === 'upstox') {
        return normalizeUpstoxHolding(item);
      }
      // Generic broker fallback
      const symbol = String(item.symbol || item.tradingsymbol || item.trading_symbol || '').trim().toUpperCase();
      if (!symbol) return null;
      const quantity = Number(item.quantity || 0);
      const averagePrice = Number(item.averagePrice || item.average_price || 0);
      const currentPrice = Number(item.currentPrice || item.last_price || averagePrice);
      const costBasis = Number((quantity * averagePrice).toFixed(2));
      const marketValue = Number((quantity * currentPrice).toFixed(2));
      const unrealizedPnl = Number((marketValue - costBasis).toFixed(2));
      const unrealizedPnlPercent = costBasis > 0 ? Number(((unrealizedPnl / costBasis) * 100).toFixed(2)) : 0;

      return {
        broker: brokerId,
        instrumentId: String(item.instrumentId || item.isin || symbol),
        isin: item.isin || null,
        exchange: (item.exchange || 'NSE').toUpperCase(),
        symbol,
        companyName: resolveCompanyName(symbol, item.companyName || item.company_name),
        quantity,
        averagePrice,
        costBasis,
        currentPrice,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        currency: item.currency || 'INR',
        snapshotTimestamp: new Date(),
        source: 'broker_sync',
      };
    })
    .filter(Boolean);
}

module.exports = {
  normalizeHoldings,
  normalizeZerodhaHolding,
  normalizeUpstoxHolding,
  resolveCompanyName,
};
