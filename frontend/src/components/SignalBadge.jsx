import React from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react';

const setupStyles = {
  POSITIVE_TECHNICAL_SETUP: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50/60',
    text: 'text-emerald-800',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    icon: TrendingUp,
    label: 'Positive Technical Setup',
  },
  NEUTRAL_OR_MIXED_SETUP: {
    border: 'border-amber-200',
    bg: 'bg-amber-50/60',
    text: 'text-amber-800',
    badgeBg: 'bg-amber-100 text-amber-800',
    icon: MinusCircle,
    label: 'Neutral or Mixed Setup',
  },
  NEGATIVE_TECHNICAL_SETUP: {
    border: 'border-rose-200',
    bg: 'bg-rose-50/60',
    text: 'text-rose-800',
    badgeBg: 'bg-rose-100 text-rose-800',
    icon: TrendingDown,
    label: 'Negative Technical Setup',
  },
  INSUFFICIENT_DATA: {
    border: 'border-slate-200',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    badgeBg: 'bg-slate-200 text-slate-700',
    icon: MinusCircle,
    label: 'Insufficient Data',
  },
};

// Fallback mapping for legacy verdict keys
const legacyMapping = {
  BUY: 'POSITIVE_TECHNICAL_SETUP',
  HOLD: 'NEUTRAL_OR_MIXED_SETUP',
  AVOID: 'NEGATIVE_TECHNICAL_SETUP',
};

export default function SignalBadge({ signal }) {
  if (!signal) return null;

  const classification = signal.classification
    || legacyMapping[signal.verdict]
    || 'NEUTRAL_OR_MIXED_SETUP';

  const style = setupStyles[classification] || setupStyles.NEUTRAL_OR_MIXED_SETUP;
  const Icon = style.icon;
  const score = Number(signal.score);

  return (
    <section className={`mb-6 rounded-xl border ${style.border} ${style.bg} p-5 transition-colors`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-xs ${style.text}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Quantitative Research Assessment
              </span>
              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600">
                <ShieldCheck className="h-3 w-3 text-slate-500" />
                Verified Data
              </span>
            </div>
            <div className={`mt-0.5 text-xl font-bold ${style.text}`}>
              {signal.label || style.label}
            </div>
          </div>
        </div>

        {Number.isFinite(score) && (
          <div className="rounded-xl border border-slate-100 bg-white px-3.5 py-2 text-right shadow-xs">
            <div className="text-[11px] font-medium text-slate-500">Evidence Alignment</div>
            <div className="text-base font-bold text-slate-900">{Math.round(score * 100)}%</div>
          </div>
        )}
      </div>

      {signal.summary && (
        <p className="mt-3 text-xs leading-5 text-slate-600">
          {signal.summary}
        </p>
      )}

      {signal.reasoning?.length > 0 && (
        <ul className="mt-3.5 space-y-2 border-t border-slate-200/50 pt-3">
          {signal.reasoning.map((reason, index) => (
            <li key={`${reason}-${index}`} className="flex gap-2 text-xs leading-5 text-slate-700">
              <CheckCircle2 className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${style.text}`} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3.5 flex items-start gap-1.5 rounded-lg bg-white/80 px-3 py-2 text-[11px] font-medium text-slate-500">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
        <span>{signal.disclaimer || 'Objective quantitative setup assessment. Not an individualized Buy/Sell recommendation.'}</span>
      </div>
    </section>
  );
}
