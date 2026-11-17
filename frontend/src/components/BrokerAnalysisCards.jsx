import React from 'react';
import { ArrowDownRight, ArrowUpRight, Layers, ShieldCheck } from 'lucide-react';
import BrokerLogo from './BrokerLogo';
import { formatINR, formatPercent } from '../services/portfolioAnalytics';

export default function BrokerAnalysisCards({ brokerAnalysis = [] }) {
  if (!brokerAnalysis.length) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-700" />
          Broker-Wise Investment Distribution
        </h3>
        <p className="text-xs text-slate-500">
          Portfolio allocation, invested capital, and unrealized returns across your stockbroking accounts
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {brokerAnalysis.map((b) => {
          const isPos = b.unrealizedPnl >= 0;

          return (
            <div
              key={b.brokerName}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md hover:border-emerald-300"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <BrokerLogo broker={b.brokerName} size="sm" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">{b.brokerName}</h4>
                    <span className="text-[10px] text-slate-400">
                      {b.holdingCount} {b.holdingCount === 1 ? 'Holding' : 'Holdings'}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                    isPos ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {isPos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {formatPercent(b.returnPercent)}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Invested Capital:</span>
                  <span className="font-bold text-slate-900">{formatINR(b.totalInvested)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Current Value:</span>
                  <span className="font-bold text-slate-900">
                    {b.hasUnpriced ? (
                      <span className="italic text-slate-500">{formatINR(b.currentValue)}*</span>
                    ) : (
                      formatINR(b.currentValue)
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-semibold">
                  <span className="text-slate-600">Unrealized P&L:</span>
                  <span className={isPos ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold'}>
                    {isPos ? '+' : ''}{formatINR(b.unrealizedPnl)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
