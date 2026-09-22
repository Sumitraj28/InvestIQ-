import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Globe2,
  IndianRupee,
  Landmark,
  LineChart,
  Scale,
} from 'lucide-react';
import CompanyLogo from './CompanyLogo';

function formatINR(value, options = {}) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return 'N/A';
  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
  })}`;
}

function formatMarketCap(value) {
  if (!value || Number.isNaN(Number(value))) return 'N/A';

  const crores = Number(value) / 10000000;
  if (crores >= 100000) {
    return `₹${(crores / 100000).toLocaleString('en-IN', {
      maximumFractionDigits: 2,
    })} L Cr`;
  }

  return `₹${crores.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })} Cr`;
}

function formatRatio(value) {
  if (!value || Number.isNaN(Number(value))) return 'N/A';
  return Number(value).toFixed(2);
}

function Metric({ icon: Icon, label, value, valueClassName = 'text-slate-900' }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Icon className="h-4 w-4 text-slate-400" />
        <span>{label}</span>
      </div>
      <div className={`mt-2 text-base font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}

export function CompanySummarySkeleton() {
  return (
    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="animate-pulse">
        <div className="flex flex-col justify-between gap-6 md:flex-row">
          <div className="space-y-3">
            <div className="h-7 w-40 rounded bg-slate-200" />
            <div className="h-4 w-72 max-w-full rounded bg-slate-200" />
            <div className="h-4 w-32 rounded bg-slate-100" />
          </div>
          <div className="space-y-3 md:text-right">
            <div className="h-9 w-36 rounded bg-slate-200 md:ml-auto" />
            <div className="h-4 w-24 rounded bg-slate-100 md:ml-auto" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CompanySummary({ stock }) {
  if (!stock) return null;

  const changePercent = Number(stock.dayChangePercent || 0);
  const isPositive = changePercent >= 0;

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-6 border-b border-slate-100 pb-5 md:flex-row md:items-start">
        <div className="flex min-w-0 gap-4">
          <CompanyLogo
            ticker={stock.ticker}
            name={stock.name}
            website={stock.website}
            size="lg"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {stock.ticker}
              </h1>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                NSE
              </span>
            </div>
            <p className="mt-2 text-base font-semibold text-slate-700">{stock.name}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <Building2 className="h-4 w-4" />
              <span>{stock.industry || stock.sector || 'Unknown sector'}</span>
            </div>
            {stock.website && (
              <a
                href={stock.website}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700"
              >
                <Globe2 className="h-4 w-4" />
                Company website
              </a>
            )}
          </div>
        </div>

        <div className="md:text-right">
          <div className="text-3xl font-extrabold text-slate-950">
            {formatINR(stock.lastPrice)}
          </div>
          <div
            className={`mt-2 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-sm font-bold ${
              isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}
          >
            {isPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
            <span>{isPositive ? '+' : ''}{changePercent.toFixed(2)}%</span>
            <span className="font-medium opacity-75">today</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-5 lg:grid-cols-4">
        <Metric icon={Landmark} label="Market Cap" value={formatMarketCap(stock.marketCap)} />
        <Metric icon={Scale} label="P/E Ratio" value={formatRatio(stock.peRatio)} />
        <Metric
          icon={LineChart}
          label="52-Week High"
          value={formatINR(stock.week52High)}
          valueClassName="text-emerald-700"
        />
        <Metric
          icon={IndianRupee}
          label="52-Week Low"
          value={formatINR(stock.week52Low)}
          valueClassName="text-rose-700"
        />
      </div>

      {stock.businessSummary && (
        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-bold text-slate-900">Company Summary</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{stock.businessSummary}</p>
        </div>
      )}

      {stock.lastFetchedAt && (
        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-slate-400">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Updated {new Date(stock.lastFetchedAt).toLocaleString()}</span>
        </div>
      )}
    </section>
  );
}
