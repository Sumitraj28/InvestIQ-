import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Edit2,
  ExternalLink,
  Layers,
  Loader2,
  PieChart as PieIcon,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  deleteInvestment,
  getBrokerSyncStatus,
  getPortfolioSummary,
  syncBrokerHoldings,
} from '../services/api';
import CompanyLogo from '../components/CompanyLogo';
import BrokerLogo from '../components/BrokerLogo';
import AddInvestmentModal from '../components/AddInvestmentModal';

function formatINR(val, options = {}) {
  if (val === undefined || val === null || isNaN(Number(val))) return '₹0.00';
  return `₹${Number(val).toLocaleString('en-IN', {
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
  })}`;
}

const BROKER_COLORS = {
  Groww: '#00D09C',
  'Zerodha Kite': '#387ED1',
  'Angel One': '#E63946',
  Upstox: '#7B2CBF',
  Other: '#64748B',
};

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  // Broker Sync Drawer state
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [brokerStatuses, setBrokerStatuses] = useState([]);
  const [syncConsent, setSyncConsent] = useState(true);
  const [syncingBroker, setSyncingBroker] = useState(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState(null);

  // Search/Filter for holdings table
  const [holdingSearch, setHoldingSearch] = useState('');
  const [selectedBrokerFilter, setSelectedBrokerFilter] = useState('ALL');

  const fetchPortfolioData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      const [summaryRes, brokersRes] = await Promise.all([
        getPortfolioSummary(token).catch((err) => {
          console.warn('Portfolio summary error:', err);
          return null;
        }),
        getBrokerSyncStatus(token).catch((err) => {
          console.warn('Brokers status error:', err);
          return null;
        }),
      ]);

      if (summaryRes?.success && summaryRes.data) {
        setSummary(summaryRes.data);
      } else {
        setSummary({
          totalInvested: 0,
          currentValue: 0,
          totalPnl: 0,
          totalPnlPercent: 0,
          totalHoldings: 0,
          uniqueCompanies: 0,
          brokerDistribution: [],
          holdings: [],
        });
      }

      if (brokersRes?.success && brokersRes.data) {
        setBrokerStatuses(brokersRes.data);
      }
    } catch (err) {
      console.error('[PortfolioPage] Fetch error:', err);
      setError('Unable to load portfolio. Please check server connectivity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPortfolioData(true);
  };

  const handleDeleteInvestment = async (item) => {
    try {
      setDeletingId(item._id);
      const token = await getToken();
      const res = await deleteInvestment(item._id, token);
      if (res?.success) {
        setDeleteConfirmItem(null);
        fetchPortfolioData(true);
      } else {
        alert(res?.error || 'Failed to delete holding.');
      }
    } catch (err) {
      console.error('[Portfolio] Delete error:', err);
      alert('Could not delete investment record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleTriggerSync = async (brokerId) => {
    if (!syncConsent) {
      alert('Please check the consent box to authorize synchronization.');
      return;
    }

    setSyncingBroker(brokerId);
    setSyncSuccessMsg(null);

    try {
      const token = await getToken();
      const res = await syncBrokerHoldings(brokerId, true, token);
      if (res?.success) {
        setSyncSuccessMsg(`Broker sync recorded for ${brokerId.toUpperCase()}!`);
        fetchPortfolioData(true);
      }
    } catch (err) {
      console.error('[Broker Sync] Error:', err);
      alert('Broker sync failed.');
    } finally {
      setSyncingBroker(null);
    }
  };

  // Filtered holdings
  const filteredHoldings = useMemo(() => {
    if (!summary?.holdings) return [];
    return summary.holdings.filter((item) => {
      const matchesSearch =
        item.companyName.toLowerCase().includes(holdingSearch.toLowerCase()) ||
        item.stockSymbol.toLowerCase().includes(holdingSearch.toLowerCase());
      const matchesBroker =
        selectedBrokerFilter === 'ALL' || item.brokerName === selectedBrokerFilter;
      return matchesSearch && matchesBroker;
    });
  }, [summary?.holdings, holdingSearch, selectedBrokerFilter]);

  // Chart data for broker distribution
  const chartData = useMemo(() => {
    if (!summary?.brokerDistribution || summary.brokerDistribution.length === 0) return [];
    return summary.brokerDistribution.map((item) => ({
      name: item.brokerName,
      value: item.totalInvested,
      percent: item.portfolioPercent,
      color: BROKER_COLORS[item.brokerName] || '#64748B',
    }));
  }, [summary?.brokerDistribution]);

  const totalInvested = summary?.totalInvested || 0;
  const currentValue = summary?.currentValue || 0;
  const totalPnl = summary?.totalPnl || 0;
  const totalPnlPercent = summary?.totalPnlPercent || 0;
  const isPnlPositive = totalPnl >= 0;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0B3D2C] text-white shadow-xs">
                <Wallet className="h-5 w-5" />
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                Investment Portfolio
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Track your holdings across Groww, Zerodha, Angel One, and Upstox with real-time P&L calculations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition"
              title="Refresh prices & portfolio metrics"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setShowSyncPanel(!showSyncPanel)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition"
            >
              <Sliders className="h-3.5 w-3.5" />
              Auto-Sync Settings
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              Add Investment
            </button>
          </div>
        </div>

        {/* Sync Panel Drawer (Requirement 5) */}
        {showSyncPanel && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Broker Synchronization Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Secure read-only holding synchronization with supported Indian brokers (Groww, Zerodha, Angel One, Upstox).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncPanel(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Close ✕
              </button>
            </div>

            {syncSuccessMsg && (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800 border border-emerald-200">
                {syncSuccessMsg}
              </div>
            )}

            <div className="mt-5 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncConsent}
                  onChange={(e) => setSyncConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-900">Explicit User Consent:</strong> I authorize InvestIQ to perform secure, read-only inquiries to synchronize my holdings. I understand InvestIQ will never execute stock orders or transfer funds, and my tokens remain encrypted.
                </span>
              </label>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {brokerStatuses.map((b) => (
                <div
                  key={b.brokerId}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <BrokerLogo broker={b.brokerName} size="sm" />
                      <span className="font-bold text-slate-900">{b.brokerName}</span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        b.status === 'connected'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                    {b.syncMessage}
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      {b.lastSyncedAt
                        ? `Synced: ${new Date(b.lastSyncedAt).toLocaleDateString('en-IN')}`
                        : 'Manual mode active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTriggerSync(b.brokerId)}
                      disabled={syncingBroker === b.brokerId}
                      className="font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                    >
                      {syncingBroker === b.brokerId ? 'Syncing...' : 'Sync Now →'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 border border-rose-200">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metric Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Total Invested */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Invested
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Wallet className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
              ) : (
                formatINR(totalInvested)
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Total capital invested across all holdings
            </p>
          </div>

          {/* Card 2: Current Portfolio Value */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Current Value
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? (
                <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
              ) : (
                formatINR(currentValue)
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Market value based on live equity prices
            </p>
          </div>

          {/* Card 3: Total Profit/Loss */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Returns (P&L)
              </span>
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  isPnlPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                }`}
              >
                {isPnlPositive ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div
                className={`text-2xl font-black tracking-tight sm:text-3xl ${
                  isPnlPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {loading ? (
                  <div className="h-8 w-32 animate-pulse rounded bg-slate-100" />
                ) : (
                  `${isPnlPositive ? '+' : ''}${formatINR(totalPnl)}`
                )}
              </div>
              {!loading && (
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    isPnlPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {isPnlPositive ? '+' : ''}
                  {totalPnlPercent.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Overall portfolio gain/loss percentage
            </p>
          </div>

          {/* Card 4: Total Companies */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Companies Invested
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
                <Building2 className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {loading ? (
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
              ) : (
                summary?.uniqueCompanies || 0
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across {summary?.totalHoldings || 0} total purchase orders
            </p>
          </div>
        </div>

        {/* Visual Analytics & Broker Breakdown */}
        {summary?.holdings?.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Broker Breakdown Chart */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Broker Distribution
                  </h3>
                  <p className="text-xs text-slate-500">
                    Portfolio share by trading broker
                  </p>
                </div>
                <PieIcon className="h-5 w-5 text-slate-400" />
              </div>

              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => [formatINR(val), 'Invested']}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4">
                {summary.brokerDistribution.map((b) => (
                  <div key={b.brokerName} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: BROKER_COLORS[b.brokerName] || '#64748B' }}
                      />
                      <span className="font-semibold text-slate-700">{b.brokerName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900">{formatINR(b.totalInvested)}</span>
                      <span className="text-slate-400 ml-1.5 font-medium">({b.portfolioPercent}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Reinvest Callout */}
            <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-[#0B3D2C] to-[#145A3E] p-6 sm:p-8 text-white shadow-md flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300">
                  <Zap className="h-3.5 w-3.5" />
                  Smart Broker Routing
                </div>
                <h3 className="mt-4 text-2xl font-black">
                  Invest in your next stock with Groww, Zerodha, Angel One or Upstox
                </h3>
                <p className="mt-2 text-sm text-emerald-100 max-w-xl leading-relaxed">
                  Analyze any company on InvestIQ, get AI-powered briefings and valuation signals, and jump straight to verified broker order pages in 1-click.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/invest')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0B3D2C] hover:bg-emerald-50 px-5 py-3 text-xs font-extrabold shadow-md hover:scale-105 transition"
                >
                  <span>Select Stock to Invest Now</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="rounded-xl border border-white/20 px-4 py-3 text-xs font-bold text-white hover:bg-white/10 transition"
                >
                  Explore Market Trends
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Holdings Table Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          {/* Controls Bar */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                Individual Stock Holdings
              </h2>
              <p className="text-xs text-slate-500">
                Real-time tracking with buy price vs live market value
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search holding */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={holdingSearch}
                  onChange={(e) => setHoldingSearch(e.target.value)}
                  placeholder="Search holdings..."
                  className="rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden w-44 sm:w-56"
                />
              </div>

              {/* Broker Filter */}
              <select
                value={selectedBrokerFilter}
                onChange={(e) => setSelectedBrokerFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
              >
                <option value="ALL">All Brokers</option>
                <option value="Groww">Groww</option>
                <option value="Zerodha Kite">Zerodha Kite</option>
                <option value="Angel One">Angel One</option>
                <option value="Upstox">Upstox</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Table or Empty State */}
          {loading ? (
            <div className="flex h-64 flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <p className="text-sm font-medium text-slate-500">Loading your portfolio holdings...</p>
            </div>
          ) : filteredHoldings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 mb-4">
                <Layers className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                No investment records found
              </h3>
              <p className="mt-1 text-sm text-slate-500 max-w-sm">
                {holdingSearch || selectedBrokerFilter !== 'ALL'
                  ? 'No holdings match your search filters. Try clearing the search query.'
                  : 'Start tracking your investments! Add a stock purchase manually or choose a broker to invest in a company.'}
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D2C] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#145A3E] transition"
                >
                  <Plus className="h-4 w-4" />
                  Add First Investment
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/invest')}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                >
                  Browse Brokers →
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Broker</th>
                    <th className="pb-3 text-right">Quantity</th>
                    <th className="pb-3 text-right">Buy Price</th>
                    <th className="pb-3 text-right">Current Price</th>
                    <th className="pb-3 text-right">Total Invested</th>
                    <th className="pb-3 text-right">P&L</th>
                    <th className="pb-3 pr-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHoldings.map((item) => {
                    const hasPrice = item.priceAvailable && item.currentPrice !== null;
                    const isRowPositive = (item.pnl || 0) >= 0;

                    return (
                      <tr key={item._id} className="group hover:bg-slate-50/70 transition">
                        {/* Company */}
                        <td className="py-3.5 pl-2">
                          <div className="flex items-center gap-3">
                            <CompanyLogo
                              ticker={item.stockSymbol}
                              name={item.companyName}
                              size="sm"
                            />
                            <div>
                              <button
                                type="button"
                                onClick={() => navigate(`/company/${encodeURIComponent(item.stockSymbol)}`)}
                                className="font-extrabold text-slate-900 group-hover:text-emerald-700 transition hover:underline text-left block"
                              >
                                {item.companyName}
                              </button>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <span>{item.stockSymbol}</span>
                                <span>·</span>
                                <span className="font-semibold text-slate-500">{item.exchange || 'NSE'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Broker */}
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <BrokerLogo broker={item.brokerName} size="sm" />
                            <span className="font-semibold text-slate-700">
                              {item.brokerName}
                            </span>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 text-right font-bold text-slate-900">
                          {Number(item.quantity).toLocaleString('en-IN')}
                        </td>

                        {/* Buy Price */}
                        <td className="py-3.5 text-right font-semibold text-slate-700">
                          {formatINR(item.purchasePrice)}
                        </td>

                        {/* Current Price */}
                        <td className="py-3.5 text-right">
                          {hasPrice ? (
                            <div>
                              <div className="font-bold text-slate-900">
                                {formatINR(item.currentPrice)}
                              </div>
                              {item.dayChangePercent !== undefined && (
                                <span
                                  className={`text-[10px] font-semibold ${
                                    item.dayChangePercent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {item.dayChangePercent >= 0 ? '+' : ''}
                                  {Number(item.dayChangePercent).toFixed(2)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-slate-400 italic">
                              Price unavailable
                            </span>
                          )}
                        </td>

                        {/* Total Invested */}
                        <td className="py-3.5 text-right font-bold text-slate-900">
                          {formatINR(item.totalInvestment || (item.quantity * item.purchasePrice))}
                        </td>

                        {/* P&L */}
                        <td className="py-3.5 text-right">
                          {hasPrice && item.pnl !== null ? (
                            <div>
                              <div
                                className={`font-bold ${
                                  isRowPositive ? 'text-emerald-600' : 'text-rose-600'
                                }`}
                              >
                                {isRowPositive ? '+' : ''}
                                {formatINR(item.pnl)}
                              </div>
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-extrabold ${
                                  isRowPositive
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {isRowPositive ? '+' : ''}
                                {Number(item.pnlPercent || 0).toFixed(2)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">
                              Cannot calculate
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsAddModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Edit holding"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(item)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/invest?symbol=${encodeURIComponent(item.stockSymbol)}&name=${encodeURIComponent(item.companyName)}`
                                )
                              }
                              className="rounded-lg p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                              title="Buy more shares"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Investment Modal */}
      <AddInvestmentModal
        isOpen={isAddModalOpen}
        isEditMode={!!editingItem}
        initialData={editingItem}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => {
          fetchPortfolioData(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-center text-lg font-bold text-slate-900">
              Delete Investment Record?
            </h3>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete your holding in <strong className="text-slate-800">{deleteConfirmItem.companyName}</strong> ({deleteConfirmItem.quantity} shares)? This cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="w-1/2 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteInvestment(deleteConfirmItem)}
                disabled={deletingId === deleteConfirmItem._id}
                className="w-1/2 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {deletingId === deleteConfirmItem._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
