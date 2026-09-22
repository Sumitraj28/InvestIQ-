import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { popularTickers } from '../data/popularTickers';
import CompanyLogo from './CompanyLogo';

export default function SearchBar({ initialValue = '', onSearch }) {
  const [ticker, setTicker] = useState(initialValue);
  const [debouncedTicker, setDebouncedTicker] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    setTicker(initialValue);
    setDebouncedTicker(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedTicker(ticker.trim().toUpperCase());
    }, 180);

    return () => clearTimeout(timeout);
  }, [ticker]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const query = debouncedTicker.replace('.NS', '');
    if (!query) return popularTickers.slice(0, 8);

    return popularTickers
      .filter((item) => (
        item.symbol.replace('.NS', '').includes(query)
        || item.name.toUpperCase().includes(query)
        || item.sector.toUpperCase().includes(query)
      ))
      .slice(0, 8);
  }, [debouncedTicker]);

  const resolveSearchValue = (value) => {
    const cleanTicker = value.trim().toUpperCase();
    if (!cleanTicker) return '';

    const query = cleanTicker.replace('.NS', '');
    const match = suggestions.find((item) => (
      item.symbol.replace('.NS', '') === query
      || item.name.toUpperCase() === cleanTicker
    )) || suggestions[0];

    if (match && /[ A-Z]/.test(cleanTicker) && !/^[A-Z0-9&-]+(\.(NS|BO))?$/.test(cleanTicker)) {
      return match.symbol;
    }

    return cleanTicker.includes('.') ? cleanTicker : `${cleanTicker}.NS`;
  };

  const runSearch = (value) => {
    const normalizedTicker = resolveSearchValue(value);
    if (!normalizedTicker) return;

    setTicker(normalizedTicker);
    setIsOpen(false);

    if (onSearch) {
      onSearch(normalizedTicker);
    } else {
      navigate(`/company/${encodeURIComponent(normalizedTicker)}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runSearch(ticker);
  };

  return (
    <div ref={wrapperRef} className="w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={ticker}
          onChange={(e) => {
            setTicker(e.target.value.toUpperCase());
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search NSE ticker, company, or sector..."
          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-28 font-medium text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100"
          aria-label="Search NSE ticker"
        />
        {ticker && (
          <button
            type="button"
            onClick={() => {
              setTicker('');
              setDebouncedTicker('');
              setIsOpen(true);
            }}
            className="absolute right-24 h-8 w-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:px-5"
        >
          Search
        </button>

        {isOpen && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {suggestions.map((item) => (
              <button
                key={item.symbol}
                type="button"
                onClick={() => runSearch(item.symbol)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <CompanyLogo ticker={item.symbol} name={item.name} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">{item.symbol}</div>
                      <div className="truncate text-xs text-slate-500">{item.name}</div>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
                    {item.sector}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </form>

      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-slate-500">
        <span className="font-semibold text-slate-600">Popular:</span>
        {popularTickers.slice(0, 8).map((item) => (
          <button
            key={item.symbol}
            type="button"
            onClick={() => runSearch(item.symbol)}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            {item.symbol.replace('.NS', '')}
          </button>
        ))}
      </div>
    </div>
  );
}
