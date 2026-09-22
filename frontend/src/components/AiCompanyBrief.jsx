import React from 'react';
import { Bot, CheckCircle2, Info, Loader2, ShieldAlert, Sparkles } from 'lucide-react';

function BulletList({ items = [], icon: Icon, iconClassName = 'text-slate-400' }) {
  if (!items.length) return null;

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-600">
          <Icon className={`mt-1 h-4 w-4 shrink-0 ${iconClassName}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AiCompanyBrief({ summary, loading = false, error = null }) {
  if (loading) {
    return (
      <section className="mb-6 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating AI company brief
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
        {error}
      </section>
    );
  }

  if (!summary) return null;

  return (
    <section className="mb-6 rounded-lg border border-blue-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col justify-between gap-2 border-b border-slate-100 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">AI Company Brief</h2>
            <p className="text-xs font-medium text-slate-500">
              Generated from company profile and stock data
            </p>
          </div>
        </div>
        {summary.generatedBy && (
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
            <Bot className="h-3.5 w-3.5" />
            {summary.generatedBy}
          </span>
        )}
      </div>

      {summary.overview && (
        <p className="mb-5 text-sm leading-6 text-slate-700">{summary.overview}</p>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Stock Details</h3>
          <BulletList items={summary.stockDetails} icon={Info} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Strengths</h3>
          <BulletList items={summary.strengths} icon={CheckCircle2} iconClassName="text-emerald-600" />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-900">Watchouts</h3>
          <BulletList items={summary.watchouts} icon={ShieldAlert} iconClassName="text-amber-600" />
        </div>
      </div>

      {summary.verdict && (
        <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700">
          {summary.verdict}
        </div>
      )}
    </section>
  );
}
