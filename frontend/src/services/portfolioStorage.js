/**
 * InvestIQ Portfolio Storage Service (Phase 1)
 *
 * Provides client-side user-isolated storage for manual investment transactions,
 * weighted-average holding calculations, and seamless sync with backend persistence.
 *
 * User Isolation: Keys are scoped by Clerk user ID (`investiq_portfolio_${userId}`).
 */

const STORAGE_PREFIX = 'investiq_portfolio_';
const LEGACY_STORAGE_KEY = 'investiq_manual_investments';

/**
 * Get safe storage key for the current user
 * @param {string|null} userId Clerk user ID
 * @returns {string} Scoped localStorage key
 */
export function getStorageKey(userId) {
  if (!userId || typeof userId !== 'string') {
    return `${STORAGE_PREFIX}guest`;
  }
  return `${STORAGE_PREFIX}${userId.trim()}`;
}

/**
 * Generate a unique ID for an investment record
 * @returns {string}
 */
export function generateUniqueId() {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Normalize and validate a single transaction object according to Phase 1 data model
 * @param {Object} raw
 * @returns {Object}
 */
export function normalizeTransaction(raw) {
  const quantity = Math.max(1, Math.round(Number(raw.quantity) || 1));
  const purchasePrice = Math.max(0, Number(raw.purchasePrice) || 0);
  const transactionCharges = Math.max(0, Number(raw.transactionCharges) || 0);
  const purchaseValue = quantity * purchasePrice;
  const totalCost = purchaseValue + transactionCharges;

  return {
    id: raw.id || raw._id || generateUniqueId(),
    companyName: String(raw.companyName || 'Unknown Company').trim(),
    symbol: String(raw.symbol || raw.stockSymbol || 'STOCK').trim().toUpperCase(),
    exchange: String(raw.exchange || 'NSE').trim().toUpperCase(),
    broker: String(raw.broker || raw.brokerName || 'Groww').trim(),
    quantity,
    purchasePrice,
    transactionCharges,
    purchaseValue,
    totalCost,
    totalInvestment: totalCost, // Backward compatibility with backend model
    purchaseDate: raw.purchaseDate
      ? new Date(raw.purchaseDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    notes: String(raw.notes || '').trim(),
    transactionType: 'BUY',
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Retrieve all investments for a user from local storage
 * @param {string} userId
 * @returns {Array} List of transactions sorted newest first
 */
export function getInvestments(userId) {
  try {
    const key = getStorageKey(userId);
    let data = localStorage.getItem(key);

    // If no user-specific data yet, check for legacy un-scoped data to migrate
    if (!data && userId) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        try {
          const parsedLegacy = JSON.parse(legacy);
          if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
            localStorage.setItem(key, legacy);
            data = legacy;
          }
        } catch {
          // ignore corrupted legacy
        }
      }
    }

    if (!data) return [];
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeTransaction)
      .sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate) || new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('[portfolioStorage] getInvestments error:', err);
    return [];
  }
}

/**
 * Save investments array to user-scoped localStorage
 * @param {string} userId
 * @param {Array} list
 */
function saveInvestments(userId, list) {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.error('[portfolioStorage] saveInvestments error:', err);
  }
}

/**
 * Retrieve a single investment transaction by ID
 * @param {string} userId
 * @param {string} id
 * @returns {Object|null}
 */
export function getInvestmentById(userId, id) {
  const list = getInvestments(userId);
  return list.find((item) => item.id === id || item._id === id) || null;
}

/**
 * Add a new investment record for a user
 * @param {string} userId
 * @param {Object} item
 * @returns {Object} Newly created record
 */
export function addInvestment(userId, item) {
  const list = getInvestments(userId);
  const record = normalizeTransaction({
    ...item,
    id: item.id || generateUniqueId(),
    createdAt: new Date().toISOString(),
  });

  const updated = [record, ...list];
  saveInvestments(userId, updated);
  return record;
}

/**
 * Update an existing investment record
 * @param {string} userId
 * @param {string} id
 * @param {Object} updates
 * @returns {Object|null} Updated record
 */
export function updateInvestment(userId, id, updates) {
  const list = getInvestments(userId);
  const index = list.findIndex((item) => item.id === id || item._id === id);
  if (index === -1) return null;

  const existing = list[index];
  const updatedRecord = normalizeTransaction({
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  });

  list[index] = updatedRecord;
  saveInvestments(userId, list);
  return updatedRecord;
}

/**
 * Delete an investment record by ID
 * @param {string} userId
 * @param {string} id
 * @returns {boolean} Success
 */
export function deleteInvestment(userId, id) {
  const list = getInvestments(userId);
  const filtered = list.filter((item) => item.id !== id && item._id !== id);
  if (filtered.length === list.length) return false;

  saveInvestments(userId, filtered);
  return true;
}

/**
 * Calculate total invested amount across all transactions
 * @param {Array} investments
 * @returns {number}
 */
export function calculateTotalInvested(investments = []) {
  return investments.reduce((sum, item) => sum + (Number(item.totalCost || item.purchaseValue) || 0), 0);
}

/**
 * Calculate weighted-average purchase price for a group of transactions
 * Formula: Sum(Quantity * PurchasePrice) / Sum(Quantity)
 * @param {Array} transactions
 * @returns {number}
 */
export function calculateWeightedAveragePrice(transactions = []) {
  let totalQty = 0;
  let totalSpentOnShares = 0;

  for (const t of transactions) {
    const qty = Number(t.quantity) || 0;
    const price = Number(t.purchasePrice) || 0;
    totalQty += qty;
    totalSpentOnShares += qty * price;
  }

  if (totalQty <= 0) return 0;
  return totalSpentOnShares / totalQty;
}

/**
 * Group individual transactions into aggregated stock holdings by company and broker
 * Displays weighted-average purchase price, total quantity, and total invested
 * @param {Array} investments
 * @returns {Array} List of aggregated holdings
 */
export function groupInvestmentsByHolding(investments = []) {
  const map = new Map();

  for (const t of investments) {
    const key = `${t.symbol}_${t.broker}`;
    if (!map.has(key)) {
      map.set(key, {
        holdingKey: key,
        companyName: t.companyName,
        stockSymbol: t.symbol,
        exchange: t.exchange,
        brokerName: t.broker,
        transactions: [],
        totalQuantity: 0,
        totalInvested: 0,
        totalTransactionCharges: 0,
      });
    }

    const group = map.get(key);
    group.transactions.push(t);
    group.totalQuantity += Number(t.quantity) || 0;
    group.totalInvested += Number(t.totalCost || t.purchaseValue) || 0;
    group.totalTransactionCharges += Number(t.transactionCharges) || 0;
  }

  const holdings = [];
  for (const group of map.values()) {
    const avgPrice = calculateWeightedAveragePrice(group.transactions);
    holdings.push({
      holdingKey: group.holdingKey,
      companyName: group.companyName,
      stockSymbol: group.stockSymbol,
      exchange: group.exchange,
      brokerName: group.brokerName,
      totalQuantity: group.totalQuantity,
      averagePrice: avgPrice,
      totalInvested: group.totalInvested,
      totalTransactionCharges: group.totalTransactionCharges,
      transactionCount: group.transactions.length,
      transactions: group.transactions,
    });
  }

  // Sort by highest invested first
  return holdings.sort((a, b) => b.totalInvested - a.totalInvested);
}

/**
 * Filter transaction history by search query, broker, company, and date
 * @param {Array} transactions
 * @param {Object} filters
 * @returns {Array} Filtered transactions
 */
export function filterTransactions(transactions = [], filters = {}) {
  const { search = '', broker = 'ALL', company = 'ALL', dateRange = 'ALL' } = filters;
  const q = search.trim().toLowerCase();

  return transactions.filter((t) => {
    // Search filter (company name or symbol)
    if (q) {
      const matchName = t.companyName.toLowerCase().includes(q);
      const matchSymbol = t.symbol.toLowerCase().includes(q);
      if (!matchName && !matchSymbol) return false;
    }

    // Broker filter
    if (broker && broker !== 'ALL' && t.broker !== broker) {
      return false;
    }

    // Company filter
    if (company && company !== 'ALL' && t.symbol !== company) {
      return false;
    }

    // Date range filter
    if (dateRange && dateRange !== 'ALL') {
      const txDate = new Date(t.purchaseDate);
      const now = new Date();
      if (dateRange === '30D') {
        const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (txDate < d30) return false;
      } else if (dateRange === '90D') {
        const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        if (txDate < d90) return false;
      } else if (dateRange === '1Y') {
        const d1y = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        if (txDate < d1y) return false;
      }
    }

    return true;
  });
}

/**
 * Compute the 4 primary Phase 1 portfolio summary metrics
 * @param {Array} investments
 * @returns {Object}
 */
export function getPortfolioMetrics(investments = []) {
  const totalInvested = calculateTotalInvested(investments);
  const totalRecords = investments.length;

  const uniqueSymbols = new Set(investments.map((i) => i.symbol));
  const uniqueBrokers = new Set(investments.map((i) => i.broker));

  // Compute broker distribution
  const brokerTotals = {};
  for (const t of investments) {
    brokerTotals[t.broker] = (brokerTotals[t.broker] || 0) + (Number(t.totalCost) || 0);
  }

  const brokerDistribution = Object.entries(brokerTotals).map(([name, amount]) => ({
    brokerName: name,
    totalInvested: amount,
    portfolioPercent: totalInvested > 0 ? Number(((amount / totalInvested) * 100).toFixed(1)) : 0,
  }));

  return {
    totalInvested,
    totalRecords,
    totalCompanies: uniqueSymbols.size,
    totalBrokers: uniqueBrokers.size,
    brokerDistribution,
  };
}
