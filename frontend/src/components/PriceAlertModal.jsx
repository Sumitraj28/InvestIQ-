import React, { useState, useEffect } from 'react';
import { Bell, AlertCircle, CheckCircle2, Trash2, X, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { useAuth } from '@clerk/react';
import { getPriceAlerts, createPriceAlert, deletePriceAlert } from '../services/api';

function formatINR(val) {
  if (!val || !Number.isFinite(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PriceAlertModal({
  isOpen,
  onClose,
  symbol,
  companyName,
  currentPrice,
  onAlertCreated,
}) {
  const { getToken, isSignedIn } = useAuth();
  const [condition, setCondition] = useState('ABOVE');
  const [targetValue, setTargetValue] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const cleanSymbol = symbol ? symbol.replace(/\.(NS|BO)$/i, '') : '';

  useEffect(() => {
    if (isOpen && cleanSymbol) {
      // Default target price based on condition
      const ltp = Number(currentPrice) || 1000;
      if (condition === 'ABOVE') {
        setTargetValue((ltp * 1.05).toFixed(2));
      } else if (condition === 'BELOW') {
        setTargetValue((ltp * 0.95).toFixed(2));
      } else {
        setTargetValue('5.0');
      }
      loadAlerts();
    }
  }, [isOpen, cleanSymbol, condition]);

  const loadAlerts = async () => {
    if (!isSignedIn) return;
    setLoading(true);
    try {
      const token = await getToken();
      const res = await getPriceAlerts(token);
      if (res.success && Array.isArray(res.data)) {
        const matching = res.data.filter(
          (a) => a.symbol?.toUpperCase() === cleanSymbol.toUpperCase()
        );
        setAlerts(matching);
      }
    } catch (err) {
      console.warn('[PriceAlertModal] Failed to load alerts:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const val = parseFloat(targetValue);
    if (isNaN(val) || val <= 0) {
      setError('Please provide a valid positive target value.');
      return;
    }

    setSubmitting(true);
    try {
      const token = isSignedIn ? await getToken() : null;
      const payload = {
        symbol: cleanSymbol,
        condition,
        targetPrice: condition === 'PERCENT_CHANGE' ? undefined : val,
        thresholdPercent: condition === 'PERCENT_CHANGE' ? val : undefined,
      };

      const res = await createPriceAlert(payload, token);
      if (res.success) {
        setSuccess('Price alert created successfully!');
        if (onAlertCreated) onAlertCreated(res.data);
        await loadAlerts();
      } else {
        setError(res.error || 'Failed to create alert.');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error creating alert.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = isSignedIn ? await getToken() : null;
      await deletePriceAlert(id, token);
      setAlerts((prev) => prev.filter((a) => a._id !== id && a.id !== id));
    } catch (err) {
      console.error('[PriceAlertModal] Delete error:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Set Real-Time Price Alert</h3>
              <p className="text-xs text-slate-500">
                {companyName || cleanSymbol} • LTP: <span className="font-semibold text-slate-800">{formatINR(currentPrice)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center space-x-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-4">
            {/* Condition Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Trigger When Price:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCondition('ABOVE')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                    condition === 'ABOVE'
                      ? 'border-emerald-600 bg-emerald-50/60 text-emerald-800 font-bold ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 mb-1 text-emerald-600" />
                  <span className="text-xs">Rises Above</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('BELOW')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                    condition === 'BELOW'
                      ? 'border-rose-600 bg-rose-50/60 text-rose-800 font-bold ring-1 ring-rose-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <TrendingDown className="h-4 w-4 mb-1 text-rose-600" />
                  <span className="text-xs">Falls Below</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCondition('PERCENT_CHANGE')}
                  className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition ${
                    condition === 'PERCENT_CHANGE'
                      ? 'border-blue-600 bg-blue-50/60 text-blue-800 font-bold ring-1 ring-blue-500'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <Percent className="h-4 w-4 mb-1 text-blue-600" />
                  <span className="text-xs">Moves %</span>
                </button>
              </div>
            </div>

            {/* Target Value Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {condition === 'PERCENT_CHANGE' ? 'Threshold Percentage (%)' : 'Target Price (₹)'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.05"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={condition === 'PERCENT_CHANGE' ? 'e.g. 5.0' : 'e.g. 2950.00'}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold">
                  {condition === 'PERCENT_CHANGE' ? '%' : 'INR'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {condition === 'ABOVE' && `Alert will fire the moment ${cleanSymbol} price exceeds ₹${targetValue}.`}
                {condition === 'BELOW' && `Alert will fire the moment ${cleanSymbol} price drops under ₹${targetValue}.`}
                {condition === 'PERCENT_CHANGE' && `Alert will fire when ${cleanSymbol} intraday change exceeds ±${targetValue}%.`}
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              {submitting ? 'Setting Alert...' : 'Activate Real-Time Alert'}
            </button>
          </form>

          {/* Active Alerts List */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-900 mb-2">
              Existing Alerts for {cleanSymbol} ({alerts.length})
            </h4>
            {loading ? (
              <p className="text-xs text-slate-400 py-2">Loading active alerts...</p>
            ) : alerts.length === 0 ? (
              <p className="text-xs text-slate-400 py-1">No active price alerts set for this stock.</p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {alerts.map((a) => (
                  <div
                    key={a._id || a.id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {a.condition === 'ABOVE' ? 'Rises Above' : a.condition === 'BELOW' ? 'Falls Below' : 'Moves %'}
                      </span>{' '}
                      <span className="font-bold text-slate-950">
                        {a.condition === 'PERCENT_CHANGE' ? `±${a.thresholdPercent}%` : formatINR(a.targetPrice)}
                      </span>
                      <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        a.status === 'TRIGGERED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {a.status}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(a._id || a.id)}
                      className="text-slate-400 hover:text-rose-600 transition"
                      title="Delete Alert"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
