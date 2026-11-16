import React from 'react';

/**
 * Renders authentic SVG logos for supported stockbrokers
 */
export default function BrokerLogo({ broker, size = 'md', className = '' }) {
  const norm = String(broker || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const dim = sizeClasses[size] || sizeClasses.md;

  if (norm.includes('groww')) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm font-black ${dim} ${className}`}>
        <svg viewBox="0 0 40 40" fill="none" className="w-3/5 h-3/5" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#00D09C" />
          <path d="M12 24L18 18L23 23L29 15" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M24 15H29V20" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }

  if (norm.includes('zerodha') || norm.includes('kite')) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-[#387ED1] text-white shadow-sm font-black ${dim} ${className}`}>
        <svg viewBox="0 0 40 40" fill="none" className="w-3/5 h-3/5" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#387ED1" />
          <polygon points="20,9 31,20 20,31 9,20" fill="white" />
          <polygon points="20,13 27,20 20,27 13,20" fill="#387ED1" />
        </svg>
      </div>
    );
  }

  if (norm.includes('angel')) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-white border border-rose-200 text-white shadow-sm ${dim} ${className}`}>
        <svg viewBox="0 0 40 40" fill="none" className="w-3/5 h-3/5" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="40" rx="8" fill="#FFF" />
          <path d="M10 28L20 10L30 28H23L20 21L17 28H10Z" fill="#E63946" />
          <circle cx="20" cy="24" r="2.5" fill="#1D3557" />
        </svg>
      </div>
    );
  }

  if (norm.includes('upstox')) {
    return (
      <div className={`flex items-center justify-center rounded-xl bg-[#7B2CBF] text-white shadow-sm font-black ${dim} ${className}`}>
        <svg viewBox="0 0 40 40" fill="none" className="w-3/5 h-3/5" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="20" r="18" fill="#7B2CBF" />
          <path d="M14 14V22C14 25.3137 16.6863 28 20 28C23.3137 28 26 25.3137 26 22V14" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="18" r="2" fill="#E0AAFF" />
        </svg>
      </div>
    );
  }

  // Fallback for generic or other brokers
  return (
    <div className={`flex items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm font-bold text-xs ${dim} ${className}`}>
      {broker ? broker.substring(0, 2).toUpperCase() : 'BR'}
    </div>
  );
}
