import React, { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  DollarSign,
  Hash,
  Layers,
  Loader2,
  PlusCircle,
  Receipt,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { addInvestment as apiAddInvestment, updateInvestment as apiUpdateInvestment } from '../services/api';
import * as portfolioStorage from '../services/portfolioStorage';
import BrokerLogo from './BrokerLogo';
import CompanyLogo from './CompanyLogo';

function formatINR(val, options = {}) {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
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
  const { user } = useUser();

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    companyName: '',
    stockSymbol: '',
    brokerName: 'Groww',
    quantity: '',
    purchasePrice: '',
    transactionCharges: '',
    purchaseDate: todayStr,
    exchange: 'NSE',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName || '',
        stockSymbol: initialData.stockSymbol || initialData.symbol || '',
        brokerName: initialData.brokerName || initialData.broker || 'Groww',
        quantity: initialData.quantity !== undefined ? String(initialData.quantity) : '',
        purchasePrice: initialData.purchasePrice !== undefined ? String(initialData.purchasePrice) : '',
        transactionCharges: initialData.transactionCharges !== undefined ? String(initialData.transactionCharges) : '',
        purchaseDate: initialData.purchaseDate
          ? new Date(initialData.purchaseDate).toISOString().split('T')[0]
          : todayStr,
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
        transactionCharges: '',
        purchaseDate: todayStr,
        exchange: 'NSE',
        notes: '',
      });
    }
    setError(null);
    setSuccessMsg(null);
  }, [initialData, isOpen, todayStr]);

  if (!isOpen) return null;

  // Real-time calculations
  const parsedQty = Number(formData.quantity);
  const isWholeShare = Number.isInteger(parsedQty) && parsedQty > 0;
  const numQuantity = isWholeShare ? parsedQty : 0;
  const numPrice = Math.max(0, Number(formData.purchasePrice) || 0);
  const numCharges = Math.max(0, Number(formData.transactionCharges) || 0);
  const purchaseValue = numQuantity * numPrice;
  const totalCost = purchaseValue + numCharges;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation Rules
    if (!formData.companyName.trim()) {
      setError('Company name is required.');
      return;
    }
    if (!formData.stockSymbol.trim()) {
      setError('Stock symbol is required.');
      return;
    }
    if (!formData.brokerName) {
      setError('Please select a broker.');
      return;
    }
    if (!parsedQty || parsedQty <= 0 || !Number.isInteger(parsedQty)) {
      setError('Number of shares must be a positive whole number (e.g. 1, 5, 10).');
      return;
    }
    if (!formData.purchasePrice || numPrice <= 0) {
      setError('Purchase price per share must be greater than ₹0.00.');
      return;
    }
    if (formData.purchaseDate > todayStr) {
      setError('Purchase date cannot be in the future.');
      return;
    }
    if (formData.transactionCharges && Number(formData.transactionCharges) < 0) {
      setError('Transaction charges cannot be negative.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        companyName: formData.companyName.trim(),
        symbol: formData.stockSymbol.trim().toUpperCase(),
        stockSymbol: formData.stockSymbol.trim().toUpperCase(),
        broker: formData.brokerName,
        brokerName: formData.brokerName,
        quantity: parsedQty,
        purchasePrice: numPrice,
        transactionCharges: numCharges,
        purchaseValue,
        totalCost,
        totalInvestment: totalCost,
        purchaseDate: formData.purchaseDate,
        exchange: formData.exchange,
        notes: formData.notes.trim(),
        transactionType: 'BUY',
      };

      // 1. Save in user-isolated client storage
      let savedRecord;
      const targetId = initialData?.id || initialData?._id;
      if (isEditMode && targetId) {
        savedRecord = portfolioStorage.updateInvestment(user?.id, targetId, payload);
      } else {
        savedRecord = portfolioStorage.addInvestment(user?.id, payload);
      }

      // 2. Sync with backend API if user is authenticated (graceful fallback)
      try {
        const token = await getToken();
        if (token) {
          if (isEditMode && targetId) {
            await apiUpdateInvestment(targetId, payload, token);
          } else {
            await apiAddInvestment(payload, token);
          }
        }
      } catch (backendErr) {
        console.warn('[AddInvestmentModal] Backend sync notice:', backendErr.message || backendErr);
      }

      setSuccessMsg(isEditMode ? 'Investment updated successfully!' : 'Investment recorded successfully in your portfolio!');

      setTimeout(() => {
        if (onSuccess) onSuccess(savedRecord);
        onClose();
      }, 500);
    } catch (err) {
      console.error('[AddInvestmentModal] Submit failed:', err);
      setError('An error occurred while saving the investment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {isEditMode ? 'Edit Investment Record' : 'Record Investment'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEditMode
                  ? 'Update transaction quantity, price, charges or broker details'
                  : 'Manually add your confirmed broker trade to InvestIQ portfolio'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {successMsg && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
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
                  required
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
                Number of Shares (Whole Shares) *
              </label>
              <input
                type="number"
                name="quantity"
                step="1"
                min="1"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="e.g. 10"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Positive whole shares only</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Buy Price Per Share (₹) *
              </label>
              <input
                type="number"
                name="purchasePrice"
                step="0.05"
                min="0.01"
                value={formData.purchasePrice}
                onChange={handleChange}
                placeholder="e.g. 2500.00"
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Purchase Date & Transaction Charges */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Purchase Date *
              </label>
              <input
                type="date"
                name="purchaseDate"
                max={todayStr}
                value={formData.purchaseDate}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Transaction Charges (₹, Optional)
              </label>
              <input
                type="number"
                name="transactionCharges"
                step="0.01"
                min="0"
                value={formData.transactionCharges}
                onChange={handleChange}
                placeholder="e.g. 20.00"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition"
              />
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Investment Notes (Optional)
            </label>
            <textarea
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Core long-term holding, bought after quarterly results"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden transition resize-none"
            />
          </div>

          {/* Dynamic Investment Cost Calculation Display */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Purchase Value:</span>
              <span className="font-semibold text-slate-700">
                {numQuantity} shares × {formatINR(numPrice)} = {formatINR(purchaseValue)}
              </span>
            </div>
            {numCharges > 0 && (
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Transaction Charges:</span>
                <span className="font-semibold text-slate-700">+{formatINR(numCharges)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex items-baseline justify-between">
              <span className="text-sm font-bold text-slate-900">Total Cost (Investment):</span>
              <span className="text-xl font-extrabold text-[#0B3D2C]">
                {formatINR(totalCost)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
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
                  {isEditMode ? 'Save Changes' : 'Save Investment'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
