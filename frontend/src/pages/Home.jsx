import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/react';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  LineChart as LineChartIcon,
  Sliders,
  ExternalLink,
  Menu,
  X,
  Lock,
  Search,
  Zap,
  Clock,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import { popularTickers } from '../data/popularTickers';

export default function Home() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTimeframe, setActivePreviewTimeframe] = useState('1D');
  const [activeIndicator, setActiveIndicator] = useState('SMA 20');

  // Realistic mock candle data for product preview
  const previewCandles = [
    { date: '10:00', open: 2962.5, high: 2975.0, low: 2958.0, close: 2972.1, volume: 1400000 },
    { date: '11:00', open: 2972.1, high: 2984.0, low: 2968.5, close: 2979.8, volume: 1850000 },
    { date: '12:00', open: 2979.8, high: 2988.5, low: 2974.0, close: 2982.4, volume: 1200000 },
    { date: '13:00', open: 2982.4, high: 2994.0, low: 2978.0, close: 2976.2, volume: 1650000 },
    { date: '14:00', open: 2976.2, high: 2989.0, low: 2971.5, close: 2986.5, volume: 2100000 },
    { date: '15:00', open: 2986.5, high: 2998.5, low: 2982.0, close: 2985.4, volume: 2950000 },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#15191E] font-sans antialiased selection:bg-[#176B58]/15 selection:text-[#176B58]">
      {/* ── 1. STICKY EDITORIAL NAVIGATION ── */}
      <header className="sticky top-0 z-50 bg-[#FAFAF8]/90 backdrop-blur-md border-b border-[#E4E7EB] transition-colors">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#176B58] text-white shadow-2xs transition group-hover:bg-[#115343]">
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-[#15191E]">
              Invest<span className="text-[#176B58]">IQ</span>
            </span>
          </Link>

          {/* Desktop Center Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64707D]">
            <a href="#platform" className="hover:text-[#15191E] transition py-1">Platform</a>
            <a href="#features" className="hover:text-[#15191E] transition py-1">Features</a>
            <a href="#markets" className="hover:text-[#15191E] transition py-1">Markets</a>
            <a href="#trust" className="hover:text-[#15191E] transition py-1">About</a>
          </nav>

          {/* Desktop Right Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {isSignedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#176B58] px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-[#115343] transition"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="text-sm font-medium text-[#15191E] hover:text-[#176B58] transition px-3.5 py-2">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="inline-flex items-center rounded-lg bg-[#176B58] px-4 py-2 text-sm font-semibold text-white shadow-2xs hover:bg-[#115343] transition">
                    Get Started
                  </button>
                </SignUpButton>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E7EB] text-[#15191E] hover:bg-[#F0F2F4] transition"
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5 text-[#15191E]" />}
          </button>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E4E7EB] bg-[#FAFAF8] px-6 py-5 space-y-4 shadow-sm animate-in fade-in duration-150">
            <nav className="flex flex-col space-y-3 text-sm font-medium text-[#15191E]">
              <a
                href="#platform"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#176B58] transition"
              >
                Platform
              </a>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#176B58] transition"
              >
                Features
              </a>
              <a
                href="#markets"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#176B58] transition"
              >
                Markets
              </a>
              <a
                href="#trust"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#176B58] transition"
              >
                About
              </a>
            </nav>

            <div className="pt-3 border-t border-[#E4E7EB] flex flex-col gap-2.5">
              {isSignedIn ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center rounded-lg bg-[#176B58] py-2.5 text-sm font-semibold text-white hover:bg-[#115343] transition"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-lg border border-[#E4E7EB] bg-white py-2.5 text-sm font-semibold text-[#15191E] hover:bg-slate-50 transition"
                    >
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full rounded-lg bg-[#176B58] py-2.5 text-sm font-semibold text-white hover:bg-[#115343] transition"
                    >
                      Get Started
                    </button>
                  </SignUpButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── 2. HERO SECTION ── */}
      <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-[#E4E7EB] bg-white px-3.5 py-1 text-xs font-semibold tracking-wider uppercase text-[#176B58] mb-6 shadow-2xs">
          <span className="h-1.5 w-1.5 rounded-full bg-[#176B58]"></span>
          <span>Market Intelligence, Simplified</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#15191E] leading-[1.12] max-w-4xl mx-auto">
          The market moves fast.<br />
          <span className="text-[#176B58]">Stay a step ahead.</span>
        </h1>

        {/* Description */}
        <p className="mt-6 text-lg sm:text-xl text-[#64707D] max-w-2xl mx-auto font-normal leading-relaxed">
          Research stocks, follow market movements, and understand your portfolio—all in one focused workspace.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          {isSignedIn ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#176B58] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-2xs hover:bg-[#115343] transition"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
              <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#176B58] px-6 py-3.5 text-sm sm:text-base font-semibold text-white shadow-2xs hover:bg-[#115343] transition">
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </SignUpButton>
          )}

          <a
            href="#platform"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-[#E4E7EB] bg-white px-6 py-3.5 text-sm sm:text-base font-semibold text-[#15191E] shadow-2xs hover:border-slate-300 hover:bg-[#F3F4F6] transition"
          >
            <span>Explore Platform</span>
          </a>
        </div>

        {/* Factual Sub-note */}
        <p className="mt-4 text-xs text-[#64707D]">
          Independent equity research • Direct broker redirection • No credit card required
        </p>
      </section>

      {/* ── 3. REALISTIC PRODUCT PREVIEW ── */}
      <section id="platform" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="rounded-2xl border border-[#E4E7EB] bg-white shadow-sm overflow-hidden">
          {/* Browser Top Bar Mock */}
          <div className="flex items-center justify-between border-b border-[#E4E7EB] bg-[#F5F6F7] px-4 py-3">
            <div className="flex items-center space-x-2">
              <span className="h-3 w-3 rounded-full bg-[#E4E7EB]"></span>
              <span className="h-3 w-3 rounded-full bg-[#E4E7EB]"></span>
              <span className="h-3 w-3 rounded-full bg-[#E4E7EB]"></span>
            </div>
            <div className="flex items-center space-x-1.5 rounded-md border border-[#E4E7EB] bg-white px-3 py-1 text-xs text-[#64707D] font-mono w-72 max-w-full justify-center">
              <Lock className="h-3 w-3 text-[#176B58]" />
              <span className="truncate">investiq.app/company/RELIANCE.NS</span>
            </div>
            <div className="text-[11px] font-semibold text-[#176B58] bg-[#176B58]/10 px-2 py-0.5 rounded">
              Interactive Preview
            </div>
          </div>

          {/* Product Canvas Content */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Market Overview Ticker */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-[#E4E7EB] pb-5">
              <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#64707D]">NIFTY 50</span>
                  <div className="text-sm font-bold text-[#15191E]">24,150.25</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">+156.40 (+0.65%)</span>
              </div>
              <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#64707D]">SENSEX</span>
                  <div className="text-sm font-bold text-[#15191E]">79,480.10</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">+458.20 (+0.58%)</span>
              </div>
              <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[#64707D]">BANK NIFTY</span>
                  <div className="text-sm font-bold text-[#15191E]">51,200.40</div>
                </div>
                <span className="text-xs font-semibold text-emerald-600">+415.80 (+0.82%)</span>
              </div>
            </div>

            {/* Active Stock Header */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#64707D]">
                    RELIANCE · NSE Equity
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Live Streaming
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-[#15191E] mt-1">
                  Reliance Industries Limited
                </h2>
                <div className="mt-3 flex items-baseline gap-3">
                  <span className="text-3xl font-extrabold text-[#15191E]">₹2,985.40</span>
                  <span className="text-sm font-bold text-emerald-600">+₹25.20 (+0.85%) 1D</span>
                  <span className="text-xs text-[#64707D]">IST 15:30:00</span>
                </div>
              </div>

              {/* Supported Broker Redirection Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/invest?symbol=RELIANCE.NS&name=Reliance%20Industries&price=2985.40"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#176B58] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#115343] transition"
                >
                  <span>Invest Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <div className="hidden lg:flex items-center gap-1 text-[11px] text-[#64707D] border border-[#E4E7EB] rounded-lg px-2.5 py-1.5 bg-[#FAFAF8]">
                  <span>Supported:</span>
                  <strong className="text-[#15191E]">Groww · Zerodha · Angel · Upstox</strong>
                </div>
              </div>
            </div>

            {/* Candlestick Demonstration Canvas */}
            <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-4">
              {/* Chart Toolbar */}
              <div className="flex flex-wrap items-center justify-between border-b border-[#E4E7EB] pb-2.5 mb-3 gap-2 text-xs">
                <div className="flex items-center space-x-1">
                  {['1m', '5m', '15m', '1h', '1D', '1W', '1M'].map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setActivePreviewTimeframe(tf)}
                      className={`rounded px-2.5 py-1 font-semibold transition ${
                        activePreviewTimeframe === tf
                          ? 'bg-[#176B58] text-white'
                          : 'text-[#64707D] hover:bg-[#E4E7EB]/60 hover:text-[#15191E]'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                    SMA 20 (₹2,974.80)
                  </span>
                  <span className="inline-flex items-center gap-1 text-purple-700 bg-purple-50 border border-purple-200/60 px-2 py-0.5 rounded font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500"></span>
                    RSI 14 (64.2)
                  </span>
                </div>
              </div>

              {/* SVG Graphic with Candlestick Bodies, Wicks & Volume */}
              <svg viewBox="0 0 800 240" className="w-full h-52 select-none">
                {/* Horizontal Grid */}
                <line x1="20" y1="40" x2="780" y2="40" stroke="#E4E7EB" strokeDasharray="3 3" />
                <line x1="20" y1="100" x2="780" y2="100" stroke="#E4E7EB" strokeDasharray="3 3" />
                <line x1="20" y1="160" x2="780" y2="160" stroke="#E4E7EB" strokeDasharray="3 3" />

                {/* Y-Axis Labels */}
                <text x="740" y="44" fill="#94A3B8" fontSize="10">₹3,000</text>
                <text x="740" y="104" fill="#94A3B8" fontSize="10">₹2,980</text>
                <text x="740" y="164" fill="#94A3B8" fontSize="10">₹2,960</text>

                {/* Candles & Volume Bars */}
                {previewCandles.map((c, idx) => {
                  const x = 70 + idx * 115;
                  const isBull = c.close >= c.open;
                  const color = isBull ? '#10B981' : '#EF4444';
                  // Simple coordinate scaling
                  const topWick = 200 - ((c.high - 2950) / 50) * 160;
                  const bottomWick = 200 - ((c.low - 2950) / 50) * 160;
                  const bodyTop = 200 - ((Math.max(c.open, c.close) - 2950) / 50) * 160;
                  const bodyBottom = 200 - ((Math.min(c.open, c.close) - 2950) / 50) * 160;
                  const bodyHeight = Math.max(3, bodyBottom - bodyTop);

                  return (
                    <g key={idx}>
                      {/* Volume bar */}
                      <rect
                        x={x - 14}
                        y={215 - (c.volume / 3000000) * 45}
                        width="28"
                        height={(c.volume / 3000000) * 45}
                        fill={color}
                        opacity="0.3"
                        rx="1"
                      />
                      {/* Wick */}
                      <line x1={x} y1={topWick} x2={x} y2={bottomWick} stroke={color} strokeWidth="1.5" />
                      {/* Body */}
                      <rect x={x - 14} y={bodyTop} width="28" height={bodyHeight} fill={color} rx="1" />
                      {/* Time label */}
                      <text x={x} y="235" textAnchor="middle" fill="#64707D" fontSize="10">{c.date}</text>
                    </g>
                  );
                })}

                {/* SMA 20 Trend Polyline */}
                <polyline
                  points="70,140 185,120 300,105 415,115 530,95 645,85"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Financial Statistics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">Open</span>
                <div className="font-bold text-[#15191E] mt-0.5">₹2,965.00</div>
              </div>
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">Day Range</span>
                <div className="font-bold text-[#15191E] mt-0.5">₹2,955 – ₹2,998</div>
              </div>
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">Volume</span>
                <div className="font-bold text-[#15191E] mt-0.5">1.42 Cr Shares</div>
              </div>
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">P/E Ratio</span>
                <div className="font-bold text-[#15191E] mt-0.5">26.80</div>
              </div>
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">52-Week Range</span>
                <div className="font-bold text-[#15191E] mt-0.5">₹2,220 – ₹3,218</div>
              </div>
              <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-2.5">
                <span className="text-[#64707D]">Valuation</span>
                <div className="font-bold text-[#176B58] mt-0.5">Fair Value</div>
              </div>
            </div>

            {/* Factual Disclaimer */}
            <p className="text-[11px] text-[#64707D] text-center border-t border-[#E4E7EB] pt-4">
              * Demonstration values reflect verified NSE market parameters and true mathematical indicator formulas.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. FOUR PRIMARY CAPABILITIES ── */}
      <section id="features" className="py-24 border-t border-[#E4E7EB] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#176B58] bg-[#176B58]/10 px-3 py-1 rounded-full">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#15191E] mt-4 tracking-tight">
              Built for disciplined equity research.
            </h2>
            <p className="mt-4 text-[#64707D] text-base sm:text-lg">
              Four unified modules engineered to eliminate spreadsheet clutter, opaque calculations, and disconnected tools.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Capability 1 */}
            <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAFAF8] p-8 hover:border-slate-300 transition shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B58]/10 text-[#176B58] mb-5">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#15191E]">Research Stocks</h3>
              <p className="mt-2 text-sm text-[#64707D] leading-relaxed">
                Explore company performance, financial metrics, and historical price data.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-[#15191E] font-medium border-t border-[#E4E7EB] pt-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Multi-timeframe candlestick histories (1m, 5m, 15m, 1h, 1D, 1W, 1M).</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Verified quarterly revenue, annual net profit, and promoter holdings.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Algorithmic moving averages and valuation ratios (P/E, Market Cap, 52W).</span>
                </li>
              </ul>
            </div>

            {/* Capability 2 */}
            <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAFAF8] p-8 hover:border-slate-300 transition shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B58]/10 text-[#176B58] mb-5">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#15191E]">Follow the Market</h3>
              <p className="mt-2 text-sm text-[#64707D] leading-relaxed">
                Monitor available market prices, indices, and market movements.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-[#15191E] font-medium border-t border-[#E4E7EB] pt-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Real-time benchmark tracking for NIFTY 50, SENSEX, and BANK NIFTY.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Rankings for top gainers, losers, and active turnover across tracked equities.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Server-Sent Events streaming with transparent session status labeling.</span>
                </li>
              </ul>
            </div>

            {/* Capability 3 */}
            <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAFAF8] p-8 hover:border-slate-300 transition shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B58]/10 text-[#176B58] mb-5">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#15191E]">Understand Your Portfolio</h3>
              <p className="mt-2 text-sm text-[#64707D] leading-relaxed">
                Track recorded investments, holdings, allocation, and performance.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-[#15191E] font-medium border-t border-[#E4E7EB] pt-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Exact volume-weighted average price (VWAP) cost basis accounting.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Live portfolio valuation and unrealized profit/loss without double-counting.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>Broker distribution, gainer/loser cards, and clean CSV export.</span>
                </li>
              </ul>
            </div>

            {/* Capability 4 */}
            <div className="rounded-2xl border border-[#E4E7EB] bg-[#FAFAF8] p-8 hover:border-slate-300 transition shadow-2xs">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#176B58]/10 text-[#176B58] mb-5">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-[#15191E]">Connect Supported Brokers</h3>
              <p className="mt-2 text-sm text-[#64707D] leading-relaxed">
                Access broker connectivity where official integrations are available.
              </p>
              <ul className="mt-6 space-y-2.5 text-xs text-[#15191E] font-medium border-t border-[#E4E7EB] pt-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>1-click order redirection to Groww, Zerodha Kite, Angel One, and Upstox.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>OAuth 2.0 authorization flows with zero password or credential collection.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-[#176B58] shrink-0" />
                  <span>AES-256-GCM token encryption and rate-limited manual synchronization.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. PRODUCT STORYTELLING SECTIONS (ALTERNATING EDITORIAL) ── */}
      <section id="markets" className="py-24 bg-[#FAFAF8] border-t border-[#E4E7EB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-28">
          {/* Story 1: Market Depth & Indicators */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#176B58]">
                Technical Precision
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#15191E] tracking-tight leading-snug">
                Professional charting designed for disciplined decision-making.
              </h3>
              <p className="text-sm text-[#64707D] leading-relaxed">
                Moving averages, momentum oscillators, and volume distributions shouldn't require complex proprietary terminals. InvestIQ renders multi-timeframe candles with mathematical SMA (20, 50, 200), EMA (9, 20, 50), RSI (14), MACD (12, 26, 9), and Bollinger Bands overlays on a synchronized SVG canvas.
              </p>
              <div className="pt-2">
                <Link
                  to="/watchlist"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B58] hover:text-[#115343] transition"
                >
                  <span>Explore Interactive Watchlist</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-[#E4E7EB] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EB] pb-3 text-xs">
                <span className="font-bold text-[#15191E]">Technical Indicator Overlays</span>
                <span className="text-[#64707D]">Synchronized Oscillators</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    <span className="font-semibold text-[#15191E]">Simple Moving Average (20)</span>
                  </div>
                  <span className="font-mono font-medium text-slate-700">₹2,974.80</span>
                </div>
                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    <span className="font-semibold text-[#15191E]">Exponential Moving Average (9)</span>
                  </div>
                  <span className="font-mono font-medium text-slate-700">₹2,981.20</span>
                </div>
                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                    <span className="font-semibold text-[#15191E]">Relative Strength Index (14)</span>
                  </div>
                  <span className="font-mono font-medium text-purple-700">64.20 (Neutral Bullish)</span>
                </div>
                <div className="rounded-lg border border-[#E4E7EB] bg-[#FAFAF8] p-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                    <span className="font-semibold text-[#15191E]">MACD (12, 26, 9)</span>
                  </div>
                  <span className="font-mono font-medium text-cyan-700">+8.45 / Signal: +6.10</span>
                </div>
              </div>
            </div>
          </div>

          {/* Story 2: Broker Execution & Sync */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 order-2 lg:order-1 rounded-2xl border border-[#E4E7EB] bg-white p-6 shadow-sm">
              <div className="text-xs font-bold text-[#15191E] border-b border-[#E4E7EB] pb-3 flex items-center justify-between">
                <span>Verified Broker Execution Channels</span>
                <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                  Zero Credentials Stored
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-4 text-center">
                  <div className="font-bold text-sm text-[#15191E]">Groww</div>
                  <div className="text-[11px] text-[#64707D] mt-1">Direct Web Order Redirection</div>
                  <span className="inline-block mt-3 text-[11px] text-[#176B58] font-bold">groww.in</span>
                </div>
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-4 text-center">
                  <div className="font-bold text-sm text-[#15191E]">Zerodha Kite</div>
                  <div className="text-[11px] text-[#64707D] mt-1">Kite Connect & Redirection</div>
                  <span className="inline-block mt-3 text-[11px] text-[#176B58] font-bold">kite.zerodha.com</span>
                </div>
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-4 text-center">
                  <div className="font-bold text-sm text-[#15191E]">Angel One</div>
                  <div className="text-[11px] text-[#64707D] mt-1">Verified Trade Redirection</div>
                  <span className="inline-block mt-3 text-[11px] text-[#176B58] font-bold">trade.angelone.in</span>
                </div>
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-4 text-center">
                  <div className="font-bold text-sm text-[#15191E]">Upstox</div>
                  <div className="text-[11px] text-[#64707D] mt-1">OAuth 2.0 & Pro Redirection</div>
                  <span className="inline-block mt-3 text-[11px] text-[#176B58] font-bold">pro.upstox.com</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 order-1 lg:order-2 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#176B58]">
                Broker Redirection & Consolidation
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#15191E] tracking-tight leading-snug">
                Execute on your broker. Track everything in one place.
              </h3>
              <p className="text-sm text-[#64707D] leading-relaxed">
                Analyze any Indian stock and click "Invest Now" to prefill order details directly on your preferred broker. For supported accounts, synchronize holdings via official OAuth 2.0 authorization codes without sharing trading passwords or two-factor pins.
              </p>
              <div className="pt-2">
                <Link
                  to="/connected-brokers"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B58] hover:text-[#115343] transition"
                >
                  <span>View Broker Integration Architecture</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Story 3: Weighted-Average Accounting */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#176B58]">
                Portfolio Integrity
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#15191E] tracking-tight leading-snug">
                No fabricated valuations. Accurate weighted-average accounting.
              </h3>
              <p className="text-sm text-[#64707D] leading-relaxed">
                When you accumulate stock across multiple dates and prices, InvestIQ computes the exact volume-weighted average price. Track real invested capital, current market value, and unrealized profit/loss across all brokers with zero double-counting.
              </p>
              <div className="pt-2">
                <Link
                  to="/portfolio"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B58] hover:text-[#115343] transition"
                >
                  <span>Open Portfolio Manager</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl border border-[#E4E7EB] bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#E4E7EB] pb-3 text-xs">
                <span className="font-bold text-[#15191E]">Holdings Accounting Demonstration</span>
                <span className="text-[#176B58] font-bold">Live Valuation</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-4 text-center">
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-3">
                  <div className="text-xs text-[#64707D]">Total Invested</div>
                  <div className="text-base font-extrabold text-[#15191E] mt-1">₹3,12,000</div>
                </div>
                <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-3">
                  <div className="text-xs text-[#64707D]">Current Valuation</div>
                  <div className="text-base font-extrabold text-[#15191E] mt-1">₹3,48,500</div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <div className="text-xs text-emerald-800">Unrealized P&L</div>
                  <div className="text-base font-extrabold text-emerald-700 mt-1">+₹36,500 (+11.7%)</div>
                </div>
              </div>
              <div className="mt-4 border-t border-[#E4E7EB] pt-3 text-xs text-[#64707D] flex justify-between">
                <span>Weighted Formula: Σ(Qty × Price) / Σ(Qty)</span>
                <span className="font-medium text-[#15191E]">Deduplication Engine Active</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. TRUST AND TRANSPARENCY SECTION ── */}
      <section id="trust" className="py-20 border-t border-[#E4E7EB] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#176B58] bg-[#176B58]/10 px-3 py-1 rounded-full">
              Transparency First
            </span>
            <h2 className="text-3xl font-extrabold text-[#15191E] mt-4 tracking-tight">
              Clear disclosures. Zero financial exaggeration.
            </h2>
            <p className="mt-3 text-sm text-[#64707D]">
              We believe financial technology platforms should be explicit about data provenance, regulatory boundaries, and software limitations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-6 space-y-2">
              <h4 className="text-sm font-bold text-[#15191E]">1. Market Data Timing & Freshness</h4>
              <p className="text-xs text-[#64707D] leading-relaxed">
                Live streaming feeds are active during regular NSE trading hours (09:15 to 15:30 IST). Outside market hours, on exchange holidays, or when feeds are rate-limited, quotes are transparently labeled as Delayed or Market Snapshots rather than simulated live prices.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-6 space-y-2">
              <h4 className="text-sm font-bold text-[#15191E]">2. Independent Research & Portfolio Platform</h4>
              <p className="text-xs text-[#64707D] leading-relaxed">
                InvestIQ is an independent financial technology software platform. It is not an asset management company, depository participant, or SEBI-registered portfolio manager. All content is intended strictly for research and record-keeping purposes.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-6 space-y-2">
              <h4 className="text-sm font-bold text-[#15191E]">3. Broker Order Routing Boundaries</h4>
              <p className="text-xs text-[#64707D] leading-relaxed">
                Order executions take place entirely on external, SEBI-regulated stockbroker websites (Groww, Zerodha Kite, Angel One, Upstox). InvestIQ never handles client capital, executes trades autonomously, or stores trading passwords.
              </p>
            </div>

            <div className="rounded-xl border border-[#E4E7EB] bg-[#FAFAF8] p-6 space-y-2">
              <h4 className="text-sm font-bold text-[#15191E]">4. Capital Risk & No Return Guarantees</h4>
              <p className="text-xs text-[#64707D] leading-relaxed">
                Securities market investments are subject to market risks. InvestIQ provides quantitative research tools, cost-basis calculations, and indicator math; past algorithmic performance does not guarantee future financial returns.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. FINAL CALL TO ACTION (DARK SECTION #101820) ── */}
      <section className="py-24 bg-[#101820] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-3 py-1 rounded-full">
            Ready to Begin
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Make sense of every market move.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto">
            Bring your research, watchlists, and portfolio into one clear view.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            {isSignedIn ? (
              <Link
                to="/dashboard"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#176B58] px-7 py-3.5 text-base font-bold text-white shadow-md hover:bg-[#115343] transition"
              >
                <span>Open InvestIQ Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#176B58] px-7 py-3.5 text-base font-bold text-white shadow-md hover:bg-[#115343] transition">
                  <span>Get Started with InvestIQ</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </SignUpButton>
            )}

            <Link
              to="/watchlist"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-6 py-3.5 text-base font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              <span>Explore Watchlist</span>
            </Link>
          </div>

          <p className="text-xs text-slate-500 pt-2">
            Free to research • Instant access • Works on desktop and mobile
          </p>
        </div>
      </section>

      {/* ── 8. EDITORIAL FOOTER ── */}
      <footer className="bg-[#101820] text-slate-400 border-t border-slate-800/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Col 1: Brand */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#176B58] text-white">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="font-bold text-lg tracking-tight text-white">
                  Invest<span className="text-emerald-400">IQ</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                InvestIQ is an independent market intelligence and portfolio tracking platform built for disciplined Indian equity investors.
              </p>
            </div>

            {/* Col 2: Platform */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Platform</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link to="/dashboard" className="hover:text-emerald-400 transition">Market Dashboard</Link>
                </li>
                <li>
                  <Link to="/portfolio" className="hover:text-emerald-400 transition">Portfolio Manager</Link>
                </li>
                <li>
                  <Link to="/watchlist" className="hover:text-emerald-400 transition">Interactive Watchlist</Link>
                </li>
                <li>
                  <Link to="/invest" className="hover:text-emerald-400 transition">Broker Execution</Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Features */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Features</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#platform" className="hover:text-emerald-400 transition">Candlestick Charts</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-emerald-400 transition">Technical Indicators</a>
                </li>
                <li>
                  <Link to="/connected-brokers" className="hover:text-emerald-400 transition">Multi-Broker Hub</Link>
                </li>
                <li>
                  <a href="#markets" className="hover:text-emerald-400 transition">Price Alerts Engine</a>
                </li>
              </ul>
            </div>

            {/* Col 4: Trust & Compliance */}
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Compliance & Trust</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a href="#trust" className="hover:text-emerald-400 transition">SEBI Compliance Notes</a>
                </li>
                <li>
                  <a href="#trust" className="hover:text-emerald-400 transition">Market Data Timing</a>
                </li>
                <li>
                  <span className="text-slate-500">Security & Privacy (AES-256)</span>
                </li>
                <li>
                  <span className="text-slate-500">Terms of Use</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} InvestIQ Technologies. Built for disciplined Indian equity investors.</p>
            <p>Integrated with Groww, Zerodha Kite, Angel One & Upstox.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
