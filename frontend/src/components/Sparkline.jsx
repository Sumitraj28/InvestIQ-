import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';

/**
 * Sparkline component: a tiny Recharts LineChart (no axes/gridlines/tooltip)
 * using the last ~30 days of history5y, colored green if the period trend is up, red if down.
 */
export default function Sparkline({ history = [], width = 100, height = 36 }) {
  const { chartData, isUp } = useMemo(() => {
    if (!Array.isArray(history) || history.length === 0) {
      return { chartData: [], isUp: true };
    }

    // Take last ~30 data points
    const slice = history.slice(-30);
    const chartData = slice.map((item, idx) => ({
      index: idx,
      close: Number(item.close || 0),
    }));

    const first = chartData[0]?.close ?? 0;
    const last = chartData[chartData.length - 1]?.close ?? 0;
    const isUp = last >= first;

    return { chartData, isUp };
  }, [history]);

  if (!chartData || chartData.length < 2) {
    return (
      <div className="flex h-9 w-24 items-center justify-center text-[11px] text-slate-400">
        —
      </div>
    );
  }

  const strokeColor = isUp ? '#10B981' : '#F43F5E';

  return (
    <div className="h-9 w-24 overflow-hidden" aria-label={`30-day trend: ${isUp ? 'Upward' : 'Downward'}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
          {/* Hidden YAxis to ensure tight domain bounding without showing axes */}
          <YAxis domain={['dataMin', 'dataMax']} hide />
          <Line
            type="monotone"
            dataKey="close"
            stroke={strokeColor}
            strokeWidth={1.8}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
