import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Clock,
  Layers,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { formatINR, formatPercent } from '../services/portfolioAnalytics';

export default function PortfolioSummaryCards({
  metrics,
  bestPerformer = null,
  worstPerformer = null,
  loading = false,
  refreshing = false,
  lastUpdated = null,
  onRefresh,
}) {
  const isPnlPositive = (metrics?.totalUnrealizedPnl || 0) >= 0;

  return (
    <div className="space-y-4">
      {/* Top Status & Market Freshness Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200/80 pb-3">
        <div className="flex flex-wrap items-center gap-2 text-slate-500">
          <span className="flex items-center gap-1.5 font-semibold text-slate-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Market Valuation
          </span>
          <span>·</span>
          <span>
            {lastUpdated
              ? `Updated ${new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Connecting to market feeds...'}
          </span>
          {metrics?.hasMissingPrices && (
            <>
              <span>·</span>
              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Partial Valuation ({metrics.pricedCount}/{metrics.totalHoldings} stocks priced)
              </span>
            </>
          )}
        </div>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700 transition"
            title="Refresh latest stock quotes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refresh Prices</span>
          </button>
        )}
      </div>

      {/* 6 Primary Financial Metrics Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {/* Card 1: Total Invested */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Invested
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Wallet className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2.5 text-xl font-extrabold text-slate-950 sm:text-2xl">
            {loading ? <div className="h-7 w-28 animate-pulse rounded bg-slate-100" /> : formatINR(metrics?.totalInvested)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Total acquisition cost basis</p>
        </div>

        {/* Card 2: Current Portfolio Value */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Value
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <Zap className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2.5 text-xl font-extrabold text-slate-950 sm:text-2xl">
            {loading ? (
              <div className="h-7 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              formatINR(metrics?.totalCurrentValue)
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Latest market liquidation value</p>
        </div>

        {/* Card 3: Unrealized Profit/Loss */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Unrealized P&L
            </span>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isPnlPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isPnlPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            </span>
          </div>
          <div
            className={`mt-2.5 text-xl font-extrabold sm:text-2xl ${
              isPnlPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {loading ? (
              <div className="h-7 w-28 animate-pulse rounded bg-slate-100" />
            ) : (
              `${isPnlPositive ? '+' : ''}${formatINR(metrics?.totalUnrealizedPnl)}`
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Net unrealized return in ₹</p>
        </div>

        {/* Card 4: Return Percentage */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Return %
            </span>
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                isPnlPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {isPnlPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            </span>
          </div>
          <div
            className={`mt-2.5 text-xl font-extrabold sm:text-2xl ${
              isPnlPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {loading ? (
              <div className="h-7 w-20 animate-pulse rounded bg-slate-100" />
            ) : (
              formatPercent(metrics?.overallReturnPercent)
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">ROI on priced capital</p>
        </div>

        {/* Card 5: Total Holdings */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Holdings
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Building2 className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2.5 text-xl font-extrabold text-slate-950 sm:text-2xl">
            {loading ? <div className="h-7 w-12 animate-pulse rounded bg-slate-100" /> : metrics?.totalHoldings || 0}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            {metrics?.profitableCount || 0} in profit · {metrics?.lossMakingCount || 0} in loss
          </p>
        </div>

        {/* Card 6: Best / Worst Performer */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Top Performer
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-2.5">
            {loading ? (
              <div className="h-7 w-28 animate-pulse rounded bg-slate-100" />
            ) : bestPerformer ? (
              <div>
                <div className="text-base font-extrabold text-slate-900 truncate">
                  {bestPerformer.stockSymbol}
                </div>
                <div className="text-xs font-bold text-emerald-600">
                  {formatPercent(bestPerformer.returnPercent)} ({formatINR(bestPerformer.unrealizedPnl)})
                </div>
              </div>
            ) : (
              <span className="text-xs text-slate-400">No priced holdings</span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Highest % gain holding</p>
        </div>
      </div>
    </div>
  );
}
