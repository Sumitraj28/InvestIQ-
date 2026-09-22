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
import { BarChart3, TrendingUp } from 'lucide-react';

const ranges = [
  { label: '6M', days: 182 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 365 * 3 },
  { label: '5Y', days: 365 * 5 },
];

function formatINR(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'N/A';
  return `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function formatVolume(value) {
  if (!value) return 'N/A';
  return Number(value).toLocaleString('en-IN');
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="mb-2 font-semibold text-slate-900">{formatDate(label)}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
        <span>Open</span><span className="text-right font-semibold">{formatINR(row.open)}</span>
        <span>High</span><span className="text-right font-semibold text-emerald-700">{formatINR(row.high)}</span>
        <span>Low</span><span className="text-right font-semibold text-rose-700">{formatINR(row.low)}</span>
        <span>Close</span><span className="text-right font-semibold text-slate-900">{formatINR(row.close)}</span>
        <span>Volume</span><span className="text-right font-semibold">{formatVolume(row.volume)}</span>
      </div>
    </div>
  );
}

export function PriceChartSkeleton() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="animate-pulse">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="h-3 w-56 rounded bg-slate-100" />
          </div>
          <div className="h-8 w-40 rounded bg-slate-100" />
        </div>
        <div className="h-80 rounded-lg bg-slate-100" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-14 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PriceChart({ history = [], ticker = 'Stock', loading = false }) {
  const [selectedRange, setSelectedRange] = useState('5Y');

  const chartData = useMemo(() => (
    history
      .map((item) => ({
        ...item,
        date: item.date,
        close: Number(item.close),
        open: Number(item.open),
        high: Number(item.high),
        low: Number(item.low),
        volume: Number(item.volume || 0),
      }))
      .filter((item) => item.date && Number.isFinite(item.close))
  ), [history]);

  const filteredData = useMemo(() => {
    const range = ranges.find((item) => item.label === selectedRange);
    if (!range || chartData.length === 0) return chartData;

    const lastDate = new Date(chartData[chartData.length - 1].date);
    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - range.days);

    return chartData.filter((item) => new Date(item.date) >= cutoff);
  }, [chartData, selectedRange]);

  if (loading) return <PriceChartSkeleton />;

  if (!filteredData.length) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <BarChart3 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-800">No historical data available</h3>
        <p className="mt-1 text-sm text-slate-500">
          The backend did not return daily OHLCV history for {ticker}.
        </p>
      </section>
    );
  }

  const firstClose = filteredData[0].close;
  const lastClose = filteredData[filteredData.length - 1].close;
  const trendUp = lastClose >= firstClose;
  const trendPercent = firstClose ? ((lastClose - firstClose) / firstClose) * 100 : 0;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            5-Year Price History
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredData.length.toLocaleString('en-IN')} daily OHLCV rows for {ticker}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          {ranges.map((range) => (
            <button
              key={range.label}
              type="button"
              onClick={() => setSelectedRange(range.label)}
              className={`min-w-10 rounded-md px-3 py-1.5 text-xs font-bold transition ${
                selectedRange === range.label
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[320px] w-full rounded-lg border border-slate-100 bg-slate-50/60 p-3">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filteredData} margin={{ top: 10, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              minTickGap={34}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
            />
            <YAxis
              domain={['dataMin', 'dataMax']}
              tickFormatter={(value) => `₹${Math.round(value).toLocaleString('en-IN')}`}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              type="monotone"
              dataKey="close"
              stroke={trendUp ? '#059669' : '#e11d48'}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Range Open</div>
          <div className="mt-1 font-bold text-slate-900">{formatINR(firstClose)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Latest Close</div>
          <div className="mt-1 font-bold text-slate-900">{formatINR(lastClose)}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Range Move</div>
          <div className={`mt-1 font-bold ${trendUp ? 'text-emerald-700' : 'text-rose-700'}`}>
            {trendUp ? '+' : ''}{trendPercent.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-xs font-medium text-slate-500">Latest Volume</div>
          <div className="mt-1 font-bold text-slate-900">
            {formatVolume(filteredData[filteredData.length - 1].volume)}
          </div>
        </div>
      </div>
    </section>
  );
}
