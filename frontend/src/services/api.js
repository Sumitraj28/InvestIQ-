import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5050/api',
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

export default api;
