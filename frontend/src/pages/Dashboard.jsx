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
  Zap,
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import CompanyLogo from '../components/CompanyLogo';
import AddInvestmentModal from '../components/AddInvestmentModal';
import MarketOverviewBar from '../components/MarketOverviewBar';
import { getStock, getPortfolioSummary } from '../services/api';
import { popularTickers } from '../data/popularTickers';
import { useAuth, useUser } from '@clerk/react';

function formatINR(val) {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

const marketIndices = [
  { name: 'NIFTY 50', value: '25,327.05', change: '+0.41%', positive: true },
  { name: 'SENSEX', value: '82,679.14', change: '+0.36%', positive: true },
  { name: 'BANK NIFTY', value: '57,221.80', change: '-0.18%', positive: false },
];

const products = [
  { label: 'Stocks', icon: TrendingUp, color: 'bg-emerald-50 text-emerald-700', path: '/invest' },
  { label: 'Portfolio', icon: Wallet, color: 'bg-emerald-50 text-emerald-800', path: '/portfolio' },
  { label: 'Mutual Funds', icon: PieChart, color: 'bg-sky-50 text-sky-700', path: '/invest' },
  { label: 'F&O', icon: LineChart, color: 'bg-violet-50 text-violet-700', path: '/invest' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getToken } = useAuth();

  const [portfolioSummary, setPortfolioSummary] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [stocks, setStocks] = useState([
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: '₹2,985.40', change: '+0.85%', positive: true, sector: 'Energy' },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: '₹4,210.00', change: '-0.45%', positive: false, sector: 'Technology' },
    { ticker: 'INFY.NS', name: 'Infosys Limited', price: '₹1,895.60', change: '+1.15%', positive: true, sector: 'Technology' },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank Limited', price: '₹1,675.20', change: '+0.32%', positive: true, sector: 'Financial Services' },
  ]);

  // Load real user portfolio data
  const loadPortfolio = async () => {
    try {
      const token = await getToken();
      const res = await getPortfolioSummary(token);
      if (res?.success) {
        setPortfolioSummary(res.data);
      }
    } catch (err) {
      console.warn('Dashboard portfolio load:', err);
    } finally {
      setPortfolioLoading(false);
    }
  };

  useEffect(() => {
    loadPortfolio();
  }, [getToken]);

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

  const totalInvested = portfolioSummary?.totalInvested || 0;
  const currentValue = portfolioSummary?.currentValue || 0;
  const totalPnl = portfolioSummary?.totalPnl || 0;
  const totalPnlPercent = portfolioSummary?.totalPnlPercent || 0;
  const isPnlPositive = totalPnl >= 0;
  const totalHoldings = portfolioSummary?.totalHoldings || 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome banner */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#0B3D2C] to-[#145A3E] p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ''} 👋
            </h1>
            <p className="mt-1 text-sm text-white/80">
              Analyze Indian equities, invest with top brokers, and manage your portfolio.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/invest')}
              className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0B3D2C] hover:bg-emerald-50 px-4 py-2.5 text-xs font-extrabold shadow-sm transition"
            >
              <Zap className="h-4 w-4 text-emerald-700" />
              Invest with Broker →
            </button>
            <div className="hidden sm:flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Live NSE Market
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0">
          {/* Search */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Explore</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Search stocks, indices & sectors
              </h2>
            </div>
            <SearchBar />
          </div>

          {/* Genuine Real-time Indian Market Overview Bar */}
          <MarketOverviewBar />

          {/* Products / Quick Investing Tools */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Investing Tools</h2>
                <p className="text-sm text-slate-500">Quick access to broker redirection & tracking</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/invest')}
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition"
              >
                All Brokers
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {products.map((product) => {
                const Icon = product.icon;
                return (
                  <button
                    key={product.label}
                    type="button"
                    onClick={() => navigate(product.path)}
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

          {/* Popular stocks with 1-click Invest */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Popular Stocks</h2>
                <p className="text-sm text-slate-500">Most searched NSE companies</p>
              </div>
              <span className="hidden text-xs font-medium text-slate-400 sm:block">Cached for 15 minutes</span>
            </div>

            <div className="divide-y divide-slate-100">
              {stocks.map((item) => (
                <div
                  key={item.ticker}
                  className="group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 text-left"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/company/${encodeURIComponent(item.ticker)}`)}
                    className="flex min-w-0 items-center gap-3 text-left"
                  >
                    <CompanyLogo ticker={item.ticker} name={item.name} />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-950 transition group-hover:text-emerald-700">
                        {item.name}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {item.ticker} · {item.sector || 'NSE'}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-950">{item.price}</div>
                      <div className={`text-xs font-semibold ${item.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {item.change}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/invest?symbol=${encodeURIComponent(item.ticker)}&name=${encodeURIComponent(item.name)}`)}
                      className="rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 text-xs font-bold transition"
                      title="Invest in this stock"
                    >
                      Invest →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Real Portfolio Value Card */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Portfolio value</p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
                  {portfolioLoading ? 'Loading...' : formatINR(currentValue)}
                </h2>
                <p className={`mt-1 text-xs font-bold ${isPnlPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {isPnlPositive ? '+' : ''}{formatINR(totalPnl)} ({isPnlPositive ? '+' : ''}{totalPnlPercent.toFixed(2)}%)
                </p>
              </div>
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Wallet className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Invested</div>
                <div className="mt-1 font-bold text-slate-950">
                  {portfolioLoading ? '...' : formatINR(totalInvested)}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Holdings</div>
                <div className="mt-1 font-bold text-slate-950">
                  {portfolioLoading ? '...' : `${totalHoldings} stocks`}
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0B3D2C] hover:bg-[#145A3E] px-3 py-2.5 text-xs font-bold text-white transition shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Holding
              </button>
              <button
                type="button"
                onClick={() => navigate('/portfolio')}
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-700 hover:border-emerald-300 hover:text-emerald-700 transition"
              >
                View Portfolio →
              </button>
            </div>
          </section>

          {/* Watchlist Quick-Access */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
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

          {/* Broker Redirection Readiness */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold text-slate-950">Brokers Supported</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Groww, Zerodha Kite, Angel One, and Upstox are connected for seamless 1-click order redirection and manual portfolio tracking.
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/invest')}
                  className="mt-3 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                >
                  Explore Broker Platforms →
                </button>
              </div>
            </div>
          </section>

          {/* Active Holdings Status */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bold text-slate-950">Active Positions</h2>
                  <p className="text-xs text-slate-500">
                    {totalHoldings > 0
                      ? `${totalHoldings} positions in your portfolio`
                      : 'No holdings recorded yet'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/portfolio')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
              >
                Manage
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* Add Investment Modal */}
      <AddInvestmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          loadPortfolio();
        }}
      />
    </div>
  );
}
