import React, { useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, Layers, PieChart as PieIcon, Shield } from 'lucide-react';
import { formatINR } from '../services/portfolioAnalytics';

const PALETTE = [
  '#0B3D2C',
  '#00D09C',
  '#387ED1',
  '#E63946',
  '#7B2CBF',
  '#F59E0B',
  '#10B981',
  '#6366F1',
  '#EC4899',
  '#64748B',
];

const BROKER_COLORS = {
  Groww: '#00D09C',
  'Zerodha Kite': '#387ED1',
  'Angel One': '#E63946',
  Upstox: '#7B2CBF',
  Other: '#64748B',
};

export default function PortfolioAllocationChart({
  enrichedHoldings = [],
  brokerAnalysis = [],
  sectorAllocation = [],
}) {
  const [allocationMode, setAllocationMode] = useState('company'); // 'company' | 'broker' | 'sector'

  if (!enrichedHoldings.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs text-center">
        <PieIcon className="mx-auto h-8 w-8 text-slate-300" />
        <h3 className="mt-2 text-sm font-bold text-slate-800">No Allocation Data</h3>
        <p className="mt-1 text-xs text-slate-500">Record investments to see your portfolio distribution.</p>
      </div>
    );
  }

  // Calculate Company Allocation Data
  const totalInvestedAll = enrichedHoldings.reduce((sum, h) => sum + (h.totalInvested || 0), 0);
  const companyData = enrichedHoldings.map((h, i) => {
    const val = h.currentValue || h.totalInvested || 0;
    const pct = totalInvestedAll > 0 ? ((h.totalInvested / totalInvestedAll) * 100).toFixed(1) : 0;
    return {
      name: h.stockSymbol,
      fullName: h.companyName,
      value: val,
      invested: h.totalInvested,
      percent: Number(pct),
      color: PALETTE[i % PALETTE.length],
    };
  });

  // Broker Data
  const brokerData = brokerAnalysis.map((b) => ({
    name: b.brokerName,
    value: b.totalInvested,
    currentValue: b.currentValue,
    color: BROKER_COLORS[b.brokerName] || '#64748B',
  }));

  // Sector Data
  const sectorData = sectorAllocation.map((s, i) => ({
    name: s.sectorName,
    value: s.totalInvested,
    percent: s.portfolioPercent,
    color: PALETTE[(i + 3) % PALETTE.length],
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
      {/* Header & View Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-emerald-700" />
              Portfolio Allocation Analysis
            </h3>
            <p className="text-xs text-slate-500">
              Distribution of capital across companies, brokers, and sectors
            </p>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200 self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setAllocationMode('company')}
              className={`px-3 py-1 rounded-lg transition ${
                allocationMode === 'company'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Company
            </button>
            <button
              type="button"
              onClick={() => setAllocationMode('broker')}
              className={`px-3 py-1 rounded-lg transition ${
                allocationMode === 'broker'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Broker
            </button>
            <button
              type="button"
              onClick={() => setAllocationMode('sector')}
              className={`px-3 py-1 rounded-lg transition ${
                allocationMode === 'sector'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Sector
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-56 w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            {allocationMode === 'broker' ? (
              <BarChart data={brokerData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={(val) => `₹${Math.round(val / 1000)}k`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip
                  formatter={(val) => [formatINR(val), 'Capital Invested']}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {brokerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={allocationMode === 'company' ? companyData : sectorData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(allocationMode === 'company' ? companyData : sectorData).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, item) => [
                    `${formatINR(val)} (${item.payload.percent || 0}%)`,
                    allocationMode === 'company' ? item.payload.fullName || name : name,
                  ]}
                  contentStyle={{
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legend / Breakdown List */}
      <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 max-h-36 overflow-y-auto">
        {(allocationMode === 'company'
          ? companyData
          : allocationMode === 'broker'
          ? brokerData
          : sectorData
        ).map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-slate-800 truncate">{item.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-slate-900">{formatINR(item.value)}</span>
              {item.percent !== undefined && (
                <span className="text-slate-400 ml-1.5 font-medium">({item.percent}%)</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
