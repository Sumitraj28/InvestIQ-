import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUpButton, useAuth } from '@clerk/react';
import {
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Play,
  Shield,
  Star,
  TrendingUp,
  Users,
  Zap,
  Activity,
} from 'lucide-react';
import CompanyLogo from '../components/CompanyLogo';
import { getStock } from '../services/api';
import { popularTickers } from '../data/popularTickers';

/* ── static data ── */
const features = [
  {
    icon: Shield,
    title: 'Bank-grade Security',
    desc: 'Your data is protected with enterprise-level encryption and secure API connections.',
  },
  {
    icon: Activity,
    title: 'Real-time Data',
    desc: 'Live NSE market feeds with 15-minute cache for blazing-fast price lookups.',
  },
  {
    icon: Clock,
    title: 'Always Available',
    desc: '24/7 access to historical data, charts, and AI-generated analysis reports.',
  },
  {
    icon: Zap,
    title: 'Fast & Efficient',
    desc: 'Instant stock lookups with MongoDB caching and optimized API pipeline.',
  },
];

const numberedCards = [
  {
    num: '01.',
    icon: Users,
    title: 'Expertise at\nEvery Step',
    desc: 'Get professional insights and personalised guidance for your investment decisions across Indian equities.',
  },
  {
    num: '02.',
    icon: Star,
    title: 'Industry\nBest Practices',
    desc: 'We follow the highest industry standards to ensure the safety and accuracy of your market data and analysis.',
    hasLink: true,
  },
  {
    num: '03.',
    icon: CheckCircle2,
    title: 'Backed by\nLive Data',
    desc: 'Real-time NSE feeds via yfinance, cached in MongoDB. Every number you see is sourced and verifiable.',
  },
];

const bottomFeatures = [
  { icon: Lock, title: 'Secure Data', desc: 'Multi-layer protection', color: 'bg-emerald-50 text-emerald-600' },
  { icon: Zap, title: 'Real-time Prices', desc: 'Powered by yfinance', color: 'bg-amber-50 text-amber-600' },
  { icon: BarChart3, title: 'Smart Analytics', desc: 'AI-driven insights', color: 'bg-sky-50 text-sky-600' },
  { icon: Globe, title: 'NSE Coverage', desc: '25+ large-cap stocks', color: 'bg-violet-50 text-violet-600' },
];

/* ────────────────── Main Component ────────────────── */
export default function Home() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();

  /* If already signed in, redirect to dashboard */
  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isSignedIn, navigate]);

  /* Live stock data for market overview */
  const [stocks, setStocks] = useState([
    { ticker: 'RELIANCE.NS', name: 'Reliance Industries', price: '₹1,240.40', change: '-0.56%', positive: false },
    { ticker: 'TCS.NS', name: 'Tata Consultancy Services', price: '₹2,105.00', change: '+1.24%', positive: true },
    { ticker: 'INFY.NS', name: 'Infosys', price: '₹1,029.40', change: '+0.88%', positive: true },
    { ticker: 'HDFCBANK.NS', name: 'HDFC Bank', price: '₹1,660.50', change: '-0.32%', positive: false },
  ]);

  useEffect(() => {
    let mounted = true;
    const fetchStocks = async () => {
      const syms = popularTickers.slice(0, 4).map((t) => t.symbol);
      try {
        const results = await Promise.all(syms.map((s) => getStock(s).catch(() => null)));
        if (!mounted) return;
        const updated = results
          .filter((r) => r && r.data)
          .map((r) => {
            const d = r.data;
            const isPos = (d.dayChangePercent || 0) >= 0;
            return {
              ticker: d.ticker + (d.ticker?.includes('.') ? '' : '.NS'),
              name: d.name,
              price: `₹${Number(d.lastPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
              change: `${isPos ? '+' : ''}${Number(d.dayChangePercent || 0).toFixed(2)}%`,
              positive: isPos,
            };
          });
        if (updated.length > 0) setStocks(updated);
      } catch {
        /* keep defaults */
      }
    };
    fetchStocks();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      {/* ═══════════ HERO ═══════════ */}
      <section className="hero-section text-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left – Copy */}
            <div className="animate-fade-in-up">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest backdrop-blur-sm">
                <Lock className="h-3.5 w-3.5" />
                Invest in Indian Equities
              </div>

              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.4rem]">
                The best stock{' '}
                <span className="relative inline-block">
                  <span className="relative z-10 text-emerald-400">analysis platform</span>
                  <span className="absolute bottom-1 left-0 -z-0 h-3 w-full rounded bg-emerald-500/20" />
                </span>{' '}
                for your future.
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
                Research, analyse, and grow your portfolio with the most intelligent Indian equity platform — powered by live NSE data, AI insights, and MongoDB-cached fundamentals.
              </p>

              {/* Social proof */}
              <div className="mt-8 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {['#f97316', '#3b82f6', '#8b5cf6', '#ec4899'].map((c, i) => (
                    <span
                      key={i}
                      className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B3D2C] text-xs font-bold text-white"
                      style={{ background: c, zIndex: 4 - i }}
                    >
                      {['SR', 'AP', 'TY', 'NK'][i]}
                    </span>
                  ))}
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#0B3D2C] bg-emerald-500 text-xs font-bold text-white">
                    +
                  </span>
                </div>
                <div>
                  <div className="text-lg font-extrabold">50K+</div>
                  <div className="text-xs text-white/60">Happy Investors</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="mt-10 flex flex-wrap gap-4">
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-primary">
                    Get Started <ArrowRight className="h-4 w-4" />
                  </button>
                </SignUpButton>
                <button className="btn-secondary !bg-transparent !text-white !border-white/25 hover:!bg-white/10">
                  <Play className="h-4 w-4" /> Watch Demo
                  <span className="text-xs text-white/50 font-normal">2 min video</span>
                </button>
              </div>
            </div>

            {/* Right – Phone mockup */}
            <div className="hidden lg:flex justify-center animate-slide-in-right">
              <div className="relative">
                {/* Floating badge */}
                <div className="absolute -top-4 -right-4 z-20 animate-float glass-card px-4 py-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[11px] text-white/50">NIFTY 50</div>
                    <div className="text-sm font-bold text-white">25,327.05</div>
                  </div>
                </div>

                {/* Phone */}
                <div className="phone-mockup animate-float-slow">
                  <div className="phone-screen">
                    <div className="text-center mb-4">
                      <div className="text-[10px] text-emerald-400/60 uppercase tracking-widest font-semibold">Portfolio Value</div>
                      <div className="text-2xl font-extrabold text-white mt-1">₹3,28,590</div>
                      <div className="text-xs text-emerald-400 font-semibold mt-0.5">+12.5% (24h)</div>
                    </div>

                    {/* Mini chart bars */}
                    <div className="mini-chart mb-4">
                      {[45, 60, 35, 70, 55, 80, 65, 90, 50, 75, 85, 95, 70, 88].map((h, i) => (
                        <div key={i} className="mini-chart-bar" style={{ height: `${h}%` }} />
                      ))}
                    </div>

                    {/* Stock list inside phone */}
                    <div className="space-y-2.5">
                      {[
                        { sym: 'RELIANCE', price: '₹1,240', ch: '+2.5%', pos: true },
                        { sym: 'TCS', price: '₹4,105', ch: '-1.1%', pos: false },
                        { sym: 'INFY', price: '₹1,840', ch: '+5.6%', pos: true },
                        { sym: 'HDFC', price: '₹1,660', ch: '-0.3%', pos: false },
                      ].map((s) => (
                        <div key={s.sym} className="flex items-center justify-between glass-card px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center text-[8px] font-bold text-white/70">
                              {s.sym.slice(0, 2)}
                            </span>
                            <span className="text-xs font-semibold text-white/90">{s.sym}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-bold text-white/80">{s.price}</div>
                            <div className={`text-[9px] font-semibold ${s.pos ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {s.ch}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Bottom nav in phone */}
                    <div className="absolute bottom-4 left-4 right-4 flex justify-around">
                      {['Home', 'Markets', 'Trade', 'Portfolio'].map((tab) => (
                        <span key={tab} className="text-[8px] text-white/40 font-medium">{tab}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating badge left */}
                <div className="absolute -left-8 bottom-24 z-20 animate-float glass-card px-4 py-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-[11px] text-white/50">SENSEX</div>
                    <div className="text-sm font-bold text-white">82,679.14</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ TRUST PARTNER ═══════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-2 md:gap-16 items-start">
            <div className="animate-fade-in-up">
              <h2 className="text-3xl font-extrabold leading-tight text-[#0B3D2C] sm:text-4xl">
                Your <span className="text-emerald-500">trusted partner</span><br />
                in equity investing.
              </h2>
            </div>
            <div className="animate-fade-in-up-delay-1">
              <p className="text-base leading-relaxed text-slate-500 sm:text-lg">
                We combine cutting-edge technology with industry best practices to deliver a secure and seamless investment research experience. From real-time NSE data to AI-powered company analysis — InvestIQ gives you institutional-quality tools, for free.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <section className="py-12 sm:py-16 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className={`feature-card animate-fade-in-up${i > 0 ? `-delay-${i}` : ''}`}>
                  <div className="feature-icon mx-auto">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ NUMBERED CARDS ═══════════ */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {numberedCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.num}
                  className={`numbered-card animate-fade-in-up${i > 0 ? `-delay-${i}` : ''}`}
                >
                  <div className="card-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="card-number">{card.num}</div>
                  <h3 className="text-xl font-extrabold text-[#0B3D2C] leading-tight mb-3 whitespace-pre-line">
                    {card.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">{card.desc}</p>
                  {card.hasLink && (
                    <button className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition">
                      Learn More <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ MARKET OVERVIEW + TRUST ═══════════ */}
      <section className="py-16 sm:py-20 bg-slate-50/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
            {/* Left – Market card */}
            <div className="market-card animate-fade-in-up">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-semibold text-white/70">Live Market Overview</span>
                </div>
                <span className="text-xs font-bold text-emerald-400">
                  View All →
                </span>
              </div>

              <div className="mb-6">
                <div className="text-3xl font-extrabold text-white">₹ 2,45,890.20</div>
                <div className="text-sm text-emerald-400 font-semibold mt-1">+12.5% (24h)</div>
              </div>

              {/* Mini chart */}
              <div className="mini-chart mb-6" style={{ height: '60px' }}>
                {[30, 45, 35, 55, 40, 65, 50, 75, 60, 80, 55, 70, 85, 90, 75, 88, 95, 80, 92].map((h, i) => (
                  <div key={i} className="mini-chart-bar" style={{ height: `${h}%` }} />
                ))}
              </div>

              {/* Stock ticker strip */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stocks.slice(0, 4).map((s) => (
                  <div
                    key={s.ticker}
                    className="glass-card px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <CompanyLogo ticker={s.ticker} name={s.name} size="sm" />
                      <span className="text-xs font-bold text-white/80 truncate">
                        {s.ticker.replace('.NS', '')}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white/90">{s.price}</div>
                    <div className={`text-[10px] font-bold ${s.positive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {s.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right – Trusted platform */}
            <div className="animate-fade-in-up-delay-1">
              <h2 className="text-3xl font-extrabold text-[#0B3D2C] leading-tight sm:text-4xl">
                <span className="text-emerald-500">Trusted</span> platform<br />
                anytime & anywhere.
              </h2>

              {/* Stars */}
              <div className="mt-4 flex items-center gap-3">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm text-slate-500">4.8 / 5 from 15K+ reviews</span>
              </div>

              <p className="mt-5 text-base leading-relaxed text-slate-500 sm:text-lg">
                InvestIQ is a secure and innovative research platform built to help you analyse, invest, and grow — anytime & anywhere. Powered by live NSE data and intelligent caching.
              </p>

              {/* Mini feature badges */}
              <div className="mt-8 grid grid-cols-3 gap-4">
                {[
                  { icon: Shield, label: 'Enterprise\nSecurity' },
                  { icon: Zap, label: 'Low\nLatency' },
                  { icon: Globe, label: 'Full NSE\nCoverage' },
                ].map((badge) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={badge.label} className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-2">
                        <BadgeIcon className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-bold text-slate-700 leading-tight whitespace-pre-line">{badge.label}</div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="btn-primary">
                    Start Investing Now <ArrowRight className="h-4 w-4" />
                  </button>
                </SignUpButton>
                <span className="text-sm text-slate-500 cursor-pointer hover:text-emerald-600 transition">
                  Ask a question?
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ BOTTOM FEATURE BAR ═══════════ */}
      <section className="bottom-bar">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {bottomFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="bottom-bar-item">
                  <div className={`bottom-bar-icon ${f.color}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{f.title}</div>
                    <div className="text-xs text-slate-500">{f.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
