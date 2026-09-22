import React from 'react';
import { AlertTriangle, CheckCircle2, MinusCircle, TrendingDown, TrendingUp } from 'lucide-react';

const styles = {
  BUY: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    icon: TrendingUp,
    label: 'BUY',
  },
  HOLD: {
    border: 'border-amber-200',
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    icon: MinusCircle,
    label: 'HOLD',
  },
  AVOID: {
    border: 'border-rose-200',
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    icon: TrendingDown,
    label: 'AVOID',
  },
};

export default function SignalBadge({ signal }) {
  if (!signal) return null;

  const verdict = signal.verdict || 'HOLD';
  const style = styles[verdict] || styles.HOLD;
  const Icon = style.icon;
  const score = Number(signal.score);

  return (
    <section className={`mb-6 rounded-lg border ${style.border} ${style.bg} p-5`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white ${style.text}`}>
            <Icon className="h-6 w-6" />
          </span>
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Algorithmic Signal
            </div>
            <div className={`text-2xl font-extrabold ${style.text}`}>{style.label}</div>
          </div>
        </div>

        {Number.isFinite(score) && (
          <div className="rounded-lg bg-white px-3 py-2 text-right shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Score</div>
            <div className="text-lg font-bold text-slate-900">{Math.round(score * 100)}%</div>
          </div>
        )}
      </div>

      {signal.reasoning?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {signal.reasoning.map((reason, index) => (
            <li key={`${reason}-${index}`} className="flex gap-2 text-sm leading-6 text-slate-700">
              <CheckCircle2 className={`mt-1 h-4 w-4 shrink-0 ${style.text}`} />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex items-start gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-medium text-slate-600">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{signal.disclaimer || 'Algorithmic estimate, not financial advice.'}</span>
      </div>
    </section>
  );
}
