import React from 'react';

/**
 * WatchlistSignalBadge component:
 * Maps the existing signal verdict to a compact colored badge:
 * - "BUY" -> green "B"
 * - "AVOID" -> red "S"
 * - "HOLD" / undefined -> neutral dash "—"
 * Keeps row layout consistent either way.
 */
export default function WatchlistSignalBadge({ signal }) {
  const verdict = (signal?.verdict || '').toUpperCase();

  if (verdict === 'BUY') {
    return (
      <span
        title="Signal: BUY"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-black shadow-xs cursor-default"
      >
        B
      </span>
    );
  }

  if (verdict === 'AVOID') {
    return (
      <span
        title="Signal: AVOID / SELL"
        className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-rose-100 text-rose-800 border border-rose-300 text-xs font-black shadow-xs cursor-default"
      >
        S
      </span>
    );
  }

  return (
    <span
      title={verdict === 'HOLD' ? 'Signal: HOLD' : 'No signal available'}
      className="inline-flex h-6 w-6 items-center justify-center text-slate-300 font-semibold text-xs"
    >
      —
    </span>
  );
}
