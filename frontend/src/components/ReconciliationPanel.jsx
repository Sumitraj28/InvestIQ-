import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldCheck, HelpCircle, ArrowRight } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import BrokerLogo from './BrokerLogo';
import { Link } from 'react-router-dom';

export default function ReconciliationPanel({
  reconciliationRecords = [],
  summary = {},
  loading = false,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="mt-2 text-xs font-medium">Reconciling holdings across brokers...</p>
      </div>
    );
  }

  const hasRecords = reconciliationRecords && reconciliationRecords.length > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-6">
      {/* Title & Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Holdings Reconciliation & Deduplication
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-verifies manual purchase logs with official broker account snapshots to prevent double-counting.
          </p>
        </div>

        <Link
          to="/connected-brokers"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
        >
          Manage Broker Connections <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Unified Holdings</p>
          <p className="text-xl font-black text-slate-900 mt-1">{summary.totalHoldings || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Deduplicated total</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <p className="text-[11px] font-bold uppercase text-emerald-800">Auto-Matched</p>
          <p className="text-xl font-black text-emerald-900 mt-1">{summary.matchedCount || 0}</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Exact share parity</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
          <p className="text-[11px] font-bold uppercase text-amber-800">Variance Review</p>
          <p className="text-xl font-black text-amber-900 mt-1">{summary.reviewCount || 0}</p>
          <p className="text-[10px] text-amber-700 mt-0.5">Quantity discrepancy</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Manual Only</p>
          <p className="text-xl font-black text-slate-900 mt-1">
            {Math.max(0, (summary.manualCount || 0) - (summary.matchedCount || 0))}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Unsynced / Groww</p>
        </div>
      </div>

      {/* Reconciliation Records Table */}
      {!hasRecords ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
          <p className="text-sm font-bold text-slate-800">No Ambiguous Records Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            All your manual entries and synced broker holdings are cleanly reconciled without duplicate positions.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="pb-3 pl-2">Security</th>
                <th className="pb-3">Broker</th>
                <th className="pb-3 text-right">Manual Log</th>
                <th className="pb-3 text-right">Broker Synced</th>
                <th className="pb-3 text-right">Difference</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3 pr-2">Reconciliation Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reconciliationRecords.map((r, idx) => {
                const isMatch = r.matchStatus === 'auto_matched';
                return (
                  <tr key={r.key || idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2">
                        <CompanyLogo ticker={r.symbol} name={r.companyName} size="sm" />
                        <div>
                          <p className="font-bold text-slate-900">{r.companyName}</p>
                          <p className="text-[10px] text-slate-500">{r.symbol}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <BrokerLogo broker={r.broker} size="sm" />
                        <span className="font-semibold text-slate-700 capitalize">{r.broker}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right font-medium text-slate-700">
                      {r.manualQuantity} shs
                    </td>
                    <td className="py-3 text-right font-bold text-slate-900">
                      {r.syncedQuantity} shs
                    </td>
                    <td className="py-3 text-right font-semibold">
                      {r.quantityDifference === 0 ? (
                        <span className="text-slate-400">0</span>
                      ) : (
                        <span className="text-amber-600 font-bold">
                          {r.quantityDifference > 0 ? `+${r.quantityDifference}` : r.quantityDifference}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center">
                      {isMatch ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Matched
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          Review
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-2 text-[11px] text-slate-600 max-w-xs">
                      {r.notes}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
