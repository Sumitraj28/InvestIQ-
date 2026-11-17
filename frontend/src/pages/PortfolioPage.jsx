import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  Lightbulb,
  Loader2,
  PieChart as PieIcon,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  Sliders,
  Trash2,
  TrendingUp,
  Wallet,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import {
  deleteInvestment as apiDeleteInvestment,
  getBrokerSyncStatus,
  getPortfolioPrices,
  getPortfolioSummary,
  syncBrokerHoldings,
  getSyncedHoldings,
  getReconciliationRecords,
} from '../services/api';
import * as portfolioStorage from '../services/portfolioStorage';
import {
  calculateBrokerAnalysis,
  calculatePortfolioMetrics,
  calculateSectorAllocation,
  enrichHoldingWithQuote,
  exportPortfolioToCSV,
  formatINR,
  formatPercent,
  generatePortfolioInsights,
  getGainersAndLosers,
  reconcileClientHoldings,
} from '../services/portfolioAnalytics';
import CompanyLogo from '../components/CompanyLogo';
import BrokerLogo from '../components/BrokerLogo';
import AddInvestmentModal from '../components/AddInvestmentModal';
import PortfolioSummaryCards from '../components/PortfolioSummaryCards';
import PortfolioAllocationChart from '../components/PortfolioAllocationChart';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import PortfolioGainersLosers from '../components/PortfolioGainersLosers';
import BrokerAnalysisCards from '../components/BrokerAnalysisCards';
import PortfolioInsightsCard from '../components/PortfolioInsightsCard';
import PortfolioHoldingsTable from '../components/PortfolioHoldingsTable';
import ReconciliationPanel from '../components/ReconciliationPanel';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export default function PortfolioPage() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { user } = useUser();

  const [transactions, setTransactions] = useState([]);
  const [syncedHoldings, setSyncedHoldings] = useState([]);
  const [reconciliationRecords, setReconciliationRecords] = useState([]);
  const [reconciliationSummary, setReconciliationSummary] = useState({});
  const [quotesMap, setQuotesMap] = useState({});
  const [lastQuotesUpdated, setLastQuotesUpdated] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  // Broker Sync Drawer state (Future integration readiness)
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [brokerStatuses, setBrokerStatuses] = useState([]);
  const [syncConsent, setSyncConsent] = useState(true);
  const [syncingBroker, setSyncingBroker] = useState(null);

  // Filters for Transaction History
  const [txSearch, setTxSearch] = useState('');
  const [txBrokerFilter, setTxBrokerFilter] = useState('ALL');
  const [txCompanyFilter, setTxCompanyFilter] = useState('ALL');
  const [txDateRange, setTxDateRange] = useState('ALL');

  // Active section view
  const [activeSection, setActiveSection] = useState('all'); // 'all' | 'analytics' | 'holdings' | 'history'

  // Fetch prices for a list of symbols
  const fetchQuotes = useCallback(
    async (symbols) => {
      if (!symbols || !symbols.length) return {};
      try {
        const token = await getToken();
        const res = await getPortfolioPrices(symbols, token);
        if (res?.success && res.data) {
          setLastQuotesUpdated(new Date().toISOString());
          return res.data;
        }
      } catch (err) {
        console.warn('[PortfolioPage] Price fetch error:', err.message || err);
      }
      return {};
    },
    [getToken]
  );

  // Load portfolio data from client storage and sync with backend API & market prices
  const fetchPortfolioData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      setError(null);

      const userId = user?.id;

      try {
        // 1. Load user-scoped client transactions
        let localList = portfolioStorage.getInvestments(userId);

        // 2. Query backend API if authenticated (merges any server-side recorded holdings)
        try {
          const token = await getToken();
          if (token) {
            const [summaryRes, brokersRes, syncedRes, reconRes] = await Promise.all([
              getPortfolioSummary(token).catch(() => null),
              getBrokerSyncStatus(token).catch(() => null),
              getSyncedHoldings(token).catch(() => null),
              getReconciliationRecords(token).catch(() => null),
            ]);

            if (summaryRes?.success && Array.isArray(summaryRes.data?.holdings)) {
              const existingIds = new Set(localList.map((i) => i.id || i._id));
              let hasNewServerRecords = false;

              for (const serverItem of summaryRes.data.holdings) {
                const sId = serverItem._id || serverItem.id;
                if (sId && !existingIds.has(sId)) {
                  portfolioStorage.addInvestment(userId, {
                    ...serverItem,
                    id: sId,
                  });
                  hasNewServerRecords = true;
                }
              }

              if (hasNewServerRecords) {
                localList = portfolioStorage.getInvestments(userId);
              }
            }

            if (brokersRes?.success && Array.isArray(brokersRes.data)) {
              setBrokerStatuses(brokersRes.data);
            }

            if (syncedRes?.success && Array.isArray(syncedRes.data)) {
              setSyncedHoldings(syncedRes.data);
            }

            if (reconRes?.success) {
              setReconciliationRecords(reconRes.records || []);
              setReconciliationSummary(reconRes.summary || {});
            }
          }
        } catch (backendErr) {
          console.warn('[PortfolioPage] Backend sync notice:', backendErr.message || backendErr);
        }

        setTransactions(localList);

        // 3. Fetch latest market quotes for all unique symbols
        const uniqueSymbols = [...new Set(localList.map((t) => t.symbol))];
        if (uniqueSymbols.length > 0) {
          const fetchedQuotes = await fetchQuotes(uniqueSymbols);
          setQuotesMap((prev) => ({ ...prev, ...fetchedQuotes }));
        }
      } catch (err) {
        console.error('[PortfolioPage] Fetch error:', err);
        setError('Unable to load full portfolio. Showing cached data.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, getToken, fetchQuotes]
  );

  useEffect(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

  // Refresh latest prices manually
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolioData(true);
  };

  // Delete investment record with confirmation
  const handleDeleteInvestment = async (item) => {
    if (!item) return;
    const targetId = item.id || item._id;

    try {
      setDeletingId(targetId);

      portfolioStorage.deleteInvestment(user?.id, targetId);

      try {
        const token = await getToken();
        if (token && (item._id || item.id)) {
          await apiDeleteInvestment(item._id || item.id, token);
        }
      } catch (backendErr) {
        console.warn('[PortfolioPage] Backend delete notice:', backendErr.message || backendErr);
      }

      setDeleteConfirmItem(null);
      setNotification(`Removed purchase record for ${item.companyName} (${item.quantity} shares).`);
      setTimeout(() => setNotification(null), 4000);

      fetchPortfolioData(true);
    } catch (err) {
      console.error('[Portfolio] Delete error:', err);
      alert('Could not delete investment record. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  // Broker auto-sync simulation
  const handleTriggerSync = async (brokerId) => {
    if (!syncConsent) {
      alert('Please check the consent box to authorize synchronization.');
      return;
    }

    setSyncingBroker(brokerId);

    try {
      const token = await getToken();
      const res = await syncBrokerHoldings(brokerId, true, token);
      if (res?.success) {
        setNotification(`Broker synchronization recorded for ${brokerId.toUpperCase()}!`);
        setTimeout(() => setNotification(null), 4000);
        fetchPortfolioData(true);
      }
    } catch (err) {
      console.error('[Broker Sync] Error:', err);
      alert('Broker sync failed.');
    } finally {
      setSyncingBroker(null);
    }
  };

  // ── Phase 3 & 4 Financial Analytics & Multi-Broker Reconciliation ──

  // 1. Group raw manual transactions into aggregated holdings (weighted average buy price)
  const rawManualHoldings = useMemo(() => {
    return portfolioStorage.groupInvestmentsByHolding(transactions);
  }, [transactions]);

  // 2. Reconcile manual holdings with verified broker-synced holdings
  const { unifiedHoldings: rawHoldings, reconciliationRecords: activeReconRecords, summary: activeReconSummary } = useMemo(() => {
    return reconcileClientHoldings(rawManualHoldings, syncedHoldings);
  }, [rawManualHoldings, syncedHoldings]);

  // 2. Enrich holdings with live market quotes
  const enrichedHoldings = useMemo(() => {
    return rawHoldings.map((h) => {
      const cleanSymbol = (h.stockSymbol || '').replace('.NS', '');
      const quote =
        quotesMap[h.stockSymbol] ||
        quotesMap[cleanSymbol] ||
        quotesMap[`${cleanSymbol}.NS`];
      return enrichHoldingWithQuote(h, quote);
    });
  }, [rawHoldings, quotesMap]);

  // 3. Compute Phase 3 Portfolio Metrics
  const metrics = useMemo(() => {
    return calculatePortfolioMetrics(enrichedHoldings);
  }, [enrichedHoldings]);

  // 4. Compute Gainers & Losers
  const { gainers, losers } = useMemo(() => {
    return getGainersAndLosers(enrichedHoldings, 5);
  }, [enrichedHoldings]);

  // 5. Compute Broker-wise Performance
  const brokerAnalysis = useMemo(() => {
    return calculateBrokerAnalysis(enrichedHoldings);
  }, [enrichedHoldings]);

  // 6. Compute Sector Allocation
  const sectorAllocation = useMemo(() => {
    return calculateSectorAllocation(enrichedHoldings);
  }, [enrichedHoldings]);

  // 7. Generate Rule-Based Insights
  const insights = useMemo(() => {
    return generatePortfolioInsights(enrichedHoldings, metrics);
  }, [enrichedHoldings, metrics]);

  // 8. Filtered Transaction History
  const filteredTransactions = useMemo(() => {
    return portfolioStorage.filterTransactions(transactions, {
      search: txSearch,
      broker: txBrokerFilter,
      company: txCompanyFilter,
      dateRange: txDateRange,
    });
  }, [transactions, txSearch, txBrokerFilter, txCompanyFilter, txDateRange]);

  const uniqueCompanySymbols = useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.symbol)));
  }, [transactions]);

  // Best & Worst Performers
  const bestPerformer = gainers[0] || null;
  const worstPerformer = losers[0] || null;

  // Print Report Handler
  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 print:bg-white print:py-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 print:px-0 print:max-w-none">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B3D2C] text-white shadow-md print:hidden">
                <Wallet className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                  Portfolio Dashboard & Live Valuation
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Real-time market valuation, profit & loss analytics, and multi-broker tracking
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            {/* Export Dropdown / Buttons */}
            <button
              type="button"
              onClick={() => exportPortfolioToCSV(enrichedHoldings, metrics)}
              disabled={!enrichedHoldings.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition disabled:opacity-50"
              title="Download detailed portfolio CSV report"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              disabled={!enrichedHoldings.length}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:border-emerald-300 hover:text-emerald-700 transition disabled:opacity-50"
              title="Print or save PDF portfolio report"
            >
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print / PDF</span>
            </button>

            <Link
              to="/connected-brokers"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 shadow-xs hover:bg-emerald-100 transition"
              title="Manage live broker accounts and automatic synchronization"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Connected Brokers</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              Record Investment
            </button>
          </div>
        </div>

        {/* Global Notification Banner */}
        {notification && (
          <div className="mb-6 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs animate-in fade-in print:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-emerald-600 hover:text-emerald-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-semibold text-rose-700 border border-rose-200 print:hidden">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sync Panel Drawer (Future integration readiness) */}
        {showSyncPanel && (
          <div className="mb-8 rounded-2xl border border-emerald-200 bg-white p-6 shadow-md animate-in slide-in-from-top-4 duration-300 print:hidden">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Broker Synchronization (Future Phase Readiness)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Secure read-only holding synchronization with supported brokers (Groww, Zerodha Kite, Angel One, Upstox).
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
              {['groww', 'zerodha', 'angelone', 'upstox'].map((bId) => {
                const bName =
                  bId === 'groww'
                    ? 'Groww'
                    : bId === 'zerodha'
                    ? 'Zerodha Kite'
                    : bId === 'angelone'
                    ? 'Angel One'
                    : 'Upstox';
                const statusObj = brokerStatuses.find((b) => b.brokerId === bId);
                const isConn = statusObj?.status === 'connected';

                return (
                  <div key={bId} className="rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <BrokerLogo broker={bName} size="sm" />
                        <span className="font-bold text-slate-900">{bName}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          isConn
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isConn ? 'Connected' : 'Manual'}
                      </span>
                    </div>

                    <p className="mt-3 text-[11px] text-slate-500 leading-snug">
                      {statusObj?.syncMessage || `Manual recording enabled for ${bName} purchases.`}
                    </p>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">
                        {statusObj?.lastSyncedAt
                          ? `Synced: ${formatDate(statusObj.lastSyncedAt)}`
                          : 'Manual mode active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTriggerSync(bId)}
                        disabled={syncingBroker === bId}
                        className="font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                      >
                        {syncingBroker === bId ? 'Connecting...' : 'Authorize →'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FEATURE 1 & 2: Top Portfolio Summary Cards */}
        <div className="mb-8">
          <PortfolioSummaryCards
            metrics={metrics}
            bestPerformer={bestPerformer}
            worstPerformer={worstPerformer}
            loading={loading}
            refreshing={refreshing}
            lastUpdated={lastQuotesUpdated}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Navigation Tabs Bar */}
        <div className="mb-6 flex items-center justify-between border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-6 text-xs sm:text-sm font-bold">
            <button
              type="button"
              onClick={() => setActiveSection('all')}
              className={`pb-3 transition ${
                activeSection === 'all'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Comprehensive View
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('analytics')}
              className={`pb-3 transition ${
                activeSection === 'analytics'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Visual Analytics & Charts
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('holdings')}
              className={`pb-3 transition ${
                activeSection === 'holdings'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Holdings Table ({enrichedHoldings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('reconciliation')}
              className={`pb-3 transition ${
                activeSection === 'reconciliation'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Reconciliation & Deduplication
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('history')}
              className={`pb-3 transition ${
                activeSection === 'history'
                  ? 'border-b-2 border-emerald-600 text-emerald-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Transaction Audit Log ({transactions.length})
            </button>
          </div>
        </div>

        {/* FEATURE 5 & 6: Interactive Charts Grid */}
        {(activeSection === 'all' || activeSection === 'analytics') && enrichedHoldings.length > 0 && (
          <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Historical Performance Trajectory Chart */}
            <PortfolioPerformanceChart enrichedHoldings={enrichedHoldings} />

            {/* Dynamic Multi-Mode Allocation Chart */}
            <PortfolioAllocationChart
              enrichedHoldings={enrichedHoldings}
              brokerAnalysis={brokerAnalysis}
              sectorAllocation={sectorAllocation}
            />
          </div>
        )}

        {/* FEATURE 7: Top Gainers and Losers */}
        {(activeSection === 'all' || activeSection === 'analytics') && (gainers.length > 0 || losers.length > 0) && (
          <div className="mb-8">
            <PortfolioGainersLosers gainers={gainers} losers={losers} />
          </div>
        )}

        {/* FEATURE 8: Broker-wise Distribution Cards */}
        {(activeSection === 'all' || activeSection === 'analytics') && brokerAnalysis.length > 0 && (
          <div className="mb-8">
            <BrokerAnalysisCards brokerAnalysis={brokerAnalysis} />
          </div>
        )}

        {/* FEATURE 4 & 9: Advanced Portfolio Holdings Table */}
        {(activeSection === 'all' || activeSection === 'holdings') && (
          <div className="mb-8">
            <PortfolioHoldingsTable
              enrichedHoldings={enrichedHoldings}
              loading={loading}
              onEditTransaction={(tx) => {
                setEditingItem(tx);
                setIsAddModalOpen(true);
              }}
              onDeleteTransaction={(tx) => setDeleteConfirmItem(tx)}
              onAddTransaction={(h) => {
                setEditingItem({
                  companyName: h.companyName,
                  stockSymbol: h.stockSymbol,
                  brokerName: h.brokerName,
                  exchange: h.exchange,
                  purchasePrice: h.currentPrice || h.averagePrice,
                });
                setIsAddModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Phase 4: Reconciliation & Deduplication Panel */}
        {(activeSection === 'all' || activeSection === 'reconciliation') && (
          <div className="mb-8">
            <ReconciliationPanel
              reconciliationRecords={activeReconRecords.length > 0 ? activeReconRecords : reconciliationRecords}
              summary={activeReconSummary.totalHoldings ? activeReconSummary : reconciliationSummary}
              loading={loading}
            />
          </div>
        )}

        {/* FEATURE 10: Rule-Based Insights Card */}
        {(activeSection === 'all' || activeSection === 'analytics') && insights.length > 0 && (
          <div className="mb-8">
            <PortfolioInsightsCard insights={insights} />
          </div>
        )}

        {/* Transaction History Section */}
        {(activeSection === 'all' || activeSection === 'history') && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs print:hidden">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <History className="h-5 w-5 text-emerald-700" />
                  Transaction History (Audit Log)
                </h2>
                <p className="text-xs text-slate-500">
                  Chronological record of all individual purchase orders with edit and delete controls
                </p>
              </div>

              {/* Filters Bar */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder="Search transactions..."
                    className="rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3.5 py-1.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-hidden w-40 sm:w-48"
                  />
                </div>

                <select
                  value={txBrokerFilter}
                  onChange={(e) => setTxBrokerFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="ALL">All Brokers</option>
                  <option value="Groww">Groww</option>
                  <option value="Zerodha Kite">Zerodha Kite</option>
                  <option value="Angel One">Angel One</option>
                  <option value="Upstox">Upstox</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={txCompanyFilter}
                  onChange={(e) => setTxCompanyFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden max-w-[140px]"
                >
                  <option value="ALL">All Stocks</option>
                  {uniqueCompanySymbols.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>

                <select
                  value={txDateRange}
                  onChange={(e) => setTxDateRange(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="ALL">All Dates</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="1Y">Last 1 Year</option>
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex h-48 flex-col items-center justify-center gap-3">
                <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                <p className="text-xs font-medium text-slate-500">Loading transactions...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 mb-3">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  No transactions match your filters
                </h3>
                <p className="mt-1 text-xs text-slate-500 max-w-sm">
                  {txSearch || txBrokerFilter !== 'ALL' || txCompanyFilter !== 'ALL' || txDateRange !== 'ALL'
                    ? 'Try resetting the search filters above.'
                    : 'Add your confirmed stock purchases to see your transaction history here.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTxSearch('');
                    setTxBrokerFilter('ALL');
                    setTxCompanyFilter('ALL');
                    setTxDateRange('ALL');
                  }}
                  className="mt-3 text-xs font-bold text-emerald-700 hover:underline"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-3 pl-2">Date</th>
                      <th className="pb-3">Company</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Broker</th>
                      <th className="pb-3 text-right">Quantity</th>
                      <th className="pb-3 text-right">Price</th>
                      <th className="pb-3 text-right">Total Cost</th>
                      <th className="pb-3 pr-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id || tx._id} className="group hover:bg-slate-50/70 transition">
                        <td className="py-3.5 pl-2 font-medium text-slate-600 whitespace-nowrap">
                          {formatDate(tx.purchaseDate)}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-2.5">
                            <CompanyLogo ticker={tx.symbol} name={tx.companyName} size="sm" />
                            <div>
                              <div className="font-extrabold text-slate-900">{tx.companyName}</div>
                              <div className="text-[11px] text-slate-400">
                                {tx.symbol} · {tx.exchange}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5">
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                            {tx.transactionType || 'BUY'}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <BrokerLogo broker={tx.broker} size="sm" />
                            <span className="font-medium text-slate-700">{tx.broker}</span>
                          </div>
                        </td>
                        <td className="py-3.5 text-right font-bold text-slate-900">
                          {Number(tx.quantity).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 text-right font-medium text-slate-700">
                          {formatINR(tx.purchasePrice)}
                        </td>
                        <td className="py-3.5 text-right font-bold text-slate-900">
                          {formatINR(tx.totalCost || tx.purchaseValue)}
                          {tx.transactionCharges > 0 && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              incl. {formatINR(tx.transactionCharges)} fee
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 pr-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(tx);
                                setIsAddModalOpen(true);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition"
                              title="Edit transaction"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmItem(tx)}
                              className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete transaction"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in print:hidden">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-slate-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mx-auto mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-center text-lg font-extrabold text-slate-900">
              Delete Investment?
            </h3>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">
              Are you sure you want to remove this investment from your portfolio? This action cannot be undone.
            </p>
            <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100 text-center font-medium">
              <strong>{deleteConfirmItem.companyName}</strong> ({deleteConfirmItem.quantity} shares on {deleteConfirmItem.broker})
            </div>
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
                disabled={deletingId === (deleteConfirmItem.id || deleteConfirmItem._id)}
                className="w-1/2 rounded-xl bg-rose-600 hover:bg-rose-700 py-2.5 text-xs font-bold text-white shadow-md transition disabled:opacity-50"
              >
                {deletingId === (deleteConfirmItem.id || deleteConfirmItem._id) ? 'Deleting...' : 'Delete Investment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
