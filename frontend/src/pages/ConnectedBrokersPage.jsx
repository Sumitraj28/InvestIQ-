import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Unlink,
  AlertTriangle,
  ArrowRight,
  Info,
  Check,
  X,
} from 'lucide-react';
import BrokerLogo from '../components/BrokerLogo';
import {
  getBrokerConnections,
  initiateBrokerConnect,
  triggerBrokerSync,
  disconnectBrokerAccount,
} from '../services/api';

export default function ConnectedBrokersPage() {
  const { getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [brokers, setBrokers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [disconnectModalBroker, setDisconnectModalBroker] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notification, setNotification] = useState(null);

  // Check URL query params for redirect status from broker OAuth
  useEffect(() => {
    const status = searchParams.get('status');
    const broker = searchParams.get('broker');
    const message = searchParams.get('message');

    if (status === 'connected') {
      setNotification({
        type: 'success',
        title: 'Account Successfully Connected!',
        text: `Your ${broker ? broker.toUpperCase() : ''} account has been securely linked and holdings are synchronized.`,
      });
      // Clean query params
      setSearchParams({});
    } else if (status === 'error') {
      setNotification({
        type: 'error',
        title: 'Connection Failed',
        text: message || 'Failed to authorize broker account. Please try again.',
      });
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const loadConnections = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const token = await getToken();
      const res = await getBrokerConnections(token);
      if (res.success && Array.isArray(res.data)) {
        setBrokers(res.data);
      }
    } catch (err) {
      console.error('Failed to load broker connections:', err);
      setActionError('Unable to load broker status. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const handleConnect = async (brokerId) => {
    try {
      setActionError(null);
      const token = await getToken();
      const res = await initiateBrokerConnect(brokerId, token);

      if (res.success && res.authorizationUrl) {
        // Redirect to official broker authorization page
        window.location.href = res.authorizationUrl;
      } else {
        setActionError(
          res.message ||
            `Automatic connection for ${brokerId.toUpperCase()} requires API credentials in the backend environment.`
        );
      }
    } catch (err) {
      console.error(`Connect error for ${brokerId}:`, err);
      setActionError(err.response?.data?.error || `Failed to initiate connection for ${brokerId}.`);
    }
  };

  const handleSync = async (brokerId) => {
    try {
      setSyncingId(brokerId);
      setActionError(null);
      const token = await getToken();
      const res = await triggerBrokerSync(brokerId, token);
      if (res.success) {
        setNotification({
          type: 'success',
          title: 'Holdings Synchronized',
          text: res.message || 'Latest broker holdings imported successfully.',
        });
        await loadConnections();
      }
    } catch (err) {
      console.error(`Sync error for ${brokerId}:`, err);
      setActionError(err.response?.data?.error || `Failed to sync holdings for ${brokerId}.`);
    } finally {
      setSyncingId(null);
    }
  };

  const handleConfirmDisconnect = async () => {
    if (!disconnectModalBroker) return;
    try {
      const brokerId = disconnectModalBroker.id;
      const token = await getToken();
      await disconnectBrokerAccount(brokerId, token);
      setDisconnectModalBroker(null);
      setNotification({
        type: 'info',
        title: 'Account Disconnected',
        text: `Your ${disconnectModalBroker.name} connection was terminated and synchronized holdings cleared.`,
      });
      await loadConnections();
    } catch (err) {
      console.error('Disconnect error:', err);
      setActionError(err.response?.data?.error || 'Failed to disconnect broker account.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Breadcrumb & Title */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
            <Link to="/portfolio" className="hover:text-emerald-700 transition">
              Portfolio
            </Link>
            <span>/</span>
            <span className="text-slate-800">Connected Brokers</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                Connected Stockbrokers
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Read-Only Sync
                </span>
              </h1>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Link your official Indian stockbroking accounts to automatically import verified equity holdings,
                track multi-broker portfolios in one place, and reconcile trades without double-counting.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={loadConnections}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                Refresh Status
              </button>
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] text-white text-xs font-bold transition shadow-sm"
              >
                View Unified Portfolio <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Security Disclosures Banner */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-sm mt-0.5">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-emerald-950">Bank-Grade Zero-Credential Security</h2>
              <p className="text-xs text-emerald-800 leading-relaxed mt-0.5 max-w-3xl">
                InvestIQ connects directly via official broker OAuth 2.0 gateways. We <strong>never</strong> ask for,
                store, or handle your broker login passwords, PINs, or TOTP secrets. All tokens are encrypted at rest with
                AES-256-GCM, and trading operations (buy/sell) are strictly disabled at the application layer.
              </p>
            </div>
          </div>
        </div>

        {/* Action Notifications */}
        {notification && (
          <div
            className={`rounded-2xl border p-4 flex items-start justify-between shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : notification.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-bold">{notification.title}</p>
                <p className="text-xs mt-0.5">{notification.text}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{actionError}</span>
            </div>
            <button type="button" onClick={() => setActionError(null)} className="text-rose-600 hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Broker Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {brokers.map((broker) => {
            const isConnected = broker.isConnected || broker.connectionStatus === 'connected';
            const isSyncing = syncingId === broker.id || broker.connectionStatus === 'syncing';
            const isUnsupported = broker.status === 'unsupported' || broker.connectionStatus === 'unsupported';
            const isRestricted = broker.status === 'restricted' || broker.connectionStatus === 'restricted';
            const requiresConfig = broker.status === 'requires_config' && !isConnected;

            return (
              <div
                key={broker.id}
                className={`rounded-2xl border bg-white p-6 shadow-sm transition hover:shadow-md flex flex-col justify-between ${
                  isConnected
                    ? 'border-emerald-300 ring-1 ring-emerald-200'
                    : isUnsupported || isRestricted
                    ? 'border-slate-200 opacity-95'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Bar: Logo & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <BrokerLogo broker={broker.id} size="md" />
                      <div>
                        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                          {broker.name}
                          {broker.officialUrl && (
                            <a
                              href={broker.officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-slate-600 transition"
                              title="Official Website"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </h2>
                        <p className="text-xs text-slate-500 font-medium">{broker.authMethod}</p>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Connected
                        </span>
                      ) : isSyncing ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Syncing
                        </span>
                      ) : isUnsupported ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Unsupported
                        </span>
                      ) : isRestricted ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Restricted
                        </span>
                      ) : requiresConfig ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Config Required
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connected Account Details */}
                  {isConnected && (
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200/80 p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Account ID:</span>
                        <span className="font-mono font-bold text-slate-900">{broker.accountMaskedId || 'Linked'}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Last Synchronized:</span>
                        <span className="font-semibold text-slate-800">
                          {broker.lastSuccessfulSyncAt
                            ? new Date(broker.lastSuccessfulSyncAt).toLocaleString('en-IN', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : 'Pending first sync'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Unsupported / Restricted Explanation */}
                  {isUnsupported && (
                    <div className="mt-4 rounded-xl bg-amber-50/60 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                        No Public Retail OAuth Gateway
                      </p>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        Groww does not provide a public third-party retail OAuth consent API for external portfolio reading.
                        Use InvestIQ’s 1-click broker redirect to invest, then record purchases manually in your portfolio.
                      </p>
                    </div>
                  )}

                  {isRestricted && (
                    <div className="mt-4 rounded-xl bg-slate-100 border border-slate-200 p-3 text-xs text-slate-800 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-700 flex-shrink-0" />
                        Zero-Credential Policy Enforcement
                      </p>
                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        Angel One SmartAPI requires collecting user PINs and TOTP tokens directly. To protect your account,
                        InvestIQ refuses to collect or store your broker credentials. Manual portfolio tracking remains fully supported.
                      </p>
                    </div>
                  )}

                  {/* Capabilities Checklist */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-bold text-slate-700 tracking-wide uppercase">Capabilities & Limits</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Equity Holdings</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Real-time Valuation</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                        <span>Deduplication</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <X className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>Order Placement (Off)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSync(broker.id)}
                        disabled={isSyncing}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Synchronizing...' : 'Sync Now'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisconnectModalBroker(broker)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        Disconnect
                      </button>
                    </>
                  ) : isUnsupported || isRestricted ? (
                    <div className="w-full flex items-center justify-between">
                      <Link
                        to="/portfolio"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
                      >
                        Record Manually in Portfolio →
                      </Link>
                      {broker.officialDocs && (
                        <a
                          href={broker.officialDocs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                        >
                          Docs
                        </a>
                      )}
                    </div>
                  ) : requiresConfig ? (
                    <div className="w-full flex items-center justify-between">
                      <span className="text-xs text-amber-700 font-medium">Add credentials to backend .env</span>
                      {broker.officialDocs && (
                        <a
                          href={broker.officialDocs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900"
                        >
                          View Setup Docs <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(broker.id)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0B3D2C] hover:bg-[#145A3E] text-white text-xs font-bold transition shadow-sm"
                    >
                      Connect {broker.name} Account →
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {disconnectModalBroker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 rounded-xl">
                <Unlink className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Disconnect {disconnectModalBroker.name}?</h3>
                <p className="text-xs text-slate-500">Revoke authorization and stop automatic synchronization</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Disconnecting will invalidate stored authentication tokens and remove imported holding snapshots for this broker.
              Your manually recorded purchase history will <strong>not</strong> be affected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDisconnectModalBroker(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-sm"
              >
                Yes, Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
