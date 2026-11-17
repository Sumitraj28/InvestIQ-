import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';
import {
  formatINR,
  generateHistoricalPortfolioTrajectory,
} from '../services/portfolioAnalytics';

const RANGES = ['1W', '1M', '3M', '6M', '1Y', 'ALL'];

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const pnl = data.value - data.invested;
  const isPos = pnl >= 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-xl min-w-[140px]">
      <div className="font-bold text-slate-800 mb-1.5">{formatDate(label)}</div>
      <div className="flex items-center justify-between gap-3 text-slate-600 mb-1">
        <span>Portfolio Value:</span>
        <span className="font-extrabold text-slate-900">{formatINR(data.value)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-slate-500 mb-1">
        <span>Invested Capital:</span>
        <span className="font-semibold">{formatINR(data.invested)}</span>
      </div>
      <div className="border-t border-slate-100 pt-1 flex items-center justify-between gap-3">
        <span>Estimated P&L:</span>
        <span className={`font-bold ${isPos ? 'text-emerald-600' : 'text-rose-600'}`}>
          {isPos ? '+' : ''}{formatINR(pnl)}
        </span>
      </div>
    </div>
  );
}

export default function PortfolioPerformanceChart({ enrichedHoldings = [] }) {
  const [selectedRange, setSelectedRange] = useState('1M');

  const chartData = useMemo(() => {
    return generateHistoricalPortfolioTrajectory(enrichedHoldings, selectedRange);
  }, [enrichedHoldings, selectedRange]);

  if (!enrichedHoldings.length || !chartData.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-center">
        <TrendingUp className="mx-auto h-8 w-8 text-slate-300" />
        <h3 className="mt-2 text-sm font-bold text-slate-800">Historical Portfolio Performance</h3>
        <p className="mt-1 text-xs text-slate-500">
          Historical portfolio performance is unavailable. Record stock purchases to calculate trend history.
        </p>
      </div>
    );
  }

  const latestVal = chartData[chartData.length - 1]?.value || 0;
  const firstVal = chartData[0]?.value || 0;
  const rangeChange = latestVal - firstVal;
  const isUp = rangeChange >= 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      {/* Header & Controls */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              Portfolio Value Trajectory
            </h3>
            <p className="text-xs text-slate-500">
              Historical portfolio valuation across your acquisition timeline
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto text-xs font-bold">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1 rounded-lg transition ${
                  selectedRange === r
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Line Chart */}
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="invested"
                stroke="#cbd5e1"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                name="Capital Invested"
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isUp ? '#00b386' : '#e11d48'}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                name="Portfolio Value"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Attribution & Legend Footer */}
      <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-5 bg-emerald-500 rounded" />
            <span className="font-semibold text-slate-700">Market Valuation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 bg-slate-300 border-b border-dashed border-slate-400" />
            <span>Invested Cost Basis</span>
          </div>
        </div>
        <span className="text-slate-400 italic">
          Calculated from recorded acquisition dates & stock market series
        </span>
      </div>
    </div>
  );
}
