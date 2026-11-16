import React, { useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { AlertCircle, Calendar, Check, DollarSign, Hash, Layers, Loader2, Sparkles, Tag, X } from 'lucide-react';
import { addInvestment, updateInvestment } from '../services/api';
import BrokerLogo from './BrokerLogo';
import CompanyLogo from './CompanyLogo';

function formatINR(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

export default function AddInvestmentModal({
  isOpen,
  onClose,
  onSuccess,
  initialData = null,
  isEditMode = false,
}) {
  const { getToken } = useAuth();

  const [formData, setFormData] = useState({
    companyName: '',
    stockSymbol: '',
    brokerName: 'Groww',
    quantity: '',
    purchasePrice: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    exchange: 'NSE',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        stockSymbol: initialData.stockSymbol || '',
        brokerName: initialData.brokerName || 'Groww',
        quantity: initialData.quantity !== undefined ? String(initialData.quantity) : '',
        purchasePrice: initialData.purchasePrice !== undefined ? String(initialData.purchasePrice) : '',
        purchaseDate: initialData.purchaseDate
          ? new Date(initialData.purchaseDate).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        exchange: initialData.exchange || 'NSE',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        companyName: '',
        stockSymbol: '',
        brokerName: 'Groww',
        quantity: '',
        purchasePrice: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        exchange: 'NSE',
        notes: '',
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const numQuantity = Number(formData.quantity) || 0;
  const numPrice = Number(formData.purchasePrice) || 0;
  const calculatedTotal = numQuantity * numPrice;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!formData.stockSymbol.trim()) {
      setError('Stock symbol is required.');
      return;
    }
    if (numQuantity <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }
    if (numPrice < 0) {
      setError('Purchase price cannot be negative.');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();

      const payload = {
        companyName: formData.companyName.trim(),
        stockSymbol: formData.stockSymbol.trim().toUpperCase(),
        brokerName: formData.brokerName,
        quantity: numQuantity,
        purchasePrice: numPrice,
        purchaseDate: formData.purchaseDate,
        exchange: formData.exchange,
        notes: formData.notes.trim(),
      };

      let response;
      if (isEditMode && initialData?._id) {
        response = await updateInvestment(initialData._id, payload, token);
      } else {
        response = await addInvestment(payload, token);
      }

      if (response?.success) {
        if (onSuccess) onSuccess(response.data);
        onClose();
      } else {
        setError(response?.error || 'Failed to save investment.');
      }
    } catch (err) {
      console.error('[AddInvestmentModal] Submit failed:', err);
      setError(err.response?.data?.error || 'Failed to save investment. Please check server connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditMode ? 'Edit Investment Record' : 'Record New Investment'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? 'Update holding quantity, price or broker details'
                  : 'Add completed broker purchase to your portfolio'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Company & Symbol */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Company Name *
              </label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="e.g. Reliance Industries"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Stock Symbol *
              </label>
              <input
                type="text"
                name="stockSymbol"
                value={formData.stockSymbol}
                onChange={handleChange}
                placeholder="e.g. RELIANCE"
                required
                className="w-full uppercase rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Broker & Exchange */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Broker Used *
              </label>
              <div className="relative">
                <select
                  name="brokerName"
                  value={formData.brokerName}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition appearance-none"
                >
                  <option value="Groww">Groww</option>
                  <option value="Zerodha Kite">Zerodha Kite</option>
                  <option value="Angel One">Angel One</option>
                  <option value="Upstox">Upstox</option>
                  <option value="Other">Other / Direct</option>
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <BrokerLogo broker={formData.brokerName} size="sm" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Exchange *
              </label>
              <select
                name="exchange"
                value={formData.exchange}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              >
                <option value="NSE">NSE (National Stock Exchange)</option>
                <option value="BSE">BSE (Bombay Stock Exchange)</option>
              </select>
            </div>
          </div>

          {/* Quantity & Buy Price */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Number of Shares *
              </label>
              <input
                type="number"
                name="quantity"
                step="any"
                min="0.0001"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 10"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Buy Price Per Share (₹) *
              </label>
              <input
                type="number"
                name="purchasePrice"
                step="any"
                min="0"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="e.g. 2950.00"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Purchase Date *
            </label>
            <input
              type="date"
              name="purchaseDate"
              value={formData.purchaseDate}
              onChange={handleChange}
              required
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
            />
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Long term SIP, buy on dip"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition resize-none"
            />
          </div>

          {/* Dynamic Total Investment calculation display */}
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Total Investment Calculation:</span>
              <span>{numQuantity || 0} shares × {formatINR(numPrice || 0)}</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-sm font-semibold text-slate-700">Total Invested Amount:</span>
              <span className="text-xl font-extrabold text-[#0B3D2C]">
                {formatINR(calculatedTotal)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  {isEditMode ? 'Update Record' : 'Save Investment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
