import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Lightbulb, ShieldAlert } from 'lucide-react';

export default function PortfolioInsightsCard({ insights = [] }) {
  if (!insights.length) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Rule-Based Portfolio Insights
            </h3>
            <p className="text-xs text-slate-500">
              Objective analytics calculated directly from your recorded holdings and market valuations
            </p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
          Descriptive Analytics · Not Advice
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((item, idx) => {
          const isWarning = item.type === 'warning';
          const isSuccess = item.type === 'success';

          return (
            <div
              key={idx}
              className={`rounded-xl p-4 border text-xs leading-relaxed transition ${
                isWarning
                  ? 'bg-amber-50/60 border-amber-200/90 text-amber-900'
                  : isSuccess
                  ? 'bg-emerald-50/60 border-emerald-200/90 text-emerald-950'
                  : 'bg-slate-50 border-slate-200/80 text-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 font-bold mb-1">
                {isWarning ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                ) : isSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                )}
                <span>{item.title}</span>
              </div>
              <p className="text-slate-600 font-medium pl-5">{item.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
