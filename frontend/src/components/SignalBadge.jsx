import React from 'react';
import { TrendingUp, TrendingDown, Minus, ShieldCheck } from 'lucide-react';

export default function SignalBadge({ signal = 'NEUTRAL', score, confidence }) {
  const getBadgeStyle = () => {
    switch (signal?.toUpperCase()) {
      case 'BUY':
      case 'BULLISH':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: <TrendingUp className="w-4 h-4 mr-1 text-emerald-600" />,
          label: 'Bullish Signal',
        };
      case 'SELL':
      case 'BEARISH':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: <TrendingDown className="w-4 h-4 mr-1 text-rose-600" />,
          label: 'Bearish Signal',
        };
      case 'HOLD':
      case 'NEUTRAL':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: <Minus className="w-4 h-4 mr-1 text-amber-600" />,
          label: 'Neutral',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${style.bg}`}>
      {style.icon}
      <span>{style.label}</span>
      {confidence !== undefined && (
        <span className="ml-1.5 opacity-75 font-normal">
          ({Math.round(confidence * 100)}% conf)
        </span>
      )}
    </div>
  );
}
