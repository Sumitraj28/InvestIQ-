import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Clock, Activity, ChevronRight, BarChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMarketOverview } from '../services/api';
import realtimeClient from '../services/realtimeClient';

function formatINR(val) {
  if (val === undefined || val === null || !Number.isFinite(Number(val))) return '—';
  return `₹${Number(val).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MarketOverviewBar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('indices'); // 'indices' | 'gainers' | 'losers' | 'active'

  const fetchData = async () => {
    try {
      const res = await getMarketOverview();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.warn('[MarketOverviewBar] Failed to load market overview:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to market status changes via realtime heartbeat
    const unsub = realtimeClient.onHeartbeat((heartbeat) => {
      if (heartbeat.marketStatus) {
        setData((prev) => (prev ? { ...prev, marketStatus: heartbeat.marketStatus } : prev));
      }
    });

    // Refresh overview every 60 seconds
    const interval = setInterval(fetchData, 60000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (loading && !data) {
    return (
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse">
        <div className="h-5 w-48 bg-slate-200 rounded mb-3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="h-16 bg-slate-100 rounded-lg"></div>
          <div className="h-16 bg-slate-100 rounded-lg"></div>
          <div className="h-16 bg-slate-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const marketStatus = data?.marketStatus || { status: 'CLOSED', isMarketOpen: false, sessionDescription: 'Market Closed' };
  const isOpen = marketStatus.isMarketOpen;
  const indices = data?.indices || [];
  const topGainers = data?.topGainers || [];
  const topLosers = data?.topLosers || [];
  const mostActive = data?.mostActive || [];

  return (
    <div className="mb-6 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition hover:shadow-md">
      {/* Top Header: Session & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center space-x-2.5">
          {/* Status Indicator */}
          <span className="relative flex h-2.5 w-2.5">
            {isOpen && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOpen ? 'bg-emerald-500' : 'bg-slate-400'
            }`}></span>
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            {marketStatus.status || 'NSE / BSE'}
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs text-slate-500">{marketStatus.sessionDescription}</span>
          <span className="hidden md:inline-block text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-medium">
            IST (UTC+5:30)
          </span>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center space-x-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('indices')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === 'indices'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Major Indices
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gainers')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === 'gainers'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Top Gainers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('losers')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === 'losers'
                ? 'bg-rose-50 text-rose-800 border border-rose-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Top Losers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`rounded-lg px-2.5 py-1 font-semibold transition ${
              activeTab === 'active'
                ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            Most Active
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="mt-3.5">
        {activeTab === 'indices' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {indices.map((idx) => {
              const hasPrice = idx.lastPrice !== null && idx.lastPrice !== undefined && !isNaN(idx.lastPrice);
              const isPositive = (idx.change || 0) >= 0;
              return (
                <div
                  key={idx.name}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold text-slate-500">{idx.name}</span>
                      {idx.dataFreshness && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          idx.dataFreshness === 'LIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : idx.dataFreshness === 'DELAYED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {idx.dataFreshness}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold text-slate-900 mt-0.5">
                      {hasPrice
                        ? `₹${Number(idx.lastPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : <span className="text-xs text-slate-400 font-medium">Quote Unavailable</span>}
                    </div>
                  </div>
                  {hasPrice && idx.change !== null && idx.percentChange !== null ? (
                    <div className={`text-right text-xs font-bold flex items-center space-x-1 ${
                      isPositive ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      <span>
                        {isPositive ? '+' : ''}{Number(idx.change).toFixed(2)} ({isPositive ? '+' : ''}{Number(idx.percentChange).toFixed(2)}%)
                      </span>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-slate-400 font-medium">—</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'gainers' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {topGainers.map((s) => (
                <Link
                  key={s.symbol}
                  to={`/company/${s.symbol}.NS`}
                  className="rounded-xl border border-emerald-100/80 bg-emerald-50/30 p-2.5 transition hover:bg-emerald-50 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{s.symbol}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{formatINR(s.lastPrice)}</div>
                  <div className="text-[11px] font-bold text-emerald-600 mt-1 flex items-center space-x-0.5">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{Number(s.dayChangePercent || 0).toFixed(2)}%</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-400 text-right">
              * Rankings computed across tracked NIFTY 50 universe
            </p>
          </div>
        )}

        {activeTab === 'losers' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {topLosers.map((s) => (
                <Link
                  key={s.symbol}
                  to={`/company/${s.symbol}.NS`}
                  className="rounded-xl border border-rose-100/80 bg-rose-50/30 p-2.5 transition hover:bg-rose-50 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{s.symbol}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{formatINR(s.lastPrice)}</div>
                  <div className="text-[11px] font-bold text-rose-600 mt-1 flex items-center space-x-0.5">
                    <TrendingDown className="h-3 w-3" />
                    <span>{Number(s.dayChangePercent || 0).toFixed(2)}%</span>
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-400 text-right">
              * Rankings computed across tracked NIFTY 50 universe
            </p>
          </div>
        )}

        {activeTab === 'active' && (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {mostActive.map((s) => (
                <Link
                  key={s.symbol}
                  to={`/company/${s.symbol}.NS`}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 transition hover:bg-slate-100/80 hover:shadow-sm"
                >
                  <div className="text-xs font-bold text-slate-900 truncate">{s.symbol}</div>
                  <div className="text-xs font-medium text-slate-600 mt-0.5">{formatINR(s.lastPrice)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    Vol: {((s.volume || 0) / 100000).toFixed(1)}L
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-slate-400 text-right">
              * Ranked by turnover across tracked NIFTY 50 universe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
