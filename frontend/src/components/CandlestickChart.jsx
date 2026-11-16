import React, { useEffect, useMemo, useRef, useState } from 'react';

function formatINR(value, decimals = 2) {
  if (value === undefined || value === null || !Number.isFinite(Number(value))) return '—';
  return `₹${Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function formatVolume(val) {
  if (!val || !Number.isFinite(Number(val))) return '0';
  const num = Number(val);
  if (num >= 10000000) return `${(num / 10000000).toFixed(2)} Cr`;
  if (num >= 100000) return `${(num / 100000).toFixed(2)} L`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)} K`;
  return num.toLocaleString('en-IN');
}

/**
 * CandlestickChart
 * Professional interactive SVG Candlestick Chart with:
 * - High / Low wicks & Open / Close candle bodies
 * - Color coding (Emerald Green for Bull, Rose Red for Bear)
 * - Dynamic volume bars at the bottom
 * - Y-Axis price grid lines and labels
 * - Date axis markers
 * - Interactive Crosshair with floating / HUD OHLC inspection
 */
export default function CandlestickChart({ data = [], height = 360 }) {
  const containerRef = useRef(null);
  const svgRef = useRef(null);
  const [width, setWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [cursorY, setCursorY] = useState(null);
  const [cursorX, setCursorX] = useState(null);

  // Measure container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setWidth(entry.contentRect.width);
        }
      }
    });
    obs.observe(containerRef.current);
    if (containerRef.current.clientWidth > 0) {
      setWidth(containerRef.current.clientWidth);
    }
    return () => obs.disconnect();
  }, []);

  const padding = { top: 16, bottom: 26, left: 10, right: 68 };
  const innerWidth = Math.max(20, width - padding.left - padding.right);
  const innerHeight = Math.max(20, height - padding.top - padding.bottom);

  // Calculate Price domain
  const { minPrice, maxPrice, gridPrices } = useMemo(() => {
    if (!data.length) return { minPrice: 0, maxPrice: 100, gridPrices: [] };
    let min = Infinity;
    let max = -Infinity;
    data.forEach((d) => {
      const l = Number(d.low);
      const h = Number(d.high);
      if (Number.isFinite(l) && l < min) min = l;
      if (Number.isFinite(h) && h > max) max = h;
    });
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === Infinity) {
      min = 0;
      max = 100;
    }
    if (min === max) {
      min = min * 0.95;
      max = max * 1.05;
    }
    const range = max - min;
    const paddedMin = Math.max(0, min - range * 0.04);
    const paddedMax = max + range * 0.04;

    const steps = 4;
    const step = (paddedMax - paddedMin) / steps;
    const grid = [];
    for (let i = 0; i <= steps; i++) {
      grid.push(paddedMin + i * step);
    }
    return { minPrice: paddedMin, maxPrice: paddedMax, gridPrices: grid };
  }, [data]);

  // Price to Y coordinate mapping
  const scaleY = (val) => {
    if (maxPrice <= minPrice) return padding.top + innerHeight / 2;
    return padding.top + ((maxPrice - val) / (maxPrice - minPrice)) * innerHeight;
  };

  // Volume domain
  const maxVolume = useMemo(() => {
    let maxV = 1;
    data.forEach((d) => {
      const v = Number(d.volume || 0);
      if (v > maxV) maxV = v;
    });
    return maxV;
  }, [data]);

  const volMaxHeight = innerHeight * 0.16;

  // Candlestick spacing
  const count = Math.max(1, data.length);
  const candleSpacing = innerWidth / count;
  const candleWidth = Math.max(1.5, Math.min(14, candleSpacing * 0.72));

  // Active candle for HUD (hovered or last available)
  const activeCandle = (hoveredIndex !== null && data[hoveredIndex])
    ? data[hoveredIndex]
    : (data[data.length - 1] || null);

  const change = activeCandle ? activeCandle.close - activeCandle.open : 0;
  const changePercent = activeCandle && activeCandle.open ? (change / activeCandle.open) * 100 : 0;
  const isUp = change >= 0;

  // Mouse hover handlers
  const handleMouseMove = (e) => {
    if (!svgRef.current || !data.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (
      mouseX >= padding.left &&
      mouseX <= width - padding.right &&
      mouseY >= padding.top &&
      mouseY <= height - padding.bottom
    ) {
      const relativeX = mouseX - padding.left;
      const index = Math.min(data.length - 1, Math.max(0, Math.floor(relativeX / candleSpacing)));
      setHoveredIndex(index);
      setCursorY(mouseY);
      setCursorX(padding.left + index * candleSpacing + candleSpacing / 2);
    } else {
      setHoveredIndex(null);
      setCursorY(null);
      setCursorX(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setCursorY(null);
    setCursorX(null);
  };

  // Cursor price from cursorY
  const cursorPrice = cursorY !== null
    ? maxPrice - ((cursorY - padding.top) / innerHeight) * (maxPrice - minPrice)
    : null;

  // Generate date labels along the bottom (5-6 points)
  const dateTicks = useMemo(() => {
    if (!data.length) return [];
    const ticks = [];
    const step = Math.max(1, Math.floor(data.length / 5));
    for (let i = 0; i < data.length; i += step) {
      ticks.push({
        index: i,
        x: padding.left + i * candleSpacing + candleSpacing / 2,
        label: formatDate(data[i].date),
      });
    }
    // Ensure the last date is included if space allows
    if (data.length > 1 && ticks[ticks.length - 1].index !== data.length - 1) {
      ticks.push({
        index: data.length - 1,
        x: padding.left + (data.length - 1) * candleSpacing + candleSpacing / 2,
        label: formatDate(data[data.length - 1].date),
      });
    }
    return ticks;
  }, [data, candleSpacing, padding.left]);

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg bg-slate-50 text-sm font-semibold text-slate-500">
        No candlestick data available.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden select-none">
      {/* Top HUD Bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-xs">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold text-slate-800">{formatDate(activeCandle?.date)}</span>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">O:</span>
            <span className="font-semibold text-slate-700">{formatINR(activeCandle?.open)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">H:</span>
            <span className="font-semibold text-emerald-600">{formatINR(activeCandle?.high)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">L:</span>
            <span className="font-semibold text-rose-600">{formatINR(activeCandle?.low)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">C:</span>
            <span className={`font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatINR(activeCandle?.close)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`font-semibold ${isUp ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isUp ? '+' : ''}{formatINR(change)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500">
          Vol: <span className="font-semibold text-slate-700">{formatVolume(activeCandle?.volume)}</span>
        </div>
      </div>

      {/* SVG Candlestick Canvas */}
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <clipPath id="chart-area-clip">
            <rect
              x={padding.left}
              y={padding.top}
              width={innerWidth}
              height={innerHeight}
            />
          </clipPath>
        </defs>

        {/* Horizontal Price Grid Lines & Labels */}
        {gridPrices.map((p, idx) => {
          const y = scaleY(p);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth={1}
              />
              <text
                x={width - padding.right + 8}
                y={y + 3.5}
                fill="#64748b"
                fontSize={10}
                fontWeight="500"
                fontFamily="system-ui, sans-serif"
              >
                ₹{p >= 1000 ? Math.round(p).toLocaleString('en-IN') : p.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* Date Labels on Bottom Axis */}
        {dateTicks.map((tick, idx) => (
          <text
            key={idx}
            x={tick.x}
            y={height - 8}
            fill="#94a3b8"
            fontSize={10}
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
          >
            {tick.label}
          </text>
        ))}

        {/* Volume Bars (rendered in background of candles) */}
        <g clipPath="url(#chart-area-clip)">
          {data.map((d, i) => {
            const x = padding.left + i * candleSpacing + candleSpacing / 2;
            const isBullish = d.close >= d.open;
            const vol = Number(d.volume || 0);
            const vHeight = maxVolume > 0 ? (vol / maxVolume) * volMaxHeight : 0;
            const y = padding.top + innerHeight - vHeight;
            return (
              <rect
                key={`vol-${i}`}
                x={x - candleWidth / 2}
                y={y}
                width={candleWidth}
                height={Math.max(1, vHeight)}
                fill={isBullish ? 'rgba(0, 179, 134, 0.22)' : 'rgba(225, 29, 72, 0.22)'}
                rx={0.5}
              />
            );
          })}
        </g>

        {/* Candlesticks (Wicks and Bodies) */}
        <g clipPath="url(#chart-area-clip)">
          {data.map((d, i) => {
            const x = padding.left + i * candleSpacing + candleSpacing / 2;
            const isBullish = d.close >= d.open;
            const candleColor = isBullish ? '#00b386' : '#e11d48';

            const yOpen = scaleY(d.open);
            const yClose = scaleY(d.close);
            const yHigh = scaleY(d.high);
            const yLow = scaleY(d.low);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yClose - yOpen));

            return (
              <g key={`candle-${i}`}>
                {/* High - Low Wick line */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth={candleWidth > 4 ? 1.5 : 1}
                  strokeLinecap="round"
                />
                {/* Open - Close Candle body */}
                <rect
                  x={x - candleWidth / 2}
                  y={bodyTop}
                  width={candleWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  stroke={candleColor}
                  rx={candleWidth > 6 ? 1 : 0.5}
                />
              </g>
            );
          })}
        </g>

        {/* Interactive Crosshair & Price Tag */}
        {cursorX !== null && cursorY !== null && (
          <g pointerEvents="none">
            {/* Vertical crosshair */}
            <line
              x1={cursorX}
              y1={padding.top}
              x2={cursorX}
              y2={height - padding.bottom}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
            {/* Horizontal crosshair */}
            <line
              x1={padding.left}
              y1={cursorY}
              x2={width - padding.right}
              y2={cursorY}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* Price Pill Tag on Right Axis */}
            {cursorPrice !== null && (
              <g transform={`translate(${width - padding.right + 2}, ${cursorY - 10})`}>
                <rect
                  x={0}
                  y={0}
                  width={62}
                  height={20}
                  rx={4}
                  fill="#1e293b"
                />
                <text
                  x={31}
                  y={13.5}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight="600"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  ₹{cursorPrice >= 1000 ? Math.round(cursorPrice).toLocaleString('en-IN') : cursorPrice.toFixed(2)}
                </text>
              </g>
            )}

            {/* Date Tag on Bottom Axis */}
            {hoveredIndex !== null && data[hoveredIndex] && (
              <g transform={`translate(${cursorX - 35}, ${height - padding.bottom + 4})`}>
                <rect
                  x={0}
                  y={0}
                  width={70}
                  height={18}
                  rx={3}
                  fill="#334155"
                />
                <text
                  x={35}
                  y={12.5}
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight="500"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  {formatDate(data[hoveredIndex].date)}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
