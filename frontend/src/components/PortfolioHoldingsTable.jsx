import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Edit2,
  ExternalLink,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import BrokerLogo from './BrokerLogo';
import { formatINR, formatPercent } from '../services/portfolioAnalytics';

export default function PortfolioHoldingsTable({
  enrichedHoldings = [],
  loading = false,
  onEditTransaction,
  onDeleteTransaction,
  onAddTransaction,
}) {
  const navigate = useNavigate();

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL'); // 'ALL' | 'MANUAL' | 'SYNCED'
  const [perfFilter, setPerfFilter] = useState('ALL'); // 'ALL' | 'PROFIT' | 'LOSS' | 'UNPRICED'
  const [sortBy, setSortBy] = useState('invested_desc'); // 'invested_desc' | 'value_desc' | 'pnl_desc' | 'return_desc' | 'name_asc'

  // Expanded rows state (holdingKey -> boolean)
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (key) => {
    setExpandedRows((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered & Sorted Holdings
  const processedHoldings = useMemo(() => {
    let result = enrichedHoldings.filter((h) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesName = h.companyName.toLowerCase().includes(q);
        const matchesSymbol = h.stockSymbol.toLowerCase().includes(q);
        if (!matchesName && !matchesSymbol) return false;
      }

      // 2. Broker Filter
      if (brokerFilter !== 'ALL' && h.brokerName !== brokerFilter) {
        return false;
      }

      // 3. Source Filter
      if (sourceFilter === 'MANUAL' && h.source === 'broker_synced') {
        return false;
      }
      if (sourceFilter === 'SYNCED' && h.source !== 'broker_synced') {
        return false;
      }

      // 4. Performance Filter
      if (perfFilter === 'PROFIT' && (!h.priceAvailable || h.unrealizedPnl <= 0)) {
        return false;
      }
      if (perfFilter === 'LOSS' && (!h.priceAvailable || h.unrealizedPnl >= 0)) {
        return false;
      }
      if (perfFilter === 'UNPRICED' && h.priceAvailable) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'invested_desc') return b.totalInvested - a.totalInvested;
      if (sortBy === 'value_desc') return (b.currentValue || 0) - (a.currentValue || 0);
      if (sortBy === 'pnl_desc') return (b.unrealizedPnl || -Infinity) - (a.unrealizedPnl || -Infinity);
      if (sortBy === 'return_desc') return (b.returnPercent || -Infinity) - (a.returnPercent || -Infinity);
      if (sortBy === 'name_asc') return a.companyName.localeCompare(b.companyName);
      return 0;
    });

    return result;
  }, [enrichedHoldings, searchQuery, brokerFilter, sourceFilter, perfFilter, sortBy]);

  const hasActiveFilters = searchQuery || brokerFilter !== 'ALL' || sourceFilter !== 'ALL' || perfFilter !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setBrokerFilter('ALL');
    setSourceFilter('ALL');
    setPerfFilter('ALL');
    setSortBy('invested_desc');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      {/* Controls Bar */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Portfolio Equity Holdings
          </h2>
          <p className="text-xs text-slate-500">
            Weighted-average cost basis compared against live market values
          </p>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or ticker..."
              className="rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden w-44 sm:w-52"
            />
          </div>

          {/* Broker Filter */}
          <select
            value={brokerFilter}
            onChange={(e) => setBrokerFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Brokers</option>
            <option value="Groww">Groww</option>
            <option value="Zerodha Kite">Zerodha Kite</option>
            <option value="Angel One">Angel One</option>
            <option value="Upstox">Upstox</option>
            <option value="Other">Other</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Sources</option>
            <option value="MANUAL">Manual Logs Only</option>
            <option value="SYNCED">Broker Synced Only</option>
          </select>

          {/* Performance Status Filter */}
          <select
            value={perfFilter}
            onChange={(e) => setPerfFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="PROFIT">Profitable Only</option>
            <option value="LOSS">Loss-Making Only</option>
            <option value="UNPRICED">Price Unavailable</option>
          </select>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
            <ArrowUpDown className="h-3 w-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-hidden font-semibold text-slate-700 cursor-pointer"
            >
              <option value="invested_desc">Invested Capital (High-Low)</option>
              <option value="value_desc">Current Value (High-Low)</option>
              <option value="pnl_desc">Unrealized P&L (High-Low)</option>
              <option value="return_desc">Return % (High-Low)</option>
              <option value="name_asc">Company Name (A-Z)</option>
            </select>
          </div>

          {/* Reset button if active */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-bold text-rose-600 hover:text-rose-800 underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Holdings Table */}
      {loading ? (
        <div className="flex h-48 flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          <p className="text-xs font-medium text-slate-500">Updating portfolio holdings & market quotes...</p>
        </div>
      ) : processedHoldings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No holdings found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {hasActiveFilters
              ? 'No holdings match your current search and filter criteria.'
              : 'You have not recorded any investments yet.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Company</th>
                <th className="pb-3">Broker</th>
                <th className="pb-3 text-right">Quantity</th>
                <th className="pb-3 text-right">Avg Buy Price</th>
                <th className="pb-3 text-right">Market Price</th>
                <th className="pb-3 text-right">Current Value</th>
                <th className="pb-3 text-right">Unrealized P&L</th>
                <th className="pb-3 text-right">Return %</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedHoldings.map((h) => {
                const isPos = (h.unrealizedPnl || 0) >= 0;
                const isExpanded = !!expandedRows[h.holdingKey];

                return (
                  <React.Fragment key={h.holdingKey}>
                    <tr className="group hover:bg-slate-50/80 transition">
                      {/* Company Name & Expand Toggle */}
                      <td className="py-3.5 pl-2">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            onClick={() => toggleRow(h.holdingKey)}
                            className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition"
                            title={isExpanded ? 'Collapse transaction details' : 'Expand transaction details'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                          </button>
                          <CompanyLogo ticker={h.stockSymbol} name={h.companyName} size="sm" />
                          <div>
                            <button
                              type="button"
                              onClick={() => navigate(`/company/${encodeURIComponent(h.stockSymbol)}`)}
                              className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition hover:underline text-left block"
                            >
                              {h.companyName}
                            </button>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <span>{h.stockSymbol}</span>
                              <span>·</span>
                              <span className="font-semibold text-slate-500">{h.exchange || 'NSE'}</span>
                              <span>·</span>
                              <span>{h.sector}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Broker & Source */}
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <BrokerLogo broker={h.brokerName} size="sm" />
                          <div>
                            <span className="font-semibold text-slate-700 block">{h.brokerName}</span>
                            <div className="flex items-center gap-1 mt-0.5">
                              {h.source === 'broker_synced' || h.source === 'broker_sync' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700">
                                  Synced
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-slate-100 text-slate-600">
                                  Manual
                                </span>
                              )}
                              {h.reconciled && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800">
                                  Reconciled
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Quantity */}
                      <td className="py-3.5 text-right font-bold text-slate-900">
                        {Number(h.totalQuantity).toLocaleString('en-IN')}
                      </td>

                      {/* Avg Buy Price */}
                      <td className="py-3.5 text-right font-medium text-slate-700">
                        {formatINR(h.averagePrice)}
                      </td>

                      {/* Market Price & Day Move */}
                      <td className="py-3.5 text-right">
                        {h.priceAvailable ? (
                          <div>
                            <div className="font-extrabold text-slate-900">
                              {formatINR(h.currentPrice)}
                            </div>
                            {h.dayChangePercent !== null && (
                              <span
                                className={`text-[10px] font-bold ${
                                  h.dayChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {h.dayChangePercent >= 0 ? '+' : ''}
                                {Number(h.dayChangePercent).toFixed(2)}% (1D)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Price Unavailable</span>
                        )}
                      </td>

                      {/* Current Value */}
                      <td className="py-3.5 text-right font-extrabold text-slate-900">
                        {h.currentValue !== null ? (
                          formatINR(h.currentValue)
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">N/A</span>
                        )}
                      </td>

                      {/* Unrealized P&L */}
                      <td className="py-3.5 text-right">
                        {h.unrealizedPnl !== null ? (
                          <div className={isPos ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                            {isPos ? '+' : ''}
                            {formatINR(h.unrealizedPnl)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Return % */}
                      <td className="py-3.5 text-right">
                        {h.returnPercent !== null ? (
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-black ${
                              isPos
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {formatPercent(h.returnPercent)}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onAddTransaction && onAddTransaction(h)}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Record additional buy for this stock"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/invest?symbol=${encodeURIComponent(h.stockSymbol)}&name=${encodeURIComponent(h.companyName)}`
                              )
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="Invest with Broker"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Sub-table for Underlying Transactions */}
                    {isExpanded && h.transactions && h.transactions.length > 0 && (
                      <tr className="bg-slate-50/70 border-b border-slate-100">
                        <td colSpan={9} className="py-3 px-6">
                          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xs">
                            <div className="font-bold text-slate-700 mb-2 flex items-center justify-between">
                              <span>Underlying Purchase Transactions ({h.transactions.length})</span>
                              <span className="text-[11px] text-slate-400 font-normal">
                                Total Invested: {formatINR(h.totalInvested)}
                              </span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {h.transactions.map((tx) => (
                                <div
                                  key={tx.id || tx._id}
                                  className="flex items-center justify-between py-2 text-[11px]"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-slate-700">
                                      {tx.purchaseDate ? new Date(tx.purchaseDate).toLocaleDateString('en-IN') : '—'}
                                    </span>
                                    <span className="text-slate-500">
                                      {tx.quantity} shares @ {formatINR(tx.purchasePrice)}
                                    </span>
                                    {tx.transactionCharges > 0 && (
                                      <span className="text-slate-400">
                                        (+{formatINR(tx.transactionCharges)} charges)
                                      </span>
                                    )}
                                    {tx.notes && (
                                      <span className="text-slate-400 italic truncate max-w-xs">
                                        "{tx.notes}"
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900">
                                      {formatINR(tx.totalCost || tx.purchaseValue)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => onEditTransaction && onEditTransaction(tx)}
                                      className="p-1 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                                      title="Edit transaction"
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onDeleteTransaction && onDeleteTransaction(tx)}
                                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                                      title="Delete transaction"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
