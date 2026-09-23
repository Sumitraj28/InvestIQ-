import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import CompanyPage from './pages/CompanyPage';
import Watchlist from './pages/Watchlist';
import ProtectedRoute from './components/ProtectedRoute';
import { Show, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { BarChart3, Bell, Menu, LayoutDashboard } from 'lucide-react';

function AppHeader() {
  const { isSignedIn } = useAuth();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to={isSignedIn ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3D2C] text-white shadow-md transition group-hover:shadow-lg group-hover:scale-105">
            <BarChart3 className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#0B3D2C]">
            Invest<span className="text-emerald-500">IQ</span>
          </span>
        </Link>

        {/* Desktop Nav — changes based on auth state */}
        <Show when="signed-out">
          <nav className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
            <Link to="/" className={`transition ${location.pathname === '/' ? 'text-[#0B3D2C] font-bold' : 'hover:text-emerald-600'}`}>Home</Link>
            <Link to="/watchlist" className={`transition ${location.pathname === '/watchlist' ? 'text-emerald-700 font-bold' : 'hover:text-emerald-600'}`}>Watchlist</Link>
            <span className="cursor-pointer hover:text-emerald-600 transition">Services</span>
            <span className="cursor-pointer hover:text-emerald-600 transition">About</span>
            <span className="cursor-pointer hover:text-emerald-600 transition">Resources</span>
          </nav>
        </Show>

        <Show when="signed-in">
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex">
            <Link
              to="/dashboard"
              className={`flex items-center gap-1.5 transition ${location.pathname === '/dashboard' ? 'text-emerald-700 font-bold' : 'hover:text-emerald-600'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="cursor-pointer hover:text-emerald-600 transition">Investments</span>
            <Link
              to="/watchlist"
              className={`transition ${location.pathname === '/watchlist' ? 'text-emerald-700 font-bold' : 'hover:text-emerald-600'}`}
            >
              Watchlist
            </Link>
          </nav>
        </Show>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <Show when="signed-in">
            <button
              type="button"
              className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50"
              aria-label="Notifications"
            >
              <Bell className="h-[18px] w-[18px]" />
            </button>
            <UserButton afterSignOutUrl="/" />
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="hidden sm:inline-flex text-sm font-semibold text-slate-700 hover:text-emerald-600 transition px-4 py-2 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50">
                Sign In
              </button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="text-sm font-bold text-white bg-[#0B3D2C] hover:bg-[#145A3E] transition px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg">
                Get Started →
              </button>
            </SignUpButton>
          </Show>

          {/* Mobile menu button */}
          <button
            type="button"
            className="inline-flex md:hidden h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-white text-slate-900">
        <AppHeader />

        {/* Main Content Area */}
        <main className="flex-1 bg-slate-50">
          <Routes>
            {/* Public landing page */}
            <Route path="/" element={<Home />} />

            {/* Protected routes — require auth */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/company/:ticker"
              element={
                <ProtectedRoute>
                  <CompanyPage />
                </ProtectedRoute>
              }
            />
            {/* Watchlist route */}
            <Route path="/watchlist" element={<Watchlist />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
              {/* Brand */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3D2C] text-white">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <span className="font-extrabold text-xl tracking-tight text-[#0B3D2C]">
                    Invest<span className="text-emerald-500">IQ</span>
                  </span>
                </div>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Your intelligent companion for Indian equity market analysis, powered by live NSE data and AI insights.
                </p>
              </div>

              {/* Products */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Products</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li className="hover:text-emerald-600 cursor-pointer transition">Stocks</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Mutual Funds</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">F&O</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">US Stocks</li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Resources</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li className="hover:text-emerald-600 cursor-pointer transition">API Docs</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Market News</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Help Center</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Community</li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Company</h3>
                <ul className="space-y-3 text-sm text-slate-500">
                  <li className="hover:text-emerald-600 cursor-pointer transition">About Us</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Careers</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Privacy Policy</li>
                  <li className="hover:text-emerald-600 cursor-pointer transition">Terms of Service</li>
                </ul>
              </div>
            </div>

            <div className="mt-10 border-t border-slate-200 pt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-slate-500">© {new Date().getFullYear()} InvestIQ — Indian equity market intelligence.</p>
              <p className="text-xs text-slate-400">NSE data cached via MongoDB · Powered by yfinance</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
