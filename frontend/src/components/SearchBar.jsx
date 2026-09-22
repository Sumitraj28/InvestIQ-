import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { popularTickers } from '../data/popularTickers';

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
    <div ref={wrapperRef} className="w-full max-w-2xl mx-auto">
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
          className="w-full pl-11 pr-28 py-3.5 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition"
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
          className="absolute right-2 px-4 sm:px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-md shadow-sm transition"
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
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900">{item.symbol}</div>
                    <div className="truncate text-xs text-slate-500">{item.name}</div>
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
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-md font-medium text-slate-700 hover:text-blue-600 transition"
          >
            {item.symbol.replace('.NS', '')}
          </button>
        ))}
      </div>
    </div>
  );
}
