import React from 'react';

/**
 * Formats a number to Indian currency format (e.g., ₹1,240.50)
 */
function formatPrice(val) {
  if (val === undefined || val === null || isNaN(val)) return '—';
  return Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

/**
 * Perf52WSlider component: a horizontal bar from week52Low to week52High
 * with a small marker positioned proportionally at lastPrice — label "L" and "H" at the ends.
 */
export default function Perf52WSlider({ low, high, currentPrice }) {
  const numLow = Number(low);
  const numHigh = Number(high);
  const numCurrent = Number(currentPrice);

  const isValid =
    !isNaN(numLow) &&
    !isNaN(numHigh) &&
    !isNaN(numCurrent) &&
    numHigh > numLow &&
    numLow > 0;

  if (!isValid) {
    return <span className="text-xs text-slate-400">N/A</span>;
  }

  // Calculate percentage between 0% and 100%
  const rawPct = ((numCurrent - numLow) / (numHigh - numLow)) * 100;
  const pct = Math.min(Math.max(rawPct, 0), 100);

  return (
    <div
      className="flex flex-col gap-0.5 min-w-[140px] max-w-[180px]"
      title={`52W Range: ₹${formatPrice(numLow)} - ₹${formatPrice(numHigh)} | Current: ₹${formatPrice(numCurrent)} (${pct.toFixed(0)}%)`}
    >
      {/* Slider Track with L & H labels */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
        <span className="shrink-0 text-slate-500 font-bold">L</span>
        
        {/* Horizontal Bar */}
        <div className="relative h-1.5 flex-1 rounded-full bg-slate-200 overflow-visible">
          {/* Active Gradient Fill up to marker */}
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-300 to-emerald-500"
            style={{ width: `${pct}%` }}
          />
          {/* Marker pin */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-slate-900 border-2 border-white shadow-md transition-all"
            style={{ left: `${pct}%` }}
          />
        </div>

        <span className="shrink-0 text-slate-500 font-bold">H</span>
      </div>

      {/* Numerical Sub-labels */}
      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-2">
        <span>₹{formatPrice(numLow)}</span>
        <span>₹{formatPrice(numHigh)}</span>
      </div>
    </div>
  );
}
