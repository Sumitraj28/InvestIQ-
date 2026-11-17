/**
 * Manual & Synced Holdings Reconciliation Service
 * Resolves overlaps between manual purchase transactions and broker account snapshots,
 * ensuring unified portfolio totals never double-count investments.
 */

function normalizeBrokerKey(brokerName) {
  if (!brokerName) return 'other';
  const lower = String(brokerName).toLowerCase();
  if (lower.includes('zerodha') || lower.includes('kite')) return 'zerodha';
  if (lower.includes('groww')) return 'groww';
  if (lower.includes('angel')) return 'angelone';
  if (lower.includes('upstox')) return 'upstox';
  return lower;
}

/**
 * Reconcile manual investments and synced broker holdings
 * @param {Array} manualInvestments - Array of manual transaction documents
 * @param {Array} syncedHoldings - Array of SyncedHolding documents
 * @returns {Object} Reconciled portfolio structure
 */
function reconcilePortfolio(manualInvestments = [], syncedHoldings = []) {
  // 1. Group manual investments by Symbol + Broker
  const manualGroups = new Map();
  for (const inv of manualInvestments) {
    const symbol = String(inv.stockSymbol || inv.symbol || '').toUpperCase().trim();
    const broker = normalizeBrokerKey(inv.brokerName || inv.broker);
    const key = `${broker}:${symbol}`;

    if (!manualGroups.has(key)) {
      manualGroups.set(key, {
        broker,
        symbol,
        companyName: inv.companyName || symbol,
        exchange: (inv.exchange || 'NSE').toUpperCase(),
        totalQuantity: 0,
        totalInvested: 0,
        transactions: [],
      });
    }

    const group = manualGroups.get(key);
    const qty = Number(inv.quantity || 0);
    const price = Number(inv.purchasePrice || 0);
    const invested = Number(inv.totalInvestment || qty * price);

    group.totalQuantity += qty;
    group.totalInvested += invested;
    group.transactions.push(inv);
  }

  // Calculate weighted average price for manual groups
  for (const group of manualGroups.values()) {
    group.weightedAveragePrice =
      group.totalQuantity > 0 ? Number((group.totalInvested / group.totalQuantity).toFixed(2)) : 0;
  }

  // 2. Group synced holdings by Symbol + Broker
  const syncedGroups = new Map();
  for (const sync of syncedHoldings) {
    const symbol = String(sync.symbol || '').toUpperCase().trim();
    const broker = normalizeBrokerKey(sync.broker);
    const key = `${broker}:${symbol}`;
    syncedGroups.set(key, sync);
  }

  const unifiedHoldings = [];
  const reconciliationRecords = [];
  const processedSyncedKeys = new Set();

  // 3. Match manual groups against synced groups
  for (const [key, manualGroup] of manualGroups.entries()) {
    const synced = syncedGroups.get(key);

    if (synced) {
      processedSyncedKeys.add(key);
      const manualQty = manualGroup.totalQuantity;
      const syncedQty = Number(synced.quantity || 0);
      const qtyDiff = Number((syncedQty - manualQty).toFixed(4));

      let matchStatus = 'auto_matched';
      let notes = 'Exact match with broker account snapshot.';

      if (Math.abs(qtyDiff) > 0.001) {
        matchStatus = 'conflict_review';
        notes = `Quantity variance: Manual has ${manualQty} shares, but synced broker reports ${syncedQty} shares.`;
      }

      const recRecord = {
        key,
        broker: manualGroup.broker,
        symbol: manualGroup.symbol,
        companyName: synced.companyName || manualGroup.companyName,
        matchStatus,
        manualQuantity: manualQty,
        syncedQuantity: syncedQty,
        quantityDifference: qtyDiff,
        notes,
        manualTransactionsCount: manualGroup.transactions.length,
      };
      reconciliationRecords.push(recRecord);

      // In Unified Holdings: Use official broker synced holding as source of truth to prevent double counting
      unifiedHoldings.push({
        id: synced._id || `synced_${key}`,
        symbol: synced.symbol,
        companyName: synced.companyName,
        broker: synced.broker,
        exchange: synced.exchange || manualGroup.exchange,
        quantity: synced.quantity,
        averagePrice: synced.averagePrice,
        costBasis: synced.costBasis || manualGroup.totalInvested,
        currentPrice: synced.currentPrice,
        marketValue: synced.marketValue,
        unrealizedPnl: synced.unrealizedPnl,
        unrealizedPnlPercent: synced.unrealizedPnlPercent,
        source: 'broker_synced',
        reconciled: true,
        reconciliationStatus: matchStatus,
        manualRecordsCount: manualGroup.transactions.length,
        notes,
      });
    } else {
      // Manual investment without a connected broker sync (e.g. Groww, Angel One or unconnected broker)
      unifiedHoldings.push({
        id: `manual_${key}`,
        symbol: manualGroup.symbol,
        companyName: manualGroup.companyName,
        broker: manualGroup.broker,
        exchange: manualGroup.exchange,
        quantity: manualGroup.totalQuantity,
        averagePrice: manualGroup.weightedAveragePrice,
        costBasis: Number(manualGroup.totalInvested.toFixed(2)),
        currentPrice: null, // Will be enriched by market quote layer
        marketValue: null,
        unrealizedPnl: null,
        unrealizedPnlPercent: null,
        source: 'manual',
        reconciled: false,
        reconciliationStatus: 'unmatched',
        manualRecordsCount: manualGroup.transactions.length,
        notes: 'Manual holding without verified broker sync.',
      });
    }
  }

  // 4. Add synced holdings that had no manual entry
  for (const [key, synced] of syncedGroups.entries()) {
    if (!processedSyncedKeys.has(key)) {
      unifiedHoldings.push({
        id: synced._id || `synced_${key}`,
        symbol: synced.symbol,
        companyName: synced.companyName,
        broker: synced.broker,
        exchange: synced.exchange || 'NSE',
        quantity: synced.quantity,
        averagePrice: synced.averagePrice,
        costBasis: synced.costBasis,
        currentPrice: synced.currentPrice,
        marketValue: synced.marketValue,
        unrealizedPnl: synced.unrealizedPnl,
        unrealizedPnlPercent: synced.unrealizedPnlPercent,
        source: 'broker_synced',
        reconciled: false,
        reconciliationStatus: 'broker_only',
        manualRecordsCount: 0,
        notes: 'Direct broker holding imported automatically.',
      });
    }
  }

  return {
    unifiedHoldings,
    reconciliationRecords,
    summary: {
      totalHoldings: unifiedHoldings.length,
      manualCount: manualInvestments.length,
      syncedCount: syncedHoldings.length,
      matchedCount: reconciliationRecords.filter((r) => r.matchStatus === 'auto_matched').length,
      reviewCount: reconciliationRecords.filter((r) => r.matchStatus === 'conflict_review').length,
    },
  };
}

module.exports = {
  reconcilePortfolio,
  normalizeBrokerKey,
};
