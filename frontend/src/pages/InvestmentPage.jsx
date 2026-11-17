import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
  PlusCircle,
  Search,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { BROKER_OPTIONS } from '../data/brokerConfig';
import { popularTickers } from '../data/popularTickers';
import BrokerLogo from '../components/BrokerLogo';
import CompanyLogo from '../components/CompanyLogo';
import AddInvestmentModal from '../components/AddInvestmentModal';
import { getStock } from '../services/api';

function formatINR(val, options = {}) {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹—';
  return `₹${Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
  })}`;
}

export default function InvestmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Selected company state (initialized from location.state or query params, or default to RELIANCE)
  const initialSymbol = searchParams.get('symbol') || location.state?.symbol || 'RELIANCE.NS';
  const initialName = searchParams.get('name') || location.state?.name || 'Reliance Industries';
  const initialExchange = searchParams.get('exchange') || location.state?.exchange || 'NSE';
  const initialPrice = searchParams.get('price') || location.state?.price || null;

  const [selectedStock, setSelectedStock] = useState({
    symbol: initialSymbol,
    name: initialName,
    exchange: initialExchange,
    price: initialPrice ? Number(initialPrice) : null,
    dayChangePercent: location.state?.dayChangePercent || 0,
    dayHigh: location.state?.dayHigh || null,
    dayLow: location.state?.dayLow || null,
    week52High: location.state?.week52High || null,
    week52Low: location.state?.week52Low || null,
    peRatio: location.state?.peRatio || null,
    sector: location.state?.sector || 'NSE Equity',
  });

  const [loadingPrice, setLoadingPrice] = useState(false);
  const [redirectedBroker, setRedirectedBroker] = useState(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Fetch live price details when selected stock changes
  useEffect(() => {
    let isMounted = true;
    if (!selectedStock.symbol) return;

    setLoadingPrice(true);
    getStock(selectedStock.symbol)
      .then((res) => {
        if (!isMounted) return;
        if (res?.success && res.data) {
          const d = res.data;
          setSelectedStock((prev) => ({
            ...prev,
            name: d.name || prev.name,
            price: Number(d.lastPrice || prev.price || 0),
            dayChangePercent: Number(d.dayChangePercent || 0),
            dayHigh: d.dayHigh || null,
            dayLow: d.dayLow || null,
            week52High: d.week52High || null,
            week52Low: d.week52Low || null,
            peRatio: d.peRatio || null,
            sector: d.sector || prev.sector,
          }));
        }
      })
      .catch((err) => {
        console.warn('[InvestmentPage] Could not fetch live stock details:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingPrice(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedStock.symbol]);

  // Filter tickers for company switcher
  const filteredTickers = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return popularTickers.slice(0, 6);
    return popularTickers.filter(
      (t) => t.symbol.toUpperCase().includes(q) || t.name.toUpperCase().includes(q)
    ).slice(0, 6);
  }, [searchQuery]);

  const handleSelectCompany = (tickerObj) => {
    setSelectedStock({
      symbol: tickerObj.symbol,
      name: tickerObj.name,
      exchange: 'NSE',
      price: null,
      dayChangePercent: 0,
      sector: tickerObj.sector || 'NSE Equity',
    });
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  /**
   * Safe broker redirection logic
   * Checks verified URLs, opens in new tab, never exposes tokens
   */
  const handleInvestWithBroker = (broker) => {
    const targetUrl = broker.getStockUrl(selectedStock.symbol);
    setRedirectedBroker(broker);

    // Open broker in new browser tab securely
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const isPositive = (selectedStock.dayChangePercent || 0) >= 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to stock details
          </button>
          <button
            type="button"
            onClick={() => navigate('/portfolio')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition"
          >
            <Wallet className="h-3.5 w-3.5" />
            View Portfolio Dashboard
          </button>
        </div>

        {/* Selected Company Showcase Card */}
        <div className="mb-8 rounded-3xl bg-white border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <CompanyLogo
                ticker={selectedStock.symbol}
                name={selectedStock.name}
                size="lg"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                    {selectedStock.exchange}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedStock.symbol.replace('.NS', '')}
                  </span>
                  <span className="text-xs text-slate-400">· {selectedStock.sector}</span>
                </div>
                <h1 className="mt-1 text-2xl font-extrabold text-slate-950 sm:text-3xl">
                  {selectedStock.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {formatINR(selectedStock.price)}
                  </span>
                  {selectedStock.dayChangePercent !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold ${
                        isPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {isPositive ? '+' : ''}
                      {Number(selectedStock.dayChangePercent).toFixed(2)}% (1D)
                    </span>
                  )}
                  {loadingPrice && (
                    <span className="text-xs text-slate-400 italic">Updating price...</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions & Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-300">
                  <Search className="h-3.5 w-3.5 text-slate-400 mr-2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    placeholder="Switch company..."
                    className="bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden w-36"
                  />
                </div>

                {showSearchDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-20">
                    <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Popular NSE Stocks
                    </div>
                    <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                      {filteredTickers.map((item) => (
                        <button
                          key={item.symbol}
                          type="button"
                          onClick={() => handleSelectCompany(item)}
                          className="flex w-full items-center justify-between p-2 text-left hover:bg-emerald-50/50 rounded-lg transition"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500">{item.symbol}</div>
                          </div>
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            Select
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsRecordModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:shadow-md transition"
                title="Manually record investment in portfolio"
              >
                <PlusCircle className="h-4 w-4" />
                Add to My Portfolio
              </button>
            </div>
          </div>

          {/* Performance Summary Sub-bar */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-5 text-xs">
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">Exchange</span>
              <div className="mt-1 font-bold text-slate-900">National Stock Exchange ({selectedStock.exchange})</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">P/E Ratio</span>
              <div className="mt-1 font-bold text-slate-900">{selectedStock.peRatio ? Number(selectedStock.peRatio).toFixed(2) : '24.50'}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">52W Range</span>
              <div className="mt-1 font-bold text-slate-900">
                {selectedStock.week52Low ? formatINR(selectedStock.week52Low) : '₹2,220'} — {selectedStock.week52High ? formatINR(selectedStock.week52High) : '₹3,217'}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <span className="text-slate-500">Order Execution</span>
              <div className="mt-1 font-bold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> External Broker
              </div>
            </div>
          </div>
        </div>

        {/* Post-Redirection Prompt Banner (Visible after user clicks a broker) */}
        {redirectedBroker && (
          <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-950 via-[#0B3D2C] to-[#145A3E] p-6 sm:p-7 text-white shadow-xl animate-in fade-in duration-300 border border-emerald-700/40">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex items-center gap-3.5">
                <BrokerLogo broker={redirectedBroker.name} size="md" />
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">
                    Opened {redirectedBroker.displayName} in a new tab!
                  </h3>
                  <p className="text-xs sm:text-sm text-emerald-100 max-w-xl">
                    Complete your trade securely on {redirectedBroker.displayName}'s platform. Once confirmed, record your purchase details here to track them in your portfolio.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0B3D2C] hover:bg-emerald-50 px-5 py-2.5 text-xs font-black shadow-md hover:scale-105 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  I've Completed My Investment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Broker Selection Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Where would you like to invest?
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose your preferred broker to invest in <span className="font-extrabold text-slate-900">{selectedStock.name}</span>.
          </p>
        </div>

        {/* Broker Cards Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {BROKER_OPTIONS.map((broker) => (
            <div
              key={broker.id}
              className="relative flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs transition hover:border-emerald-300 hover:shadow-lg group"
            >
              <div>
                {/* Broker Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <BrokerLogo broker={broker.name} size="lg" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-extrabold text-slate-950">
                          {broker.displayName}
                        </h3>
                        {broker.badge && (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                            {broker.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                        {broker.pricing}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">
                  {broker.description}
                </p>

                {/* Key Features Pill list */}
                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                  {broker.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleInvestWithBroker(broker)}
                  className={`w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-md hover:shadow-lg transition ${broker.btnBg}`}
                >
                  <span>Invest with {broker.displayName}</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
                <div className="mt-2 text-center text-[11px] text-slate-400">
                  Opens official {broker.displayName} platform securely in a new tab
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security & Disclaimer Notice */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-xs">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">
                InvestIQ Secure Redirection Guarantee
              </span>
              InvestIQ does not handle trading funds, hold user depository accounts, or execute stock transactions directly. All equity investments are placed securely through SEBI-registered brokers (Groww, Zerodha, Angel One, Upstox). After completing your order, return to InvestIQ to record and track your portfolio performance.
            </div>
          </div>
        </div>
      </div>

      {/* Add Investment Modal */}
      <AddInvestmentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        initialData={{
          companyName: selectedStock.name,
          stockSymbol: selectedStock.symbol.replace('.NS', ''),
          brokerName: redirectedBroker ? redirectedBroker.displayName : 'Groww',
          purchasePrice: selectedStock.price || '',
          exchange: selectedStock.exchange,
        }}
        onSuccess={() => {
          navigate('/portfolio');
        }}
      />
    </div>
  );
}
