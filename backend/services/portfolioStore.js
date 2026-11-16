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

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_STORE_FILE = path.join(DATA_DIR, 'investments_data.json');

// Ensure local data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readLocalStore() {
  try {
    if (!fs.existsSync(LOCAL_STORE_FILE)) {
      return { investments: [], brokerSyncs: [] };
    }
    const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
    return JSON.parse(raw) || { investments: [], brokerSyncs: [] };
  } catch (err) {
    console.warn('[PortfolioStore] Error reading local store:', err.message);
    return { investments: [], brokerSyncs: [] };
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

module.exports = {
  getInvestmentsByUser,
  getInvestmentById,
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getBrokerSyncStatuses,
  updateBrokerSync,
  SUPPORTED_BROKERS,
};
