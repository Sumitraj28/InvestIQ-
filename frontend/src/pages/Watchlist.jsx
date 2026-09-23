import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Check,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  FolderPlus,
  Trash2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import Sparkline from '../components/Sparkline';
import Perf52WSlider from '../components/Perf52WSlider';
import WatchlistSignalBadge from '../components/WatchlistSignalBadge';
import AddStockModal from '../components/AddStockModal';
import { getStock } from '../services/api';
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getNamedLists,
  createNamedList,
  deleteNamedList,
  normalizeTicker,
} from '../services/watchlistStorage';

function formatINR(val, options = {}) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    ...options,
  });
}

function formatVolume(val) {
  if (!val || isNaN(val)) return '—';
  const num = Number(val);
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} L`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toLocaleString('en-IN');
}

export default function Watchlist() {
  const navigate = useNavigate();

  // Watchlist tabs & active list state
  const [lists, setLists] = useState(() => getNamedLists());
  const [activeListId, setActiveListId] = useState('default');
  const [tickerList, setTickerList] = useState([]);

  // Stock details map: { [ticker]: { data, loading, error } }
  const [stocksData, setStocksData] = useState({});

  // UI state
  const [isEditMode, setIsEditMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [showNewListModal, setShowNewListModal] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Load active watchlist tickers from storage
  const loadTickers = useCallback((listId) => {
    const tickers = getWatchlist(listId);
    setTickerList(tickers);
  }, []);

  useEffect(() => {
    loadTickers(activeListId);
  }, [activeListId, loadTickers]);

  // Fetch stock data for tickers
  useEffect(() => {
    let isCancelled = false;

    tickerList.forEach(async (ticker) => {
      // If already cached and valid, skip refetching unless needed
      setStocksData((prev) => {
        if (prev[ticker]?.data) return prev;
        return {
          ...prev,
          [ticker]: { data: null, loading: true, error: null },
        };
      });

      try {
        const res = await getStock(ticker);
        if (isCancelled) return;

        if (res && res.data) {
          setStocksData((prev) => ({
            ...prev,
            [ticker]: { data: res.data, loading: false, error: null },
          }));
        } else {
          setStocksData((prev) => ({
            ...prev,
            [ticker]: { data: null, loading: false, error: 'No data returned' },
          }));
        }
      } catch (err) {
        if (isCancelled) return;
        setStocksData((prev) => ({
          ...prev,
          [ticker]: {
            data: null,
            loading: false,
            error: err.response?.data?.message || err.message || 'Fetch failed',
          },
        }));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [tickerList]);

  // Add stock handler
  const handleAddStock = (ticker) => {
    const updated = addToWatchlist(ticker, activeListId);
    setTickerList(updated);
  };

  // Remove stock handler
  const handleRemoveStock = (ticker, e) => {
    if (e) e.stopPropagation();
    const updated = removeFromWatchlist(ticker, activeListId);
    setTickerList(updated);
  };

  // Create new named watchlist
  const handleCreateList = (e) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    const created = createNamedList(newListName.trim());
    if (created) {
      const updatedLists = getNamedLists();
      setLists(updatedLists);
      setActiveListId(created.id);
      setNewListName('');
      setShowNewListModal(false);
    }
  };

  // Delete named list
  const handleDeleteList = (listId, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this watchlist?')) {
      deleteNamedList(listId);
      const updatedLists = getNamedLists();
      setLists(updatedLists);
      setActiveListId('default');
    }
  };

  // Filtered rows based on search input
  const filteredRows = useMemo(() => {
    if (!filterQuery.trim()) return tickerList;
    const q = filterQuery.trim().toUpperCase();

    return tickerList.filter((ticker) => {
      const info = stocksData[ticker]?.data;
      const cleanTicker = ticker.replace('.NS', '').toUpperCase();
      const name = (info?.name || '').toUpperCase();
      return cleanTicker.includes(q) || name.includes(q);
    });
  }, [tickerList, filterQuery, stocksData]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Watchlist
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor real-time prices, 52-week ranges, sparklines, and algorithmic signals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEditMode((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-semibold transition shadow-xs ${
              isEditMode
                ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {isEditMode ? (
              <>
                <Check className="h-4 w-4 text-amber-600" />
                Done
              </>
            ) : (
              <>
                <Edit2 className="h-4 w-4 text-slate-500" />
                Edit
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            Add stocks
          </button>
        </div>
      </div>

      {/* Watchlist Tabs & Search Bar Row */}
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-3 md:flex-row md:items-center md:justify-between">
        {/* Watchlist Tabs: "My Watchlist", "+ Watchlist" */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {lists.map((list) => {
            const isActive = list.id === activeListId;
            return (
              <div key={list.id} className="relative flex items-center group">
                <button
                  type="button"
                  onClick={() => setActiveListId(list.id)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                  }`}
                >
                  {list.name}
                </button>

                {/* Allow deleting custom lists */}
                {list.id !== 'default' && isEditMode && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteList(list.id, e)}
                    className="ml-1 rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="Delete watchlist"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => setShowNewListModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3.5 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-700 transition whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Watchlist
          </button>
        </div>

        {/* In-Watchlist Search Bar */}
        <div className="relative w-full sm:w-72">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search in watchlist..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          {filterQuery && (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table Area */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {tickerList.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 shadow-inner">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No stocks in your watchlist yet</h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500">
              Click <span className="font-semibold text-slate-700">Add stocks</span> to track your favorite Indian equity tickers with real-time analytics.
            </p>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 hover:shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              Add stocks
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          /* No search filter matches */
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-semibold text-slate-600">
              No stocks match "{filterQuery}" in this watchlist
            </p>
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="mt-3 text-xs font-bold text-emerald-600 hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          /* Stocks Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  {isEditMode && <th scope="col" className="w-10 px-3 py-3 text-center"></th>}
                  <th scope="col" className="px-4 py-3.5">Company</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Trend</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Mkt price</th>
                  <th scope="col" className="px-4 py-3.5 text-right">1D change</th>
                  <th scope="col" className="px-4 py-3.5 text-right">1D vol</th>
                  <th scope="col" className="px-4 py-3.5 text-center">52W perf</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Signal</th>
                  <th scope="col" className="w-12 px-3 py-3.5 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((ticker) => {
                  const item = stocksData[ticker] || { loading: true };
                  const stock = item.data;
                  const isLoading = item.loading;
                  const error = item.error;

                  // Calculation for 1D Change & Volume
                  const pct = stock ? Number(stock.dayChangePercent || 0) : 0;
                  const isPositive = pct >= 0;

                  // Rupee change
                  let rupeeChange = 0;
                  if (stock?.history5y && stock.history5y.length >= 2) {
                    const lastClose = Number(stock.history5y[stock.history5y.length - 1].close || 0);
                    const prevClose = Number(stock.history5y[stock.history5y.length - 2].close || 0);
                    rupeeChange = lastClose - prevClose;
                  } else if (stock?.lastPrice) {
                    const prev = stock.lastPrice / (1 + pct / 100);
                    rupeeChange = stock.lastPrice - prev;
                  }

                  const volume =
                    stock?.history5y && stock.history5y.length > 0
                      ? stock.history5y[stock.history5y.length - 1].volume
                      : stock?.volume;

                  return (
                    <tr
                      key={ticker}
                      onClick={() => !isEditMode && navigate(`/company/${encodeURIComponent(ticker)}`)}
                      className={`transition ${
                        isEditMode
                          ? 'hover:bg-amber-50/30'
                          : 'cursor-pointer hover:bg-slate-50'
                      }`}
                    >
                      {/* Edit Mode Remove (✕) Column */}
                      {isEditMode && (
                        <td className="w-10 px-3 py-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => handleRemoveStock(ticker, e)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            title={`Remove ${ticker} from watchlist`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      )}

                      {/* Company: Logo + Name + Ticker */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <CompanyLogo
                            ticker={ticker}
                            name={stock?.name}
                            website={stock?.website}
                            size="md"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">
                                {ticker.replace('.NS', '')}
                              </span>
                              {stock?.sector && (
                                <span className="hidden sm:inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  {stock.sector}
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-slate-500 max-w-[200px] sm:max-w-xs">
                              {isLoading ? (
                                <span className="inline-block h-3 w-28 animate-pulse rounded bg-slate-200" />
                              ) : error ? (
                                <span className="inline-flex items-center gap-1 text-rose-500">
                                  <AlertCircle className="h-3 w-3" /> Failed to load
                                </span>
                              ) : (
                                stock?.name || ticker
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trend: Mini Sparkline */}
                      <td className="px-4 py-4 text-center">
                        {isLoading ? (
                          <div className="mx-auto h-7 w-20 animate-pulse rounded bg-slate-100" />
                        ) : error ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <div className="inline-flex items-center justify-center">
                            <Sparkline history={stock?.history5y} />
                          </div>
                        )}
                      </td>

                      {/* Mkt Price */}
                      <td className="px-4 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                        {isLoading ? (
                          <div className="ml-auto h-4 w-16 animate-pulse rounded bg-slate-200" />
                        ) : error ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          `₹${formatINR(stock?.lastPrice)}`
                        )}
                      </td>

                      {/* 1D Change: ₹ and % colored green/red */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        {isLoading ? (
                          <div className="ml-auto h-4 w-20 animate-pulse rounded bg-slate-200" />
                        ) : error ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div
                            className={`flex flex-col items-end font-semibold text-xs ${
                              isPositive ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            <span>
                              {isPositive ? '+' : ''}
                              {pct.toFixed(2)}%
                            </span>
                            <span className="text-[11px] opacity-85">
                              {isPositive ? '+' : ''}₹{formatINR(Math.abs(rupeeChange))}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 1D Vol */}
                      <td className="px-4 py-4 text-right font-medium text-xs text-slate-600 whitespace-nowrap">
                        {isLoading ? (
                          <div className="ml-auto h-4 w-14 animate-pulse rounded bg-slate-200" />
                        ) : error ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          formatVolume(volume)
                        )}
                      </td>

                      {/* 52W Perf: L - H Range Slider */}
                      <td className="px-4 py-4 text-center">
                        {isLoading ? (
                          <div className="mx-auto h-3 w-28 animate-pulse rounded bg-slate-200" />
                        ) : error ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : (
                          <div className="inline-flex items-center justify-center">
                            <Perf52WSlider
                              low={stock?.week52Low}
                              high={stock?.week52High}
                              currentPrice={stock?.lastPrice}
                            />
                          </div>
                        )}
                      </td>

                      {/* Signal: B / S / — Badge */}
                      <td className="px-4 py-4 text-center">
                        {isLoading ? (
                          <div className="mx-auto h-6 w-6 animate-pulse rounded-md bg-slate-100" />
                        ) : error ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <WatchlistSignalBadge signal={stock?.signal} />
                        )}
                      </td>

                      {/* Detail navigation arrow / action */}
                      <td className="px-3 py-4 text-center text-slate-300 hover:text-emerald-600">
                        <ExternalLink className="h-4 w-4" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      <AddStockModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddStock}
        existingTickers={tickerList}
      />

      {/* Create New Watchlist Modal */}
      {showNewListModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowNewListModal(false)}
          />
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 shadow-2xl z-10 border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Create New Watchlist</h3>
            <p className="text-xs text-slate-500 mb-4">Give your watchlist a memorable name</p>

            <form onSubmit={handleCreateList}>
              <input
                type="text"
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. Banking Stocks, Long Term..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewListModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newListName.trim()}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
