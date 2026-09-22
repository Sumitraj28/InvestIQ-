import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowRight, BarChart2, Database, Search } from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { getStock } from '../services/api';
import { popularTickers } from '../data/popularTickers';

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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Activity className="w-3.5 h-3.5" />
          <span>Live Indian equity data via yfinance</span>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
          Search Indian stocks and see the market data
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-600 sm:text-lg">
          Pull current price, day movement, company fundamentals, and 5-year daily OHLCV history from the StockSense backend.
        </p>
      </div>

      <div className="mb-14">
        <SearchBar />
      </div>

      <div className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Popular NSE Tickers
          </h2>
          <span className="text-xs text-slate-400">Cached for 15 minutes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stocks.map((item) => (
            <div
              key={item.ticker}
              onClick={() => navigate(`/company/${encodeURIComponent(item.ticker)}`)}
              className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-md"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-slate-900 group-hover:text-blue-600 transition">
                    {item.ticker}
                  </span>
                  <div className="text-xs text-slate-500 truncate max-w-[130px]">
                    {item.name}
                  </div>
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    item.positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {item.change}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-extrabold text-slate-800">
                  {item.price}
                </span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-slate-200 pt-6 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Search className="w-6 h-6 text-blue-600 mb-2" />
          <h3 className="font-semibold text-slate-900 text-sm">Ticker Search</h3>
          <p className="text-xs text-slate-500 mt-1">
            Search by symbol, company, or sector with autocomplete for widely traded NSE names.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <BarChart2 className="w-6 h-6 text-blue-600 mb-2" />
          <h3 className="font-semibold text-slate-900 text-sm">Company Snapshot</h3>
          <p className="text-xs text-slate-500 mt-1">
            View price, day change, market cap, P/E ratio, and 52-week range from the API.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <Database className="w-6 h-6 text-emerald-600 mb-2" />
          <h3 className="font-semibold text-slate-900 text-sm">5-Year History</h3>
          <p className="text-xs text-slate-500 mt-1">
            Render daily close prices with the dedicated history endpoint and Recharts.
          </p>
        </div>
      </div>
    </div>
  );
}
