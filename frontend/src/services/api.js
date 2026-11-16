import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

const createAuthHeaders = (token) => {
  if (!token) return {};
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

// ── Stock Market Data Endpoints ──

export const getStock = async (ticker) => {
  const response = await api.get(`/stocks/${ticker}`);
  return response.data;
};

export const getStockHistory = async (ticker) => {
  const response = await api.get(`/stocks/${ticker}/history`);
  return response.data;
};

export const getStockAiSummary = async (ticker) => {
  const response = await api.get(`/stocks/${ticker}/ai-summary`);
  return response.data;
};

export const getStockFinancials = async (ticker) => {
  const response = await api.get(`/stocks/${ticker}/financials`);
  return response.data;
};

// ── Portfolio & Investment Endpoints ──

export const getPortfolioInvestments = async (token) => {
  const response = await api.get('/portfolio/investments', createAuthHeaders(token));
  return response.data;
};

export const addInvestment = async (investmentData, token) => {
  const response = await api.post('/portfolio/investments', investmentData, createAuthHeaders(token));
  return response.data;
};

export const updateInvestment = async (id, updateData, token) => {
  const response = await api.put(`/portfolio/investments/${id}`, updateData, createAuthHeaders(token));
  return response.data;
};

export const deleteInvestment = async (id, token) => {
  const response = await api.delete(`/portfolio/investments/${id}`, createAuthHeaders(token));
  return response.data;
};

export const getPortfolioSummary = async (token) => {
  const response = await api.get('/portfolio/summary', createAuthHeaders(token));
  return response.data;
};

export const getPortfolioPrices = async (symbols, token) => {
  const symParam = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const response = await api.get(`/portfolio/prices?symbols=${encodeURIComponent(symParam)}`, createAuthHeaders(token));
  return response.data;
};

export const getBrokerSyncStatus = async (token) => {
  const response = await api.get('/portfolio/brokers', createAuthHeaders(token));
  return response.data;
};

export const syncBrokerHoldings = async (broker, consent, token) => {
  const response = await api.post(
    '/portfolio/brokers/sync',
    { broker, consent },
    createAuthHeaders(token)
  );
  return response.data;
};

export default api;
