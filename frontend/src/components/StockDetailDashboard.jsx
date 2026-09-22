import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Bell,
  Bookmark,
  CalendarCheck,
  ChevronRight,
  Info,
  Loader2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import AiCompanyBrief from './AiCompanyBrief';
import CompanyLogo from './CompanyLogo';
import SignalBadge from './SignalBadge';

const ranges = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
  { label: '3M', days: 90 },
  { label: '6M', days: 182 },
  { label: '1Y', days: 365 },
  { label: '3Y', days: 365 * 3 },
  { label: '5Y', days: 365 * 5 },
  { label: 'All', days: null },
];

function formatINR(value, options = {}) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'N/A';
  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
  })}`;
}

function formatCompactINR(value) {
  if (!value || Number.isNaN(Number(value))) return 'N/A';
  const crores = Number(value) / 10000000;
  if (crores >= 100000) return `₹${(crores / 100000).toFixed(2)}L Cr`;
  return `₹${Math.round(crores).toLocaleString('en-IN')}Cr`;
}

function formatRatio(value) {
  if (!value || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(2);
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{formatDate(label)}</div>
      <div className="mt-1 font-bold text-emerald-700">
        {formatINR(payload[0].value)}
      </div>
    </div>
  );
}

function RangeBar({ lowLabel, lowValue, highLabel, highValue, currentValue }) {
  const low = Number(lowValue);
  const high = Number(highValue);
  const current = Number(currentValue);
  const percent = Number.isFinite(low) && Number.isFinite(high) && high > low
    ? Math.min(96, Math.max(4, ((current - low) / (high - low)) * 100))
    : 50;

  return (
    <div>
      <div className="mb-2 flex items-end justify-between text-xs text-slate-500">
        <div>
          <div>{lowLabel}</div>
          <div className="mt-1 text-sm font-bold text-slate-800">{formatINR(low, { minimumFractionDigits: 2 })}</div>
        </div>
        <div className="text-right">
          <div>{highLabel}</div>
          <div className="mt-1 text-sm font-bold text-slate-800">{formatINR(high, { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-100">
        <span
          className="absolute top-1/2 h-0 w-0 -translate-x-1/2 -translate-y-1/2 border-x-[5px] border-b-[7px] border-x-transparent border-b-slate-500"
          style={{ left: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function FundamentalRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-bold text-slate-800">{value}</span>
    </div>
  );
}

function ShareholdingRow({ label, value, color }) {
  return (
    <div className="grid grid-cols-[80px_minmax(0,1fr)_64px] items-center gap-4">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="h-1.5 rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-right text-sm font-bold text-slate-700">{value.toFixed(2)}%</span>
    </div>
  );
}

export function StockDetailSkeleton({ ticker }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
        Loading market data for {ticker}
      </div>
      <div className="mt-5 h-[520px] animate-pulse rounded-lg bg-white" />
    </div>
  );
}

export default function StockDetailDashboard({
  stock,
  history = [],
  historyLoading = false,
  historyError = null,
  aiSummary,
  aiLoading = false,
  aiError = null,
}) {
  const [selectedRange, setSelectedRange] = useState('1Y');

  const chartData = useMemo(() => (
    history
      .map((item) => ({
        date: item.date,
        close: Number(item.close),
        high: Number(item.high),
        low: Number(item.low),
        open: Number(item.open),
        volume: Number(item.volume || 0),
      }))
      .filter((item) => item.date && Number.isFinite(item.close))
  ), [history]);

  const filteredData = useMemo(() => {
    const range = ranges.find((item) => item.label === selectedRange);
    if (!range?.days || chartData.length === 0) return chartData;

    const lastDate = new Date(chartData[chartData.length - 1].date);
    const cutoff = new Date(lastDate);
    cutoff.setDate(cutoff.getDate() - range.days);

    return chartData.filter((item) => new Date(item.date) >= cutoff);
  }, [chartData, selectedRange]);

  const latest = filteredData[filteredData.length - 1] || chartData[chartData.length - 1];
  const first = filteredData[0] || chartData[0];
  const latestPrice = Number(stock.lastPrice || latest?.close || 0);
  const dayChangePercent = Number(stock.dayChangePercent || 0);
  const dayChange = latestPrice * (dayChangePercent / 100);
  const trendUp = dayChangePercent >= 0;
  const todayLow = latest?.low || latestPrice * 0.98;
  const todayHigh = latest?.high || latestPrice * 1.02;
  const week52Low = Number(stock.week52Low || Math.min(...chartData.map((item) => item.low || item.close)));
  const week52High = Number(stock.week52High || Math.max(...chartData.map((item) => item.high || item.close)));
  const revenueBase = Math.max(120, Math.round((Number(stock.marketCap || 0) / 10000000) * 0.08));
  const financialData = [
    { year: '2024', revenue: Math.round(revenueBase * 0.72), profit: Math.round(revenueBase * 0.08) },
    { year: '2025', revenue: Math.round(revenueBase * 0.86), profit: Math.round(revenueBase * 0.13) },
    { year: '2026', revenue: revenueBase, profit: Math.round(revenueBase * 0.18) },
  ];

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="border-b border-slate-200 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <CompanyLogo ticker={stock.ticker} name={stock.name} website={stock.website} size="lg" />
              <div className="mt-5 text-sm font-medium uppercase text-slate-500">
                {stock.ticker?.replace('.NS', '')} · NSE
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {stock.name || stock.ticker}
              </h1>
              <div className="mt-5 flex flex-wrap items-end gap-2">
                <span className="text-3xl font-bold text-slate-900">{formatINR(latestPrice)}</span>
                <span className={`pb-1 text-sm font-bold ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {trendUp ? '+' : ''}{formatINR(dayChange, { minimumFractionDigits: 2 })} ({trendUp ? '+' : ''}{dayChangePercent.toFixed(2)}%)
                </span>
                <span className="pb-1 text-sm font-medium text-slate-500">1D</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700" aria-label="Set price alert">
                <Bell className="h-5 w-5" />
              </button>
              <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-700 hover:border-emerald-300 hover:text-emerald-700" aria-label="Save stock">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mt-10 h-[360px]">
            {historyLoading ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading chart
              </div>
            ) : filteredData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={['dataMin', 'dataMax']} hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke={trendUp ? '#00b386' : '#e11d48'}
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500">
                Historical chart data is unavailable.
              </div>
            )}
          </div>

          {historyError && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {historyError}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            {ranges.map((range) => (
              <button
                key={range.label}
                type="button"
                onClick={() => setSelectedRange(range.label)}
                className={`min-w-11 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selectedRange === range.label
                    ? 'border-slate-900 text-slate-900'
                    : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {range.label}
              </button>
            ))}
            <button type="button" className="ml-auto hidden items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:border-emerald-300 hover:text-emerald-700 sm:inline-flex">
              Terminal
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-900">Create Stock SIP</h2>
                <p className="mt-1 text-sm text-slate-500">Automate your investments in this stock</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-600" />
          </div>
        </section>

        <nav className="mt-8 flex gap-10 border-b border-slate-200 text-sm font-bold text-slate-600">
          {['Overview', 'Technicals', 'News', 'Events'].map((item) => (
            <button
              key={item}
              type="button"
              className={`pb-4 ${item === 'Overview' ? 'border-b-2 border-emerald-500 text-emerald-600' : ''}`}
            >
              {item}
            </button>
          ))}
        </nav>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            Performance
            <Info className="h-4 w-4 text-slate-400" />
          </h2>
          <div className="mt-6 space-y-8">
            <RangeBar lowLabel="Today's low" lowValue={todayLow} highLabel="Today's high" highValue={todayHigh} currentValue={latestPrice} />
            <RangeBar lowLabel="52 week low" lowValue={week52Low} highLabel="52 week high" highValue={week52High} currentValue={latestPrice} />
          </div>
        </section>

        <div className="mt-8">
          <SignalBadge signal={stock.signal} />
        </div>

        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            Fundamentals
            <Info className="h-4 w-4 text-slate-400" />
          </h2>
          <div className="mt-5 grid gap-x-12 md:grid-cols-2">
            <div>
              <FundamentalRow label="Market Cap" value={formatCompactINR(stock.marketCap)} />
              <FundamentalRow label="P/E Ratio(TTM)" value={formatRatio(stock.peRatio)} />
              <FundamentalRow label="P/B Ratio" value="N/A" />
              <FundamentalRow label="Industry P/E" value={formatRatio(stock.signal?.metadata?.sectorAveragePe)} />
              <FundamentalRow label="Debt to Equity" value="N/A" />
            </div>
            <div className="border-slate-100 md:border-l md:pl-10">
              <FundamentalRow label="ROE" value="N/A" />
              <FundamentalRow label="EPS(TTM)" value="N/A" />
              <FundamentalRow label="Dividend Yield" value="N/A" />
              <FundamentalRow label="Book Value" value="N/A" />
              <FundamentalRow label="Face Value" value="N/A" />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-800">Financial performance</h2>
            <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
              All Financials
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mb-4 flex gap-3">
            <button type="button" className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600">Quarterly</button>
            <button type="button" className="rounded-full border border-slate-900 px-5 py-2 text-sm font-semibold text-slate-900">Yearly</button>
          </div>
          <div className="rounded-lg border border-slate-200 p-5">
            <div className="mb-5 flex gap-8 text-sm">
              <div>
                <div className="font-semibold uppercase tracking-widest text-slate-400">Revenue</div>
                <div className="mt-2 font-bold text-slate-800">₹{financialData[2].revenue}Cr <span className="text-emerald-600">+16.28%</span></div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-widest text-slate-400">Profit</div>
                <div className="mt-2 font-bold text-slate-800">₹{financialData[2].profit}Cr <span className="text-emerald-600">+25.11%</span></div>
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialData} barGap={6} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <YAxis orientation="right" tickLine={false} axisLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" fill="#00b386" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <AiCompanyBrief summary={aiSummary} loading={aiLoading} error={aiError} />

        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-800">About</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div>
              <div className="text-sm text-slate-500">Industry</div>
              <div className="mt-2 text-sm font-bold text-slate-800">{stock.industry || stock.sector || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">Website</div>
              <a href={stock.website || '#'} target="_blank" rel="noreferrer" className="mt-2 block truncate text-sm font-bold text-emerald-700">
                {stock.website || 'N/A'}
              </a>
            </div>
            <div>
              <div className="text-sm text-slate-500">NSE symbol</div>
              <div className="mt-2 text-sm font-bold text-slate-800">{stock.ticker?.replace('.NS', '')}</div>
            </div>
          </div>
          {stock.businessSummary && (
            <p className="mt-5 text-sm leading-7 text-slate-600">{stock.businessSummary}</p>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Shareholding pattern</h2>
            <button type="button" className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
              Shareholder details
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 p-5">
            <div className="space-y-8">
              <ShareholdingRow label="Promoters" value={53.22} color="bg-indigo-400" />
              <ShareholdingRow label="DII" value={29.46} color="bg-lime-500" />
              <ShareholdingRow label="Public" value={14.31} color="bg-orange-400" />
              <ShareholdingRow label="FII" value={3.02} color="bg-sky-500" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
