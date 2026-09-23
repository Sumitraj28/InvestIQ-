import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Search, X, Check, Plus, TrendingUp } from 'lucide-react';
import { popularTickers } from '../data/popularTickers';
import CompanyLogo from './CompanyLogo';
import { normalizeTicker } from '../services/watchlistStorage';

export default function AddStockModal({ isOpen, onClose, onAdd, existingTickers = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTickers = useMemo(() => {
    const query = searchTerm.trim().toUpperCase().replace('.NS', '');
    if (!query) return popularTickers.slice(0, 10);

    return popularTickers.filter(
      (item) =>
        item.symbol.replace('.NS', '').includes(query) ||
        item.name.toUpperCase().includes(query) ||
        item.sector.toUpperCase().includes(query)
    );
  }, [searchTerm]);

  if (!isOpen) return null;

  const handleSelect = (ticker) => {
    const normalized = normalizeTicker(ticker);
    onAdd(normalized);
    onClose();
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    const clean = searchTerm.trim().toUpperCase();
    if (!clean) return;
    const ticker = clean.includes('.') ? clean : `${clean}.NS`;
    handleSelect(ticker);
  };

  const isTickerAdded = (symbol) => {
    const norm = normalizeTicker(symbol);
    return existingTickers.some((t) => normalizeTicker(t) === norm);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-100 z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Stocks to Watchlist</h2>
            <p className="text-xs text-slate-500">Search by company name, ticker symbol, or sector</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Bar Input */}
        <div className="p-6 pb-2">
          <form onSubmit={handleCustomSubmit} className="relative flex items-center">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search e.g. GAIL, HDFCBANK, Tata Steel..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-24 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-16 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
            >
              Add
            </button>
          </form>
        </div>

        {/* Suggestions & List */}
        <div className="max-h-80 overflow-y-auto px-6 py-2 divide-y divide-slate-100">
          <div className="pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {searchTerm ? `Matching Stocks (${filteredTickers.length})` : 'Popular NSE Stocks'}
          </div>

          {filteredTickers.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm font-semibold text-slate-600">No matching stock found</p>
              <p className="text-xs text-slate-400 mt-1">
                You can press <span className="font-bold">Add</span> above to add "{searchTerm.toUpperCase()}" directly.
              </p>
            </div>
          ) : (
            filteredTickers.map((item) => {
              const alreadyAdded = isTickerAdded(item.symbol);
              return (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between py-3 hover:bg-slate-50 rounded-xl px-2 transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CompanyLogo ticker={item.symbol} name={item.name} size="sm" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{item.symbol.replace('.NS', '')}</span>
                        <span className="text-[11px] text-slate-400 rounded bg-slate-100 px-1.5 py-0.5">
                          {item.sector}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{item.name}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelect(item.symbol)}
                    disabled={alreadyAdded}
                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      alreadyAdded
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5" /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
