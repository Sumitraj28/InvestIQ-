import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cleanTickerSymbol, getLogoUrls } from '../data/companyLogos';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
};

export default function CompanyLogo({
  ticker,
  name = '',
  website = '',
  size = 'md',
  className = '',
}) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const logoUrls = getLogoUrls(ticker, website);
  const logoUrl = logoUrls[sourceIndex];
  const cleanTicker = cleanTickerSymbol(ticker);
  const initials = cleanTicker.slice(0, 2) || name.slice(0, 2).toUpperCase();
  const boxSize = sizeClasses[size] || sizeClasses.md;
  const hasLogo = Boolean(logoUrl);

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white font-bold text-slate-700 shadow-sm ${boxSize} ${className}`}
      aria-label={`${name || cleanTicker || 'Company'} logo`}
    >
      {hasLogo ? (
        <img
          src={logoUrl}
          alt=""
          className="h-full w-full object-contain p-1.5"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setSourceIndex((current) => current + 1)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-slate-100">
          {initials || <Building2 className="h-4 w-4" />}
        </span>
      )}
    </span>
  );
}
