import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import CompanyPage from './pages/CompanyPage';
import { BarChart3, Bell, UserCircle } from 'lucide-react';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm transition group-hover:bg-emerald-700">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Stock<span className="text-emerald-600">Sense</span>
                </span>
                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  India
                </span>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
              <Link to="/" className="text-emerald-700">Explore</Link>
              <span>Investments</span>
              <span>Watchlist</span>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                aria-label="Account"
              >
                <UserCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/company/:ticker" element={<CompanyPage />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row sm:px-6 lg:px-8">
            <p>© {new Date().getFullYear()} StockSense — Indian equity market data.</p>
            <p className="text-slate-400">NSE data cached via MongoDB and the StockSense backend</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}
