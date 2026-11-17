import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight, TrendingDown, TrendingUp } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import { formatINR, formatPercent } from '../services/portfolioAnalytics';

export default function PortfolioGainersLosers({ gainers = [], losers = [] }) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Top Gainers Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Top Gainers</h3>
              <p className="text-[11px] text-slate-500">Highest % returns in your portfolio</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
            {gainers.length} {gainers.length === 1 ? 'Holding' : 'Holdings'}
          </span>
        </div>

        {gainers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No holdings currently in profit.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {gainers.map((item) => (
              <div
                key={item.holdingKey}
                onClick={() => navigate(`/company/${encodeURIComponent(item.stockSymbol)}`)}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanyLogo ticker={item.stockSymbol} name={item.companyName} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate group-hover:text-emerald-700 transition">
                      {item.companyName}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{item.stockSymbol}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600">{formatINR(item.currentPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-0.5 text-xs font-black text-emerald-600">
                    <ArrowUpRight className="h-3 w-3" />
                    {formatPercent(item.returnPercent)}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-700">
                    +{formatINR(item.unrealizedPnl)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Losers Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700">
              <TrendingDown className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Top Losers</h3>
              <p className="text-[11px] text-slate-500">Holdings trading below cost basis</p>
            </div>
          </div>
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
            {losers.length} {losers.length === 1 ? 'Holding' : 'Holdings'}
          </span>
        </div>

        {losers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No holdings currently in loss.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {losers.map((item) => (
              <div
                key={item.holdingKey}
                onClick={() => navigate(`/company/${encodeURIComponent(item.stockSymbol)}`)}
                className="flex items-center justify-between py-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <CompanyLogo ticker={item.stockSymbol} name={item.companyName} size="sm" />
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate group-hover:text-rose-700 transition">
                      {item.companyName}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span>{item.stockSymbol}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-600">{formatINR(item.currentPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="inline-flex items-center gap-0.5 text-xs font-black text-rose-600">
                    <ArrowDownRight className="h-3 w-3" />
                    {formatPercent(item.returnPercent)}
                  </div>
                  <div className="text-[10px] font-semibold text-rose-700">
                    {formatINR(item.unrealizedPnl)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
