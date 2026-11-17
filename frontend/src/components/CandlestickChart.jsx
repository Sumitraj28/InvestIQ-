import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, Minimize2, Sliders, TrendingUp, Activity, BarChart2 } from 'lucide-react';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
} from '../services/technicalIndicators';

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

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '1D', '1W', '1M'];

/**
 * CandlestickChart
 * Professional interactive Candlestick Chart with:
 * - Multi-timeframe selection (1m, 5m, 15m, 1h, 1D, 1W, 1M)
 * - Technical Indicators (SMA 20/50/200, EMA 9/20/50, Bollinger Bands, Volume MA)
 * - RSI (14) & MACD (12, 26, 9) synchronized sub-charts
 * - Real-time tick absorption into active candle
 * - Interactive Crosshair HUD & Fullscreen mode
 */
export default function CandlestickChart({
  data = [],
  height = 380,
  activeTimeframe = '1D',
  onTimeframeChange,
  liveTick = null,
}) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(800);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [cursorY, setCursorY] = useState(null);
  const [cursorX, setCursorX] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showIndicatorMenu, setShowIndicatorMenu] = useState(false);

  // Active Indicators State
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: false,
    sma200: false,
    ema9: false,
    ema20: false,
    ema50: false,
    bollinger: false,
    rsi: false,
    macd: false,
    volumeMa: true,
  });

  const toggleIndicator = (key) => {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
  }, [isFullscreen]);

  // Handle ESC key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Incorporate liveTick into latest candle if available
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const copy = data.map((d) => ({ ...d }));
    if (liveTick && liveTick.lastPrice && copy.length > 0) {
      const last = { ...copy[copy.length - 1] };
      const ltp = Number(liveTick.lastPrice);
      last.close = ltp;
      last.high = Math.max(Number(last.high || ltp), ltp);
      last.low = Math.min(Number(last.low || ltp), ltp);
      if (liveTick.volume) {
        last.volume = Number(liveTick.volume);
      }
      copy[copy.length - 1] = last;
    }
    return copy;
  }, [data, liveTick]);

  // Compute Technical Indicators
  const indicatorSeries = useMemo(() => {
    if (!chartData || chartData.length === 0) {
      return {
        sma20: [],
        sma50: [],
        sma200: [],
        ema9: [],
        ema20: [],
        ema50: [],
        bollinger: [],
        rsi: [],
        macd: [],
        volumeMa: [],
      };
    }

    return {
      sma20: calculateSMA(chartData, 20),
      sma50: calculateSMA(chartData, 50),
      sma200: calculateSMA(chartData, 200),
      ema9: calculateEMA(chartData, 9),
      ema20: calculateEMA(chartData, 20),
      ema50: calculateEMA(chartData, 50),
      bollinger: calculateBollingerBands(chartData, 20, 2),
      rsi: calculateRSI(chartData, 14),
      macd: calculateMACD(chartData, 12, 26, 9),
      volumeMa: calculateVolumeMA(chartData, 20),
    };
  }, [chartData]);

  // Dimensions & Layout
  const padding = { top: 16, bottom: 26, left: 10, right: 68 };
  const innerWidth = Math.max(20, width - padding.left - padding.right);

  // Subchart heights
  const subChartHeight = 90;
  const showRsi = indicators.rsi;
  const showMacd = indicators.macd;
  const extraHeight = (showRsi ? subChartHeight + 16 : 0) + (showMacd ? subChartHeight + 16 : 0);
  const mainChartHeight = Math.max(200, height);
  const totalSvgHeight = mainChartHeight + extraHeight;

  const innerHeight = Math.max(20, mainChartHeight - padding.top - padding.bottom);

  // Price Domain Calculations
  const { minPrice, maxPrice, gridPrices } = useMemo(() => {
    if (!chartData.length) return { minPrice: 0, maxPrice: 100, gridPrices: [] };
    let min = Infinity;
    let max = -Infinity;
    chartData.forEach((d) => {
      const l = Number(d.low);
      const h = Number(d.high);
      if (Number.isFinite(l) && l < min) min = l;
      if (Number.isFinite(h) && h > max) max = h;
    });

    // Also account for Bollinger Bands in domain if enabled
    if (indicators.bollinger && indicatorSeries.bollinger.length) {
      indicatorSeries.bollinger.forEach((b) => {
        if (b && b.upper !== null && b.upper > max) max = b.upper;
        if (b && b.lower !== null && b.lower < min) min = b.lower;
      });
    }

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
  }, [chartData, indicators.bollinger, indicatorSeries.bollinger]);

  // Volume domain
  const maxVolume = useMemo(() => {
    if (!chartData.length) return 1;
    let max = 0;
    chartData.forEach((d) => {
      const v = Number(d.volume || 0);
      if (v > max) max = v;
    });
    return max > 0 ? max : 1;
  }, [chartData]);

  // Coordinate Mapping
  const n = chartData.length;
  const candleSlotWidth = n > 0 ? innerWidth / n : 0;
  const candleBodyWidth = Math.max(1, Math.min(18, candleSlotWidth * 0.72));

  const getX = (idx) => padding.left + idx * candleSlotWidth + candleSlotWidth / 2;

  const getY = (price) => {
    if (maxPrice === minPrice) return padding.top + innerHeight / 2;
    const normalized = (price - minPrice) / (maxPrice - minPrice);
    return padding.top + innerHeight - normalized * innerHeight;
  };

  const getVolY = (vol) => {
    const volHeightMax = innerHeight * 0.22;
    const normalized = Math.min(1, Math.max(0, vol / maxVolume));
    return padding.top + innerHeight - normalized * volHeightMax;
  };

  // Helper for generating SVG polyline points from indicator array
  const buildPolylinePoints = (values) => {
    if (!values || values.length === 0) return '';
    const points = [];
    values.forEach((val, idx) => {
      if (val !== null && Number.isFinite(val)) {
        points.push(`${getX(idx).toFixed(1)},${getY(val).toFixed(1)}`);
      }
    });
    return points.join(' ');
  };

  // Bollinger Shaded Area
  const bollingerPolygonPoints = useMemo(() => {
    if (!indicators.bollinger || !indicatorSeries.bollinger.length) return '';
    const upperPoints = [];
    const lowerPoints = [];

    indicatorSeries.bollinger.forEach((b, idx) => {
      if (b && b.upper !== null && b.lower !== null) {
        upperPoints.push(`${getX(idx).toFixed(1)},${getY(b.upper).toFixed(1)}`);
        lowerPoints.unshift(`${getX(idx).toFixed(1)},${getY(b.lower).toFixed(1)}`);
      }
    });

    if (upperPoints.length === 0) return '';
    return [...upperPoints, ...lowerPoints].join(' ');
  }, [indicators.bollinger, indicatorSeries.bollinger, innerWidth, minPrice, maxPrice]);

  // Volume MA line points
  const volumeMaPoints = useMemo(() => {
    if (!indicators.volumeMa || !indicatorSeries.volumeMa.length) return '';
    const points = [];
    indicatorSeries.volumeMa.forEach((val, idx) => {
      if (val !== null && Number.isFinite(val)) {
        points.push(`${getX(idx).toFixed(1)},${getVolY(val).toFixed(1)}`);
      }
    });
    return points.join(' ');
  }, [indicators.volumeMa, indicatorSeries.volumeMa, maxVolume]);

  // Active hovered candle
  const activeCandle = hoveredIndex !== null && chartData[hoveredIndex]
    ? chartData[hoveredIndex]
    : chartData[chartData.length - 1];

  const cursorPrice = useMemo(() => {
    if (cursorY === null) return null;
    const relY = cursorY - padding.top;
    if (relY < 0 || relY > innerHeight) return null;
    const normalized = 1 - relY / innerHeight;
    return minPrice + normalized * (maxPrice - minPrice);
  }, [cursorY, minPrice, maxPrice, innerHeight]);

  const handleMouseMove = (e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    if (clientX < padding.left || clientX > width - padding.right) {
      setHoveredIndex(null);
      setCursorX(null);
      setCursorY(null);
      return;
    }

    const relX = clientX - padding.left;
    const idx = Math.min(n - 1, Math.max(0, Math.floor(relX / candleSlotWidth)));
    setHoveredIndex(idx);
    setCursorX(padding.left + idx * candleSlotWidth + candleSlotWidth / 2);
    setCursorY(Math.max(padding.top, Math.min(padding.top + innerHeight, clientY)));
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
    setCursorX(null);
    setCursorY(null);
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-xl border border-slate-200 bg-white font-sans shadow-sm transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto p-6 bg-slate-900 text-white' : 'w-full'
      }`}
    >
      {/* ── Toolbar: Timeframes & Indicator Controls ── */}
      <div className={`flex flex-wrap items-center justify-between border-b px-4 py-2.5 gap-2 ${
        isFullscreen ? 'border-slate-800 bg-slate-900' : 'border-slate-100 bg-slate-50/50'
      }`}>
        {/* Timeframe Selection Buttons */}
        <div className="flex items-center space-x-1">
          {TIMEFRAMES.map((tf) => {
            const isActive = activeTimeframe === tf;
            return (
              <button
                key={tf}
                type="button"
                onClick={() => onTimeframeChange && onTimeframeChange(tf)}
                className={`rounded px-2.5 py-1 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isFullscreen
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                {tf}
              </button>
            );
          })}
        </div>

        {/* Indicator Controls & Fullscreen */}
        <div className="flex items-center space-x-2">
          {/* Quick Indicator Toggles */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs">
            <button
              type="button"
              onClick={() => toggleIndicator('sma20')}
              className={`rounded px-2 py-0.5 font-medium transition ${
                indicators.sma20
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              SMA 20
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator('bollinger')}
              className={`rounded px-2 py-0.5 font-medium transition ${
                indicators.bollinger
                  ? 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              BB (20,2)
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator('rsi')}
              className={`rounded px-2 py-0.5 font-medium transition ${
                indicators.rsi
                  ? 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              RSI (14)
            </button>
            <button
              type="button"
              onClick={() => toggleIndicator('macd')}
              className={`rounded px-2 py-0.5 font-medium transition ${
                indicators.macd
                  ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-400/30'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              MACD
            </button>
          </div>

          {/* Indicator Settings Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowIndicatorMenu(!showIndicatorMenu)}
              className={`flex items-center space-x-1 rounded px-2 py-1 text-xs font-medium border ${
                showIndicatorMenu
                  ? 'bg-slate-200 border-slate-300 text-slate-900'
                  : isFullscreen
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Indicators</span>
            </button>

            {showIndicatorMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-xl z-30 text-slate-800 text-xs space-y-2">
                <div className="font-semibold text-slate-950 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Technical Overlays</span>
                  <button
                    type="button"
                    onClick={() => setShowIndicatorMenu(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.sma20}
                      onChange={() => toggleIndicator('sma20')}
                      className="rounded text-amber-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                      <span>SMA 20 (Short Trend)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.sma50}
                      onChange={() => toggleIndicator('sma50')}
                      className="rounded text-blue-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                      <span>SMA 50 (Intermediate)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.sma200}
                      onChange={() => toggleIndicator('sma200')}
                      className="rounded text-purple-600"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-600"></span>
                      <span>SMA 200 (Long Trend)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.ema9}
                      onChange={() => toggleIndicator('ema9')}
                      className="rounded text-emerald-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      <span>EMA 9 (Momentum)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.bollinger}
                      onChange={() => toggleIndicator('bollinger')}
                      className="rounded text-indigo-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
                      <span>Bollinger Bands (20, 2)</span>
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.volumeMa}
                      onChange={() => toggleIndicator('volumeMa')}
                      className="rounded text-slate-500"
                    />
                    <span className="flex items-center space-x-1.5">
                      <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                      <span>Volume MA (20)</span>
                    </span>
                  </label>
                </div>

                <div className="font-semibold text-slate-950 pt-2 pb-1 border-b border-slate-100">
                  Sub-Chart Oscillators
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.rsi}
                      onChange={() => toggleIndicator('rsi')}
                      className="rounded text-purple-600"
                    />
                    <span>RSI (14) Relative Strength</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={indicators.macd}
                      onChange={() => toggleIndicator('macd')}
                      className="rounded text-cyan-600"
                    />
                    <span>MACD (12, 26, 9)</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`p-1 rounded text-slate-500 hover:text-slate-800 transition ${
              isFullscreen ? 'text-slate-300 hover:text-white' : ''
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Fullscreen Mode'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Top HUD / Inspection Bar ── */}
      {activeCandle && (
        <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 border-b px-4 py-2 text-xs font-mono ${
          isFullscreen ? 'border-slate-800 bg-slate-950/80 text-slate-300' : 'border-slate-100 bg-slate-50/60 text-slate-700'
        }`}>
          <div>
            <span className="text-slate-400">Date:</span>{' '}
            <span className="font-semibold">{formatDate(activeCandle.date)}</span>
          </div>
          <div>
            <span className="text-slate-400">O:</span>{' '}
            <span className="font-semibold">{formatINR(activeCandle.open)}</span>
          </div>
          <div>
            <span className="text-slate-400">H:</span>{' '}
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatINR(activeCandle.high)}</span>
          </div>
          <div>
            <span className="text-slate-400">L:</span>{' '}
            <span className="font-semibold text-rose-600 dark:text-rose-400">{formatINR(activeCandle.low)}</span>
          </div>
          <div>
            <span className="text-slate-400">C:</span>{' '}
            <span className="font-semibold">{formatINR(activeCandle.close)}</span>
          </div>
          {activeCandle.volume && (
            <div>
              <span className="text-slate-400">Vol:</span>{' '}
              <span className="font-semibold">{formatVolume(activeCandle.volume)}</span>
            </div>
          )}

          {/* Hover Indicator Values Readout */}
          {hoveredIndex !== null && (
            <div className="flex items-center space-x-3 text-[11px] font-sans ml-auto">
              {indicators.sma20 && indicatorSeries.sma20[hoveredIndex] && (
                <span className="text-amber-600 font-medium">SMA20: {formatINR(indicatorSeries.sma20[hoveredIndex])}</span>
              )}
              {indicators.rsi && indicatorSeries.rsi[hoveredIndex] && (
                <span className="text-purple-600 font-medium">RSI: {indicatorSeries.rsi[hoveredIndex].toFixed(1)}</span>
              )}
              {indicators.macd && indicatorSeries.macd[hoveredIndex]?.macd !== null && (
                <span className="text-cyan-600 font-medium">
                  MACD: {indicatorSeries.macd[hoveredIndex]?.macd?.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Main SVG Chart Canvas ── */}
      <svg
        width={width}
        height={totalSvgHeight}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="block select-none cursor-crosshair"
      >
        <defs>
          <clipPath id="mainChartClip">
            <rect x={padding.left} y={padding.top} width={innerWidth} height={innerHeight} />
          </clipPath>
        </defs>

        {/* ── Horizontal Grid Lines & Y-Axis Labels ── */}
        {gridPrices.map((p, idx) => {
          const y = getY(p);
          return (
            <g key={`grid-${idx}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={isFullscreen ? '#1e293b' : '#f1f5f9'}
                strokeWidth={1}
              />
              <text
                x={width - padding.right + 8}
                y={y + 3.5}
                fill={isFullscreen ? '#64748b' : '#94a3b8'}
                fontSize={10}
                fontFamily="system-ui, sans-serif"
              >
                ₹{p >= 1000 ? Math.round(p).toLocaleString('en-IN') : p.toFixed(2)}
              </text>
            </g>
          );
        })}

        {/* ── Bollinger Bands Shaded Area & Lines ── */}
        {indicators.bollinger && bollingerPolygonPoints && (
          <g clipPath="url(#mainChartClip)">
            <polygon
              points={bollingerPolygonPoints}
              fill="rgba(99, 102, 241, 0.08)"
            />
            <polyline
              points={buildPolylinePoints(indicatorSeries.bollinger.map((b) => b?.upper))}
              fill="none"
              stroke="#818cf8"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
            <polyline
              points={buildPolylinePoints(indicatorSeries.bollinger.map((b) => b?.middle))}
              fill="none"
              stroke="#6366f1"
              strokeWidth={1}
            />
            <polyline
              points={buildPolylinePoints(indicatorSeries.bollinger.map((b) => b?.lower))}
              fill="none"
              stroke="#818cf8"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          </g>
        )}

        {/* ── Volume Bars ── */}
        <g clipPath="url(#mainChartClip)" opacity={0.65}>
          {chartData.map((d, i) => {
            const isBull = Number(d.close) >= Number(d.open);
            const x = padding.left + i * candleSlotWidth + (candleSlotWidth - candleBodyWidth) / 2;
            const y = getVolY(d.volume || 0);
            const barHeight = Math.max(1, padding.top + innerHeight - y);
            return (
              <rect
                key={`vol-${i}`}
                x={x}
                y={y}
                width={candleBodyWidth}
                height={barHeight}
                fill={isBull ? '#10b981' : '#f43f5e'}
                opacity={0.35}
              />
            );
          })}
          {/* Volume MA 20 Line */}
          {indicators.volumeMa && volumeMaPoints && (
            <polyline
              points={volumeMaPoints}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.2}
              strokeDasharray="3 2"
            />
          )}
        </g>

        {/* ── Candlesticks (Wicks & Bodies) ── */}
        <g clipPath="url(#mainChartClip)">
          {chartData.map((d, i) => {
            const o = Number(d.open);
            const h = Number(d.high);
            const l = Number(d.low);
            const c = Number(d.close);
            const isBull = c >= o;
            const color = isBull ? '#10b981' : '#ef4444';

            const cx = getX(i);
            const topWickY = getY(h);
            const bottomWickY = getY(l);

            const bodyTopPrice = Math.max(o, c);
            const bodyBottomPrice = Math.min(o, c);
            const bodyTopY = getY(bodyTopPrice);
            const bodyBottomY = getY(bodyBottomPrice);
            const bodyHeight = Math.max(1.5, bodyBottomY - bodyTopY);
            const bx = cx - candleBodyWidth / 2;

            const isHovered = hoveredIndex === i;

            return (
              <g key={`candle-${i}`}>
                {/* High-Low Wick */}
                <line
                  x1={cx}
                  y1={topWickY}
                  x2={cx}
                  y2={bottomWickY}
                  stroke={color}
                  strokeWidth={isHovered ? 2 : 1.2}
                />
                {/* Candle Body */}
                <rect
                  x={bx}
                  y={bodyTopY}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={isBull ? '#10b981' : '#ef4444'}
                  stroke={color}
                  strokeWidth={isHovered ? 1.5 : 0.8}
                  rx={0.5}
                />
              </g>
            );
          })}
        </g>

        {/* ── Overlay Indicator Polylines ── */}
        <g clipPath="url(#mainChartClip)">
          {indicators.sma20 && (
            <polyline
              points={buildPolylinePoints(indicatorSeries.sma20)}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={1.5}
            />
          )}
          {indicators.sma50 && (
            <polyline
              points={buildPolylinePoints(indicatorSeries.sma50)}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
            />
          )}
          {indicators.sma200 && (
            <polyline
              points={buildPolylinePoints(indicatorSeries.sma200)}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth={1.8}
            />
          )}
          {indicators.ema9 && (
            <polyline
              points={buildPolylinePoints(indicatorSeries.ema9)}
              fill="none"
              stroke="#06b6d4"
              strokeWidth={1.5}
            />
          )}
        </g>

        {/* ── Date Axis Ticks ── */}
        {chartData.length > 0 && (
          <g>
            {[0, Math.floor(n * 0.25), Math.floor(n * 0.5), Math.floor(n * 0.75), n - 1].map((idx) => {
              const d = chartData[idx];
              if (!d) return null;
              const x = getX(idx);
              return (
                <text
                  key={`date-tick-${idx}`}
                  x={x}
                  y={mainChartHeight - 6}
                  fill={isFullscreen ? '#64748b' : '#94a3b8'}
                  fontSize={10}
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  {formatDate(d.date)}
                </text>
              );
            })}
          </g>
        )}

        {/* ── RSI Sub-Chart (when enabled) ── */}
        {showRsi && (
          <g transform={`translate(0, ${mainChartHeight + 8})`}>
            {/* Header / Axis */}
            <rect
              x={padding.left}
              y={0}
              width={innerWidth}
              height={subChartHeight}
              fill={isFullscreen ? '#090d16' : '#f8fafc'}
              stroke={isFullscreen ? '#1e293b' : '#e2e8f0'}
              strokeWidth={1}
              rx={4}
            />
            {/* 70 Overbought & 30 Oversold Lines */}
            <line
              x1={padding.left}
              y1={subChartHeight * 0.3}
              x2={width - padding.right}
              y2={subChartHeight * 0.3}
              stroke="#ef4444"
              strokeDasharray="2 2"
              strokeWidth={0.8}
            />
            <text x={width - padding.right + 6} y={subChartHeight * 0.3 + 3} fill="#ef4444" fontSize={9}>
              70
            </text>

            <line
              x1={padding.left}
              y1={subChartHeight * 0.5}
              x2={width - padding.right}
              y2={subChartHeight * 0.5}
              stroke={isFullscreen ? '#334155' : '#cbd5e1'}
              strokeDasharray="2 2"
              strokeWidth={0.8}
            />

            <line
              x1={padding.left}
              y1={subChartHeight * 0.7}
              x2={width - padding.right}
              y2={subChartHeight * 0.7}
              stroke="#10b981"
              strokeDasharray="2 2"
              strokeWidth={0.8}
            />
            <text x={width - padding.right + 6} y={subChartHeight * 0.7 + 3} fill="#10b981" fontSize={9}>
              30
            </text>

            <text x={padding.left + 8} y={16} fill="#a855f7" fontSize={10} fontWeight="600">
              RSI (14)
            </text>

            {/* RSI Line */}
            {(() => {
              const rsiPoints = [];
              indicatorSeries.rsi.forEach((val, idx) => {
                if (val !== null && Number.isFinite(val)) {
                  const x = getX(idx);
                  const y = subChartHeight - (val / 100) * subChartHeight;
                  rsiPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                }
              });
              return (
                <polyline
                  points={rsiPoints.join(' ')}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth={1.5}
                />
              );
            })()}
          </g>
        )}

        {/* ── MACD Sub-Chart (when enabled) ── */}
        {showMacd && (
          <g transform={`translate(0, ${mainChartHeight + (showRsi ? subChartHeight + 16 : 0) + 8})`}>
            <rect
              x={padding.left}
              y={0}
              width={innerWidth}
              height={subChartHeight}
              fill={isFullscreen ? '#090d16' : '#f8fafc'}
              stroke={isFullscreen ? '#1e293b' : '#e2e8f0'}
              strokeWidth={1}
              rx={4}
            />
            <text x={padding.left + 8} y={16} fill="#06b6d4" fontSize={10} fontWeight="600">
              MACD (12, 26, 9)
            </text>

            {/* Zero line */}
            <line
              x1={padding.left}
              y1={subChartHeight / 2}
              x2={width - padding.right}
              y2={subChartHeight / 2}
              stroke={isFullscreen ? '#334155' : '#cbd5e1'}
              strokeWidth={0.8}
            />

            {/* MACD Histogram & Lines */}
            {(() => {
              const macdData = indicatorSeries.macd;
              let maxAbs = 1;
              macdData.forEach((m) => {
                if (m) {
                  if (m.macd && Math.abs(m.macd) > maxAbs) maxAbs = Math.abs(m.macd);
                  if (m.signal && Math.abs(m.signal) > maxAbs) maxAbs = Math.abs(m.signal);
                  if (m.histogram && Math.abs(m.histogram) > maxAbs) maxAbs = Math.abs(m.histogram);
                }
              });

              const macdPoints = [];
              const signalPoints = [];
              const half = subChartHeight / 2;

              return (
                <g>
                  {macdData.map((m, idx) => {
                    if (!m || m.histogram === null) return null;
                    const x = getX(idx) - candleBodyWidth / 2;
                    const h = (m.histogram / maxAbs) * (half * 0.85);
                    const isPos = h >= 0;
                    return (
                      <rect
                        key={`macd-hist-${idx}`}
                        x={x}
                        y={isPos ? half - h : half}
                        width={candleBodyWidth}
                        height={Math.max(1, Math.abs(h))}
                        fill={isPos ? '#10b981' : '#f43f5e'}
                        opacity={0.6}
                      />
                    );
                  })}
                  {macdData.forEach((m, idx) => {
                    if (m && m.macd !== null) {
                      const x = getX(idx);
                      const y = half - (m.macd / maxAbs) * (half * 0.85);
                      macdPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                    }
                    if (m && m.signal !== null) {
                      const x = getX(idx);
                      const y = half - (m.signal / maxAbs) * (half * 0.85);
                      signalPoints.push(`${x.toFixed(1)},${y.toFixed(1)}`);
                    }
                  })}
                  <polyline points={macdPoints.join(' ')} fill="none" stroke="#06b6d4" strokeWidth={1.4} />
                  <polyline points={signalPoints.join(' ')} fill="none" stroke="#f97316" strokeWidth={1.2} />
                </g>
              );
            })()}
          </g>
        )}

        {/* ── Crosshair HUD Cursor Overlays ── */}
        {cursorX !== null && cursorY !== null && (
          <g>
            {/* Vertical crosshair line through entire SVG */}
            <line
              x1={cursorX}
              y1={padding.top}
              x2={cursorX}
              y2={totalSvgHeight - padding.bottom}
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth={1}
            />

            {/* Horizontal crosshair line across main chart */}
            {cursorY <= mainChartHeight - padding.bottom && (
              <line
                x1={padding.left}
                y1={cursorY}
                x2={width - padding.right}
                y2={cursorY}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            {/* Right Price Tag on Axis */}
            {cursorPrice !== null && cursorY <= mainChartHeight - padding.bottom && (
              <g transform={`translate(${width - padding.right + 2}, ${cursorY - 10})`}>
                <rect x={0} y={0} width={62} height={20} rx={4} fill="#0f172a" />
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

            {/* Bottom Date Tag */}
            {hoveredIndex !== null && chartData[hoveredIndex] && (
              <g transform={`translate(${cursorX - 35}, ${mainChartHeight - padding.bottom + 4})`}>
                <rect x={0} y={0} width={70} height={18} rx={3} fill="#1e293b" />
                <text
                  x={35}
                  y={12.5}
                  fill="#ffffff"
                  fontSize={9}
                  fontWeight="500"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                >
                  {formatDate(chartData[hoveredIndex].date)}
                </text>
              </g>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}
