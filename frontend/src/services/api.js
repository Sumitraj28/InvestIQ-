import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

export default api;