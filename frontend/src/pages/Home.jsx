import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  ChevronRight,
  LineChart,
  PieChart,
  Plus,
  ShieldCheck,
  Star,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import CompanyLogo from '../components/CompanyLogo';
import { getStock } from '../services/api';
import { popularTickers } from '../data/popularTickers';

const marketIndices = [
  { name: 'NIFTY 50', value: '25,327.05', change: '+0.41%', positive: true },
  { name: 'SENSEX', value: '82,679.14', change: '+0.36%', positive: true },
  { name: 'BANK NIFTY', value: '57,221.80', change: '-0.18%', positive: false },
];

const products = [
  { label: 'Stocks', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Mutual Funds', icon: PieChart, color: 'bg-sky-50 text-sky-700' },
  { label: 'F&O', icon: LineChart, color: 'bg-violet-50 text-violet-700' },
  { label: 'US Stocks', icon: BarChart3, color: 'bg-amber-50 text-amber-700' },
];

export default function Home() {
  const navigate = useNavigate();

  const [stocks, setStocks] = useState([
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: '₹1,240.40', change: '-0.56%', positive: false, sector: 'Energy' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: '₹2,105.00', change: '-1.11%', positive: false, sector: 'Technology' },
    { ticker: 'INFY.NS', name: 'Infosys Limited', price: '₹1,029.40', change: '-0.88%', positive: false, sector: 'Technology' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', price: 'Loading', change: '0.00%', positive: true, sector: 'Financial Services' },
  ]);

  useEffect(() => {
    let isMounted = true;
    const fetchTopStocks = async () => {
      const symbols = popularTickers.slice(0, 4).map((item) => item.symbol);
      try {
        const promises = symbols.map((sym) => getStock(sym).catch(() => null));
        const results = await Promise.all(promises);

        if (isMounted) {
          const updated = results
            .filter((r) => r && r.data)
            .map((r) => {
              const d = r.data;
              const isPos = (d.dayChangePercent || 0) >= 0;
              return {
                ticker: d.ticker,
                name: d.name,
                price: `₹${Number(d.lastPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
                change: `${isPos ? '+' : ''}${Number(d.dayChangePercent || 0).toFixed(2)}%`,
                positive: isPos,
                sector: d.sector,
              };
            });

          if (updated.length > 0) {
            setStocks(updated);
          }
        }
      } catch (err) {
        console.warn('Could not refresh featured stocks:', err);
      }
    };

    fetchTopStocks();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explore</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                  Stocks, indices, and smart market insights
                </h1>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Market Data Online
              </div>
            </div>
            <SearchBar />
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {marketIndices.map((index) => (
              <button
                key={index.name}
                type="button"
                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{index.name}</div>
                    <div className="mt-1 text-lg font-bold text-slate-950">{index.value}</div>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                      index.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {index.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                    {index.change}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Products</h2>
                <p className="text-sm text-slate-500">Quick access to investing tools</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                aria-label="View all products"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {products.map((product) => {
                const Icon = product.icon;
                return (
                  <button
                    key={product.label}
                    type="button"
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50/30"
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${product.color}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{product.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Popular Stocks</h2>
                <p className="text-sm text-slate-500">Most searched NSE companies</p>
              </div>
              <span className="hidden text-xs font-medium text-slate-400 sm:block">Cached for 15 minutes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {stocks.map((item) => (
                <button
                  key={item.ticker}
                  type="button"
                  onClick={() => navigate(`/company/${encodeURIComponent(item.ticker)}`)}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyLogo ticker={item.ticker} name={item.name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-950 transition group-hover:text-emerald-700">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {item.ticker} · {item.sector || 'NSE'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-950">{item.price}</div>
                      <div className={`text-xs font-semibold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.change}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">Portfolio value</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">₹2,48,590</h2>
                <p className="mt-1 text-sm font-semibold text-emerald-600">+₹8,420 today</p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Invested</div>
                <div className="mt-1 font-bold text-slate-950">₹2,16,300</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Returns</div>
                <div className="mt-1 font-bold text-emerald-600">+14.9%</div>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Add investment
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Watchlist</h2>
                <p className="text-sm text-slate-500">Your top movers</p>
              </div>
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div className="space-y-3">
              {stocks.slice(0, 4).map((item) => (
                <button
                  key={`watch-${item.ticker}`}
                  type="button"
                  onClick={() => navigate(`/company/${encodeURIComponent(item.ticker)}`)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 text-left transition hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <CompanyLogo ticker={item.ticker} name={item.name} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-950">{item.ticker.replace('.NS', '')}</div>
                        <div className="truncate text-xs text-slate-500">{item.name}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-slate-950">{item.price}</div>
                    <div className={`text-xs font-semibold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.change}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">Groww API ready</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Credentials are stored in the backend environment. Connect the API routes to replace sample portfolio figures with live account data.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Briefcase className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">Holdings</h2>
                <p className="text-sm text-slate-500">4 active positions tracked</p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
