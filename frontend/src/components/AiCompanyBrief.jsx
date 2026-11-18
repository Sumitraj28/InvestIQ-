import React, { useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  HelpCircle,
  Info,
  Layers,
  LineChart,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

function StatItem({ label, value, subtext, highlight = false }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>
        {value ?? 'N/A'}
      </div>
      {subtext && <div className="mt-0.5 text-[10px] text-slate-400">{subtext}</div>}
    </div>
  );
}

function EvidenceList({ items = [], type = 'bullish' }) {
  if (!items || items.length === 0) {
    return <p className="text-xs italic text-slate-400">No conclusive evidence identified.</p>;
  }

  const isBull = type === 'bullish';
  const Icon = isBull ? CheckCircle2 : XCircle;
  const colorClass = isBull ? 'text-emerald-600' : 'text-rose-500';

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2 text-xs leading-5 text-slate-700">
          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${colorClass}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AiCompanyBrief({
  summary,
  loading = false,
  error = null,
  onRefresh,
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');

  if (loading) {
    return (
      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span>Synthesizing Quantitative Intelligence & Research Evidence...</span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="h-28 animate-pulse rounded-lg bg-slate-50" />
          <div className="h-28 animate-pulse rounded-lg bg-slate-50" />
          <div className="h-28 animate-pulse rounded-lg bg-slate-50" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs font-medium text-amber-800">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span>Research Engine Notice</span>
        </div>
        <p className="mt-1">{error}</p>
      </section>
    );
  }

  if (!summary) return null;

  const assessment = summary.assessment || {};
  const technicals = assessment.technicals || {};
  const indicators = technicals.indicators || {};
  const risks = assessment.risks || {};
  const fundamentals = assessment.fundamentals || {};
  const isAi = Boolean(summary.isAiGenerated);

  const evaluationTimestamp = summary.evaluatedAt
    ? new Date(summary.evaluatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Recent';

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      {/* ── Top Bar: Identity & Engine Status ── */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-3.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">
                {summary.companyName || summary.ticker} Research Intelligence
              </h2>
              <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                {summary.exchange || 'NSE'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated at {evaluationTimestamp} IST
              </span>
              <span>•</span>
              <span className="font-medium text-slate-600">
                Data Freshness: {summary.dataFreshness || assessment.dataFreshness || 'LIVE'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Transparent Engine Origin Badge */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${
              summary.generatedBy?.startsWith('openai')
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : summary.generatedBy?.startsWith('gemini')
                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isAi ? <Bot className="h-3.5 w-3.5" /> : <Cpu className="h-3.5 w-3.5" />}
            {summary.generatedBy?.startsWith('openai')
              ? 'OpenAI Synthesized'
              : summary.generatedBy?.startsWith('gemini')
                ? 'Gemini AI Synthesized'
                : 'InvestIQ Quantitative AI Engine'}
          </span>

          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Refresh quantitative indicators"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Optional Provider Notice */}
      {summary.aiProviderNotice && (
        <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/80 px-5 py-2 text-[11px] font-medium text-amber-900">
          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>{summary.aiProviderNotice}</span>
        </div>
      )}

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-5 text-xs font-semibold">
        <div className="flex space-x-1 sm:space-x-3">
          {[
            { id: 'overview', label: 'Executive Overview', icon: Layers },
            { id: 'technicals', label: 'Technical Analysis', icon: Activity },
            { id: 'fundamentals', label: 'Fundamentals', icon: BarChart3 },
            { id: 'risk', label: 'Risk Profile', icon: Scale },
            { id: 'forecast', label: 'ML Price Model', icon: LineChart },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 border-b-2 py-2.5 px-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe selector */}
        <div className="my-1.5 hidden items-center gap-1 sm:flex">
          <span className="text-[10px] text-slate-400 font-medium">Window:</span>
          {['1D', '1W', '1M', '1Y'].map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                selectedTimeframe === tf ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab 1: Executive Overview & Evidence ── */}
      {activeTab === 'overview' && (
        <div className="p-5 space-y-5">
          {/* Executive Narrative */}
          {summary.companyOverview && (
            <div className="rounded-lg bg-slate-50/60 p-4 border border-slate-100 text-xs leading-6 text-slate-700">
              <span className="font-bold text-slate-900 block mb-1">Company & Business Context</span>
              {summary.companyOverview}
            </div>
          )}

          {/* Quick Pillar Highlights */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-100 p-3.5 bg-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Price Dynamics</div>
              <div className="mt-1 text-xs leading-5 text-slate-700 font-medium">
                {summary.priceBehaviour || 'Price range and volume within standard bands.'}
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 p-3.5 bg-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Technical Trend</div>
              <div className="mt-1 text-xs leading-5 text-slate-700 font-medium">
                {summary.technicalTrend || 'Intermediate moving averages consolidating.'}
              </div>
            </div>

            <div className="rounded-lg border border-slate-100 p-3.5 bg-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Valuation Context</div>
              <div className="mt-1 text-xs leading-5 text-slate-700 font-medium">
                {summary.valuationConsiderations || 'Reported multiples align with peer median.'}
              </div>
            </div>
          </div>

          {/* Structured Evidence Balance */}
          <div className="grid gap-5 md:grid-cols-2 pt-2 border-t border-slate-100">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Bullish Supporting Evidence</span>
              </div>
              <EvidenceList items={summary.bullishEvidence || summary.strengths} type="bullish" />
            </div>

            <div className="rounded-xl border border-rose-100 bg-rose-50/30 p-4">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Bearish Pressures & Contradictions</span>
              </div>
              <EvidenceList items={summary.bearishEvidence || summary.watchouts} type="bearish" />
            </div>
          </div>

          {/* Key Contradictions Notice */}
          {summary.contradictorySignals && summary.contradictorySignals.length > 0 && (
            <div className="rounded-lg bg-amber-50/60 border border-amber-200/70 p-3 text-xs text-amber-900">
              <span className="font-bold">Contradictory / Divergent Indicator Observations:</span>
              <ul className="mt-1 list-disc pl-4 space-y-1 text-amber-800">
                {summary.contradictorySignals.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Research Verdict */}
          {summary.researchVerdict && (
            <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 text-white">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Synthesized Research Takeaway
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-200">{summary.researchVerdict}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Technical Indicators ── */}
      {activeTab === 'technicals' && (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatItem
              label="RSI (14)"
              value={indicators.rsi?.value !== null ? `${indicators.rsi?.value}` : 'N/A'}
              subtext={indicators.rsi?.interpretation || 'Wilder\'s smoothed'}
              highlight={indicators.rsi?.value >= 70 || indicators.rsi?.value <= 30}
            />
            <StatItem
              label="MACD Histogram"
              value={indicators.macd?.histogram !== null ? `${indicators.macd?.histogram >= 0 ? '+' : ''}${indicators.macd?.histogram}` : 'N/A'}
              subtext={`MACD: ${indicators.macd?.macdLine ?? 'N/A'} | Sig: ${indicators.macd?.signalLine ?? 'N/A'}`}
            />
            <StatItem
              label="ATR (14)"
              value={indicators.atr?.value ? `₹${indicators.atr?.value}` : 'N/A'}
              subtext={indicators.atr?.percentOfPrice ? `${indicators.atr?.percentOfPrice}% of price` : 'Daily swing volatility'}
            />
            <StatItem
              label="14-Day Momentum"
              value={indicators.momentum?.roc14 !== null ? `${indicators.momentum?.roc14 >= 0 ? '+' : ''}${indicators.momentum?.roc14}%` : 'N/A'}
              subtext="14-session Rate of Change"
            />
          </div>

          {/* Moving Average Matrix */}
          <div className="rounded-xl border border-slate-100 p-4">
            <h4 className="text-xs font-bold text-slate-900 mb-3">Moving Average Alignment (Daily OHLCV)</h4>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatItem label="20-Day SMA" value={indicators.movingAverages?.sma20 ? `₹${indicators.movingAverages.sma20}` : 'N/A'} />
              <StatItem label="50-Day SMA" value={indicators.movingAverages?.sma50 ? `₹${indicators.movingAverages.sma50}` : 'N/A'} />
              <StatItem label="200-Day SMA" value={indicators.movingAverages?.sma200 ? `₹${indicators.movingAverages.sma200}` : 'N/A'} />
              <StatItem label="9-Day EMA" value={indicators.movingAverages?.ema9 ? `₹${indicators.movingAverages.ema9}` : 'N/A'} />
              <StatItem label="20-Day EMA" value={indicators.movingAverages?.ema20 ? `₹${indicators.movingAverages.ema20}` : 'N/A'} />
              <StatItem label="50-Day EMA" value={indicators.movingAverages?.ema50 ? `₹${indicators.movingAverages.ema50}` : 'N/A'} />
            </div>
            <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-800">Structure: </span>
              {indicators.movingAverages?.trendSummary || 'Moving average status compiling.'}
            </div>
          </div>

          {/* Bollinger Bands & Levels */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Bollinger Bands (20, 2.0 SD)</h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span>Upper Band:</span>
                  <span className="font-mono font-bold text-slate-900">₹{indicators.bollingerBands?.upper ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span>Middle (20 SMA):</span>
                  <span className="font-mono font-bold text-slate-900">₹{indicators.bollingerBands?.middle ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Lower Band:</span>
                  <span className="font-mono font-bold text-slate-900">₹{indicators.bollingerBands?.lower ?? 'N/A'}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">{indicators.bollingerBands?.interpretation}</p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Support & Resistance Estimates</h4>
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span>Resistance (R1 / Swing):</span>
                  <span className="font-mono font-bold text-rose-700">₹{indicators.supportResistance?.resistance1 ?? indicators.supportResistance?.swingHigh20 ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-1">
                  <span>Daily Pivot:</span>
                  <span className="font-mono font-bold text-slate-900">₹{indicators.supportResistance?.pivot ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span>Support (S1 / Swing):</span>
                  <span className="font-mono font-bold text-emerald-700">₹{indicators.supportResistance?.support1 ?? indicators.supportResistance?.swingLow20 ?? 'N/A'}</span>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">Classical pivot levels derived from prior trading session and 20-day swing extremes.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 3: Fundamental Analysis ── */}
      {activeTab === 'fundamentals' && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatItem
              label="Trailing P/E"
              value={fundamentals.metrics?.trailingPe ? `${fundamentals.metrics.trailingPe}x` : 'N/A'}
              subtext={`Sector Peer Avg: ~${fundamentals.metrics?.sectorPeBenchmark ?? 'N/A'}x`}
              highlight
            />
            <StatItem
              label="Price-to-Book (P/B)"
              value={fundamentals.metrics?.priceToBook ? `${fundamentals.metrics.priceToBook}x` : 'N/A'}
              subtext="Book value multiplier"
            />
            <StatItem
              label="Return on Equity (ROE)"
              value={fundamentals.metrics?.roe ? `${fundamentals.metrics.roe}%` : 'N/A'}
              subtext="Reported net return on net worth"
            />
            <StatItem
              label="Debt-to-Equity"
              value={fundamentals.metrics?.debtToEquity !== null ? `${fundamentals.metrics?.debtToEquity}` : 'N/A'}
              subtext="Total debt / shareholders equity"
            />
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <h4 className="text-xs font-bold text-slate-900 mb-2">Sector & Industry Benchmark Comparison</h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mb-3">
              <div>
                <span className="text-slate-400">Sector: </span>
                <span className="font-semibold text-slate-800">{fundamentals.sector || 'Indian Equity'}</span>
              </div>
              <span>•</span>
              <div>
                <span className="text-slate-400">Industry: </span>
                <span className="font-semibold text-slate-800">{fundamentals.industry || 'General Sector'}</span>
              </div>
              <span>•</span>
              <div>
                <span className="text-slate-400">Valuation Status: </span>
                <span className="font-bold text-blue-700 uppercase">{fundamentals.valuationTag || 'STANDARD'}</span>
              </div>
            </div>

            <div className="space-y-2">
              {(fundamentals.strengths || []).map((str, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
                  <span>{str}</span>
                </div>
              ))}
              {(fundamentals.weaknesses || []).map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 text-amber-600 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
              {(fundamentals.observations || []).map((obs, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <Info className="h-3.5 w-3.5 mt-0.5 text-slate-400 shrink-0" />
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Risk Profile ── */}
      {activeTab === 'risk' && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatItem
              label="1Y Annualized Volatility"
              value={risks.metrics?.annualizedVolatility1Y ? `${risks.metrics.annualizedVolatility1Y}%` : 'N/A'}
              subtext="std dev of daily log returns * √252"
              highlight
            />
            <StatItem
              label="1Y Max Drawdown"
              value={risks.metrics?.maxDrawdown1Y ? `${risks.metrics.maxDrawdown1Y}%` : 'N/A'}
              subtext="Peak-to-trough decline (1 year)"
            />
            <StatItem
              label="Downside Deviation (1Y)"
              value={risks.metrics?.downsideDeviation1Y ? `${risks.metrics.downsideDeviation1Y}%` : 'N/A'}
              subtext="Negative return volatility (<0% target)"
            />
            <StatItem
              label="Market Beta"
              value={risks.metrics?.beta ? `${risks.metrics.beta}` : 'N/A'}
              subtext={`Benchmark: ${risks.metrics?.benchmark || 'NIFTY 50'}`}
            />
          </div>

          <div className="rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                risks.riskRating === 'HIGH' ? 'bg-rose-100 text-rose-800' : risks.riskRating === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {risks.riskLabel || 'Standard Risk Parameters'}
              </span>
            </div>
            <p className="text-xs leading-5 text-slate-700">{risks.summary}</p>

            {risks.observations?.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-3 space-y-2">
                <span className="text-[11px] font-bold text-slate-900 block">Identified Risk Characteristics:</span>
                {risks.observations.map((obs, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5 text-slate-500 shrink-0" />
                    <span>{obs}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 5: ML Price Model & Validation Gate ── */}
      {activeTab === 'forecast' && (
        <div className="p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-slate-800" />
                <h4 className="text-xs font-bold text-slate-950">Walk-Forward Machine Learning Pipeline</h4>
              </div>
              <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                Out-Of-Sample Gate
              </span>
            </div>

            <p className="text-xs leading-5 text-slate-600">
              In accordance with quantitative research discipline, InvestIQ runs an out-of-sample chronological backtest comparing regularized classifiers against a Naive Persistence Baseline.
            </p>

            <div className="mt-4 rounded-lg bg-amber-50/80 border border-amber-200 p-3.5 text-xs text-amber-900">
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Forecasting Limitation & Ethical AI Guardrail</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-5">
                Financial asset prices exhibit high noise-to-signal ratios. Walk-forward testing demonstrates that short-term nominal price projections cannot consistently exceed statistical baseline performance without data leakage. Linear price extrapolation has been disabled to prevent misleading forecasts.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatItem label="Validation Protocol" value="Chronological (80/20)" subtext="Strictly zero future leakage" />
              <StatItem label="Baseline Tested" value="Naive Persistence" subtext="Benchmark for market noise" />
              <StatItem label="Target Metric" value="Directional Accuracy" subtext="Predictive directional sign" />
              <StatItem label="Target Horizon" value="5 Trading Sessions" subtext="Statistical return distribution" />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
