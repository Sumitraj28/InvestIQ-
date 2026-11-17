/**
 * Portfolio Data Access Layer
 * Supports MongoDB Mongoose models with persistent local JSON fallback
 * for resilient operation in all environments (connected or offline development).
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Investment = require('../models/Investment');
const BrokerSync = require('../models/BrokerSync');
const BrokerConnection = require('../models/BrokerConnection');
const SyncedHolding = require('../models/SyncedHolding');
const ReconciliationRecord = require('../models/ReconciliationRecord');
const { reconcilePortfolio } = require('./brokers/reconciliationService');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'investments_data.json');

// Ensure local data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      return {
        investments: [],
        brokerSyncs: [],
        brokerConnections: [],
        syncedHoldings: [],
        reconciliationRecords: [],
      };
    }
    const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) || {};
    return {
      investments: parsed.investments || [],
      brokerSyncs: parsed.brokerSyncs || [],
      brokerConnections: parsed.brokerConnections || [],
      syncedHoldings: parsed.syncedHoldings || [],
      reconciliationRecords: parsed.reconciliationRecords || [],
    };
  } catch (err) {
    console.warn('[PortfolioStore] Error reading local store:', err.message);
    return {
      investments: [],
      brokerSyncs: [],
      brokerConnections: [],
      syncedHoldings: [],
      reconciliationRecords: [],
    };
  }
}

function writeLocalStore(data) {
  try {
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('[PortfolioStore] Error writing to local store:', err.message);
  }
}

function isMongoConnected() {
  return mongoose.connection && mongoose.connection.readyState === 1;
}

// ── Investment Operations ──

async function getInvestmentsByUser(userId) {
  if (isMongoConnected()) {
    return Investment.find({ userId }).sort({ purchaseDate: -1, createdAt: -1 });
  }

  const store = readLocalStore();
  const userInvestments = store.investments.filter((item) => item.userId === userId);
  return userInvestments.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
}

async function getInvestmentById(userId, investmentId) {
  if (isMongoConnected()) {
    return Investment.findOne({ _id: investmentId, userId });
  }

  const store = readLocalStore();
  return store.investments.find(
    (item) => String(item._id || item.id) === String(investmentId) && item.userId === userId
  ) || null;
}

async function createInvestment(userId, data) {
  const quantity = Number(data.quantity);
  const purchasePrice = Number(data.purchasePrice);
  const totalInvestment = Number((quantity * purchasePrice).toFixed(2));

  const investmentPayload = {
    userId,
    companyName: String(data.companyName).trim(),
    stockSymbol: String(data.stockSymbol).trim().toUpperCase(),
    brokerName: data.brokerName || 'Groww',
    quantity,
    purchasePrice,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
    exchange: (data.exchange || 'NSE').toUpperCase(),
    notes: data.notes ? String(data.notes).trim() : '',
    totalInvestment,
    source: data.source || 'manual',
    brokerOrderId: data.brokerOrderId || null,
  };

  if (isMongoConnected()) {
    const newDoc = new Investment(investmentPayload);
    return await newDoc.save();
  }

  // Fallback to local store
  const store = readLocalStore();
  const newEntry = {
    _id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    ...investmentPayload,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.investments.push(newEntry);
  writeLocalStore(store);
  return newEntry;
}

async function updateInvestment(userId, investmentId, updateData) {
  const quantity = updateData.quantity !== undefined ? Number(updateData.quantity) : undefined;
  const purchasePrice = updateData.purchasePrice !== undefined ? Number(updateData.purchasePrice) : undefined;

  if (isMongoConnected()) {
    const existing = await Investment.findOne({ _id: investmentId, userId });
    if (!existing) return null;

    if (updateData.companyName) existing.companyName = String(updateData.companyName).trim();
    if (updateData.stockSymbol) existing.stockSymbol = String(updateData.stockSymbol).trim().toUpperCase();
    if (updateData.brokerName) existing.brokerName = updateData.brokerName;
    if (quantity !== undefined) existing.quantity = quantity;
    if (purchasePrice !== undefined) existing.purchasePrice = purchasePrice;
    if (updateData.purchaseDate) existing.purchaseDate = new Date(updateData.purchaseDate);
    if (updateData.exchange) existing.exchange = (updateData.exchange || 'NSE').toUpperCase();
    if (updateData.notes !== undefined) existing.notes = String(updateData.notes).trim();

    existing.totalInvestment = Number((existing.quantity * existing.purchasePrice).toFixed(2));
    return await existing.save();
  }

  const store = readLocalStore();
  const index = store.investments.findIndex(
    (item) => String(item._id || item.id) === String(investmentId) && item.userId === userId
  );

  if (index === -1) return null;

  const current = store.investments[index];
  const newQty = quantity !== undefined ? quantity : current.quantity;
  const newPrice = purchasePrice !== undefined ? purchasePrice : current.purchasePrice;

  store.investments[index] = {
    ...current,
    ...(updateData.companyName ? { companyName: String(updateData.companyName).trim() } : {}),
    ...(updateData.stockSymbol ? { stockSymbol: String(updateData.stockSymbol).trim().toUpperCase() } : {}),
    ...(updateData.brokerName ? { brokerName: updateData.brokerName } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
    ...(purchasePrice !== undefined ? { purchasePrice } : {}),
    ...(updateData.purchaseDate ? { purchaseDate: new Date(updateData.purchaseDate).toISOString() } : {}),
    ...(updateData.exchange ? { exchange: updateData.exchange.toUpperCase() } : {}),
    ...(updateData.notes !== undefined ? { notes: String(updateData.notes).trim() } : {}),
    totalInvestment: Number((newQty * newPrice).toFixed(2)),
    updatedAt: new Date().toISOString(),
  };

  writeLocalStore(store);
  return store.investments[index];
}

async function deleteInvestment(userId, investmentId) {
  if (isMongoConnected()) {
    const result = await Investment.findOneAndDelete({ _id: investmentId, userId });
    return !!result;
  }

  const store = readLocalStore();
  const initialLength = store.investments.length;
  store.investments = store.investments.filter(
    (item) => !(String(item._id || item.id) === String(investmentId) && item.userId === userId)
  );

  const deleted = store.investments.length < initialLength;
  if (deleted) {
    writeLocalStore(store);
  }
  return deleted;
}

// ── Broker Sync Operations ──

const SUPPORTED_BROKERS = [
  { id: 'groww', name: 'Groww', officialUrl: 'https://groww.in' },
  { id: 'zerodha', name: 'Zerodha Kite', officialUrl: 'https://kite.zerodha.com' },
  { id: 'angelone', name: 'Angel One', officialUrl: 'https://trade.angelone.in' },
  { id: 'upstox', name: 'Upstox', officialUrl: 'https://pro.upstox.com' },
];

async function getBrokerSyncStatuses(userId) {
  let existingSyncs = [];
  if (isMongoConnected()) {
    existingSyncs = await BrokerSync.find({ userId });
  } else {
    const store = readLocalStore();
    existingSyncs = (store.brokerSyncs || []).filter((item) => item.userId === userId);
  }

  const syncMap = new Map();
  existingSyncs.forEach((item) => syncMap.set(item.broker, item));

  return SUPPORTED_BROKERS.map((broker) => {
    const synced = syncMap.get(broker.id);
    return {
      brokerId: broker.id,
      brokerName: broker.name,
      officialUrl: broker.officialUrl,
      status: synced?.status || 'disconnected',
      consentGiven: synced?.consentGiven || false,
      lastSyncedAt: synced?.lastSyncedAt || null,
      syncMessage: synced?.syncMessage || 'Manual tracking mode active. Connect official API for auto-sync.',
      accountMaskedId: synced?.accountMaskedId || null,
      apiSupported: true,
      requiresOAuth: true,
    };
  });
}

async function updateBrokerSync(userId, brokerId, syncData) {
  const brokerMeta = SUPPORTED_BROKERS.find((b) => b.id === brokerId);
  const displayName = brokerMeta ? brokerMeta.name : brokerId;

  if (isMongoConnected()) {
    return BrokerSync.findOneAndUpdate(
      { userId, broker: brokerId },
      {
        $set: {
          brokerDisplayName: displayName,
          status: syncData.status || 'connected',
          consentGiven: Boolean(syncData.consentGiven),
          lastSyncedAt: new Date(),
          syncMessage: syncData.syncMessage || 'Holdings synchronized successfully.',
          accountMaskedId: syncData.accountMaskedId || `ACC-•••${Math.floor(1000 + Math.random() * 9000)}`,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const store = readLocalStore();
  if (!store.brokerSyncs) store.brokerSyncs = [];

  const existingIndex = store.brokerSyncs.findIndex(
    (item) => item.userId === userId && item.broker === brokerId
  );

  const updatedEntry = {
    userId,
    broker: brokerId,
    brokerDisplayName: displayName,
    status: syncData.status || 'connected',
    consentGiven: Boolean(syncData.consentGiven),
    lastSyncedAt: new Date().toISOString(),
    syncMessage: syncData.syncMessage || 'Holdings synchronized successfully.',
    accountMaskedId: syncData.accountMaskedId || `ACC-•••${Math.floor(1000 + Math.random() * 9000)}`,
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    store.brokerSyncs[existingIndex] = { ...store.brokerSyncs[existingIndex], ...updatedEntry };
  } else {
    store.brokerSyncs.push(updatedEntry);
  }

  writeLocalStore(store);
  return updatedEntry;
}

// ── Phase 4 Broker Connections & Synced Holdings Operations ──

async function getBrokerConnections(userId) {
  if (isMongoConnected()) {
    const list = await BrokerConnection.find({ userId });
    return list.map((doc) => (doc.toSafeObject ? doc.toSafeObject() : doc));
  }

  const store = readLocalStore();
  return (store.brokerConnections || [])
    .filter((c) => c.userId === userId)
    .map((c) => {
      const safe = { ...c };
      delete safe.encryptedAccessToken;
      delete safe.encryptedRefreshToken;
      return safe;
    });
}

async function getBrokerConnection(userId, brokerId) {
  if (isMongoConnected()) {
    return BrokerConnection.findOne({ userId, broker: brokerId });
  }

  const store = readLocalStore();
  return (store.brokerConnections || []).find((c) => c.userId === userId && c.broker === brokerId) || null;
}

async function saveBrokerConnection(userId, connectionData) {
  const broker = connectionData.broker;
  const payload = {
    userId,
    broker,
    brokerDisplayName: connectionData.brokerDisplayName || broker,
    externalAccountId: connectionData.externalAccountId || null,
    accountMaskedId: connectionData.accountMaskedId || null,
    connectionStatus: connectionData.connectionStatus || 'connected',
    encryptedAccessToken: connectionData.encryptedAccessToken || null,
    encryptedRefreshToken: connectionData.encryptedRefreshToken || null,
    tokenExpiresAt: connectionData.tokenExpiresAt || null,
    lastSuccessfulSyncAt: connectionData.lastSuccessfulSyncAt || null,
    lastAttemptedSyncAt: connectionData.lastAttemptedSyncAt || new Date(),
    lastErrorMessage: connectionData.lastErrorMessage || null,
    scope: connectionData.scope || ['read:holdings', 'read:profile'],
    consentGiven: true,
    meta: connectionData.meta || {},
  };

  if (isMongoConnected()) {
    const doc = await BrokerConnection.findOneAndUpdate(
      { userId, broker },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return doc.toSafeObject ? doc.toSafeObject() : doc;
  }

  const store = readLocalStore();
  if (!store.brokerConnections) store.brokerConnections = [];

  const idx = store.brokerConnections.findIndex((c) => c.userId === userId && c.broker === brokerId);
  const newEntry = {
    _id: idx >= 0 ? store.brokerConnections[idx]._id : `conn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...payload,
    createdAt: idx >= 0 ? store.brokerConnections[idx].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (idx >= 0) {
    store.brokerConnections[idx] = newEntry;
  } else {
    store.brokerConnections.push(newEntry);
  }
  writeLocalStore(store);

  const safe = { ...newEntry };
  delete safe.encryptedAccessToken;
  delete safe.encryptedRefreshToken;
  return safe;
}

async function updateBrokerConnection(userId, brokerId, updateData) {
  if (isMongoConnected()) {
    const doc = await BrokerConnection.findOneAndUpdate(
      { userId, broker: brokerId },
      { $set: { ...updateData, updatedAt: new Date() } },
      { new: true }
    );
    return doc ? (doc.toSafeObject ? doc.toSafeObject() : doc) : null;
  }

  const store = readLocalStore();
  if (!store.brokerConnections) store.brokerConnections = [];

  const idx = store.brokerConnections.findIndex((c) => c.userId === userId && c.broker === brokerId);
  if (idx === -1) return null;

  store.brokerConnections[idx] = {
    ...store.brokerConnections[idx],
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  writeLocalStore(store);

  const safe = { ...store.brokerConnections[idx] };
  delete safe.encryptedAccessToken;
  delete safe.encryptedRefreshToken;
  return safe;
}

async function deleteBrokerConnection(userId, brokerId) {
  if (isMongoConnected()) {
    await BrokerConnection.findOneAndDelete({ userId, broker: brokerId });
    await SyncedHolding.deleteMany({ userId, broker: brokerId });
    return true;
  }

  const store = readLocalStore();
  store.brokerConnections = (store.brokerConnections || []).filter(
    (c) => !(c.userId === userId && c.broker === brokerId)
  );
  store.syncedHoldings = (store.syncedHoldings || []).filter(
    (h) => !(h.userId === userId && h.broker === brokerId)
  );
  writeLocalStore(store);
  return true;
}

async function getSyncedHoldings(userId, brokerId = null) {
  if (isMongoConnected()) {
    const filter = { userId };
    if (brokerId) filter.broker = brokerId;
    return SyncedHolding.find(filter).sort({ symbol: 1 });
  }

  const store = readLocalStore();
  return (store.syncedHoldings || []).filter((h) => {
    if (h.userId !== userId) return false;
    if (brokerId && h.broker !== brokerId) return false;
    return true;
  });
}

async function saveSyncedHoldings(userId, brokerId, holdingsList) {
  const connection = await getBrokerConnection(userId, brokerId);
  const connId = connection ? (connection._id || connection.id) : `conn_${brokerId}`;

  const preparedHoldings = holdingsList.map((item) => ({
    userId,
    brokerConnectionId: String(connId),
    broker: brokerId,
    instrumentId: item.instrumentId || item.symbol,
    isin: item.isin || null,
    exchange: item.exchange || 'NSE',
    symbol: String(item.symbol).toUpperCase().trim(),
    companyName: item.companyName,
    quantity: item.quantity,
    averagePrice: item.averagePrice,
    costBasis: item.costBasis || Number((item.quantity * item.averagePrice).toFixed(2)),
    currentPrice: item.currentPrice,
    marketValue: item.marketValue,
    unrealizedPnl: item.unrealizedPnl,
    unrealizedPnlPercent: item.unrealizedPnlPercent,
    currency: item.currency || 'INR',
    snapshotTimestamp: new Date(),
    source: 'broker_sync',
  }));

  if (isMongoConnected()) {
    // Delete previously synced snapshot for this broker and replace with fresh snapshot
    await SyncedHolding.deleteMany({ userId, broker: brokerId });
    if (preparedHoldings.length > 0) {
      await SyncedHolding.insertMany(preparedHoldings);
    }
    return preparedHoldings;
  }

  const store = readLocalStore();
  if (!store.syncedHoldings) store.syncedHoldings = [];

  // Remove existing holdings for this user and broker
  store.syncedHoldings = store.syncedHoldings.filter(
    (h) => !(h.userId === userId && h.broker === brokerId)
  );

  const formatted = preparedHoldings.map((h) => ({
    _id: `synced_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    ...h,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  store.syncedHoldings.push(...formatted);
  writeLocalStore(store);
  return formatted;
}

async function getUnifiedPortfolio(userId) {
  const manual = await getInvestmentsByUser(userId);
  const synced = await getSyncedHoldings(userId);

  return reconcilePortfolio(manual, synced);
}

module.exports = {
  getInvestmentsByUser,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getBrokerSyncStatuses,
  updateBrokerSync,
  getBrokerConnections,
  getBrokerConnection,
  saveBrokerConnection,
  updateBrokerConnection,
  deleteBrokerConnection,
  getSyncedHoldings,
  saveSyncedHoldings,
  getUnifiedPortfolio,
  SUPPORTED_BROKERS,
};
