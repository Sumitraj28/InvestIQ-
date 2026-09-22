import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, RefreshCw, SearchX } from 'lucide-react';
import { getStock, getStockAiSummary, getStockHistory } from '../services/api';
import AiCompanyBrief from '../components/AiCompanyBrief';
import CompanySummary, { CompanySummarySkeleton } from '../components/CompanySummary';
import PriceChart from '../components/PriceChart';
import SearchBar from '../components/SearchBar';

function normalizeRouteTicker(value) {
  const decoded = decodeURIComponent(value || '').trim().toUpperCase();
  if (!decoded) return '';
  return decoded.includes('.') ? decoded : `${decoded}.NS`;
}

export default function CompanyPage() {
  const { ticker } = useParams();
  const routeTicker = useMemo(() => normalizeRouteTicker(ticker), [ticker]);
  const [stock, setStock] = useState(null);
  const [history, setHistory] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [error, setError] = useState(null);
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      setSummaryLoading(true);
      setError(null);
      setStock(null);
      setAiSummary(null);
      setAiError(null);

      try {
        const response = await getStock(routeTicker);
        if (!isMounted) return;

        if (response?.success && response.data) {
          setStock(response.data);
          if (Array.isArray(response.data.history5y)) {
            setHistory(response.data.history5y);
          }
        } else {
          setError({ status: 404, message: 'No stock data found for this ticker.' });
        }
      } catch (err) {
        if (!isMounted) return;
        setError({
          status: err.response?.status || 500,
          message: err.response?.data?.error || 'Unable to load stock data.',
        });
      } finally {
        if (isMounted) setSummaryLoading(false);
      }
    };

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await getStockHistory(routeTicker);
        if (!isMounted) return;

        if (response?.success && Array.isArray(response.history5y)) {
          setHistory(response.history5y);
        } else {
          setHistoryError('Historical prices are unavailable for this ticker.');
        }
      } catch (err) {
        if (!isMounted) return;
        setHistoryError(err.response?.data?.error || 'Unable to load historical prices.');
      } finally {
        if (isMounted) setHistoryLoading(false);
      }
    };

    const fetchAiSummary = async () => {
      setAiLoading(true);
      setAiError(null);

      try {
        const response = await getStockAiSummary(routeTicker);
        if (!isMounted) return;

        if (response?.success && response.aiSummary) {
          setAiSummary(response.aiSummary);
        } else {
          setAiError('AI company brief is unavailable for this ticker.');
        }
      } catch (err) {
        if (!isMounted) return;
        setAiError(err.response?.data?.error || 'Unable to generate AI company brief.');
      } finally {
        if (isMounted) setAiLoading(false);
      }
    };

    if (routeTicker) {
      fetchSummary();
      fetchHistory();
      fetchAiSummary();
    }

    return () => {
      isMounted = false;
    };
  }, [routeTicker]);

  const isNotFound = error?.status === 404;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Link
          to="/"
          className="inline-flex items-center text-sm font-semibold text-slate-600 transition hover:text-blue-600"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Search
        </Link>
        <div className="w-full md:w-[420px]">
          <SearchBar initialValue={routeTicker} />
        </div>
      </div>

      {summaryLoading && (
        <div>
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
            Loading market data for {routeTicker}
          </div>
          <CompanySummarySkeleton />
          <PriceChart loading />
        </div>
      )}

      {!summaryLoading && error && (
        <section className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${
            isNotFound ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
          }`}
          >
            {isNotFound ? <SearchX className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>
          <h1 className="text-xl font-bold text-slate-950">
            {isNotFound ? `No data found for ${routeTicker}` : 'Unable to load stock data'}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
            {error.message}
          </p>
          <div className="mt-6">
            <SearchBar />
          </div>
        </section>
      )}

      {!summaryLoading && !error && stock && (
        <div>
          <CompanySummary stock={stock} />
          <AiCompanyBrief summary={aiSummary} loading={aiLoading} error={aiError} />

          {historyError && !historyLoading && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              {historyError}
            </div>
          )}

          <PriceChart
            history={history}
            ticker={stock.ticker || routeTicker}
            loading={historyLoading}
          />
        </div>
      )}
    </div>
  );
}
