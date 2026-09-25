/**
 * Groww API Service
 * Fetches real-time quarterly & yearly financial performance (Revenue & Profit),
 * fundamentals, and shareholding pattern for Indian equity stocks.
 */

const config = require('../config/env');
const { withTimeout } = require('../utils/timeout');

const cache = new Map();
const CACHE_TTL_MS = config.cacheTtl.history || 60 * 60 * 1000;

function formatGrowth(current, previous) {
  if (!previous || previous === 0) return { percent: 0, isPositive: true, formatted: '+0.00%' };
  const diff = current - previous;
  const pct = (diff / Math.abs(previous)) * 100;
  const isPos = pct >= 0;
  return {
    percent: Number(pct.toFixed(2)),
    isPositive: isPos,
    formatted: `${isPos ? '+' : ''}${pct.toFixed(2)}%`,
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeouts.request);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Groww API request timed out after ${config.timeouts.request}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFromGroww(cleanSymbol) {
  const searchUrl = `https://groww.in/v1/api/search/v1/entity?app=false&entity_type=stocks&page=0&q=${encodeURIComponent(cleanSymbol)}&size=1`;
  const searchRes = await fetchWithTimeout(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!searchRes.ok) {
    throw new Error(`Groww search returned HTTP ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const searchId = searchData?.content?.[0]?.search_id;
  if (!searchId) {
    throw new Error(`Groww searchId not found for ${cleanSymbol}`);
  }

  const companyUrl = `https://groww.in/v1/api/stocks_data/v1/company/search_id/${searchId}`;
  const compRes = await fetchWithTimeout(companyUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
    },
  });

  if (!compRes.ok) {
    throw new Error(`Groww company API returned HTTP ${compRes.status}`);
  }

  const compData = await compRes.json();
  const stmts = compData?.financialStatement || [];

  const revObj = stmts.find((s) => s.title?.toLowerCase().includes('revenue'));
  const profObj = stmts.find((s) => s.title?.toLowerCase().includes('profit'));
  const netWorthObj = stmts.find((s) => s.title?.toLowerCase().includes('net worth'));

  const yearlyYears = Object.keys(revObj?.yearly || {}).sort();
  const yearlyList = yearlyYears.slice(-5).map((y) => {
    const rev = Number(revObj?.yearly?.[y] || 0);
    const prof = Number(profObj?.yearly?.[y] || 0);
    return {
      period: String(y),
      year: String(y),
      revenue: Math.round(rev),
      profit: Math.round(prof),
    };
  });

  const quarterlyQuarters = Object.keys(revObj?.quarterly || {});
  const quarterlyList = quarterlyQuarters.slice(-5).map((q) => {
    const rev = Number(revObj?.quarterly?.[q] || 0);
    const prof = Number(profObj?.quarterly?.[q] || 0);
    return {
      period: String(q),
      quarter: String(q),
      revenue: Math.round(rev),
      profit: Math.round(prof),
    };
  });

  const latestYear = yearlyList[yearlyList.length - 1];
  const prevYear = yearlyList.length > 1 ? yearlyList[yearlyList.length - 2] : null;
  const yearlyRevGrowth = formatGrowth(latestYear?.revenue || 0, prevYear?.revenue);
  const yearlyProfitGrowth = formatGrowth(latestYear?.profit || 0, prevYear?.profit);

  const latestQuarter = quarterlyList[quarterlyList.length - 1];
  const prevQuarter = quarterlyList.length > 1 ? quarterlyList[quarterlyList.length - 2] : null;
  const quarterlyRevGrowth = formatGrowth(latestQuarter?.revenue || 0, prevQuarter?.revenue);
  const quarterlyProfitGrowth = formatGrowth(latestQuarter?.profit || 0, prevQuarter?.profit);

  const fundamentalsRaw = compData?.fundamentals || [];
  const fundamentalsMap = {};
  fundamentalsRaw.forEach((f) => {
    if (f.name && f.value) {
      fundamentalsMap[f.name] = f.value;
    }
  });

  const shpRaw = compData?.shareHoldingPattern || {};
  const shpPeriods = Object.keys(shpRaw);
  let latestShp = null;
  if (shpPeriods.length > 0) {
    const latestPeriodKey = shpPeriods[0];
    const pData = shpRaw[latestPeriodKey];
    let promotersPct = 0;
    if (pData?.promoters) {
      const p = pData.promoters;
      promotersPct = (p.individual?.percent || 0) + (p.government?.percent || 0) + (p.corporation?.percent || 0);
    }
    const fiiPct = pData?.foreignInstitutions?.percent || 0;
    const diiPct = (pData?.mutualFunds?.percent || 0) + (pData?.otherDomesticInstitutions?.insurance?.percent || 0) + (pData?.otherDomesticInstitutions?.otherFirms?.percent || 0);
    const publicPct = pData?.retailAndOthers?.percent || 0;

    latestShp = {
      period: latestPeriodKey,
      promoters: Number(promotersPct.toFixed(2)),
      fii: Number(fiiPct.toFixed(2)),
      dii: Number(diiPct.toFixed(2)),
      public: Number(publicPct.toFixed(2)),
    };
  }

  return {
    source: 'groww',
    searchId,
    displayName: compData.header?.displayName,
    quarterly: quarterlyList,
    yearly: yearlyList,
    summary: {
      yearly: {
        latestPeriod: latestYear?.period || '',
        revenue: latestYear?.revenue || 0,
        revenueGrowth: yearlyRevGrowth,
        profit: latestYear?.profit || 0,
        profitGrowth: yearlyProfitGrowth,
      },
      quarterly: {
        latestPeriod: latestQuarter?.period || '',
        revenue: latestQuarter?.revenue || 0,
        revenueGrowth: quarterlyRevGrowth,
        profit: latestQuarter?.profit || 0,
        profitGrowth: quarterlyProfitGrowth,
      },
    },
    fundamentals: fundamentalsMap,
    shareholding: latestShp,
  };
}

async function getStockFinancials(ticker) {
  if (!ticker) throw new Error('Ticker is required');
  const clean = ticker.replace(/\.(NS|BO)$/i, '').trim().toUpperCase();

  const cached = cache.get(clean);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const data = await withTimeout(
      fetchFromGroww(clean),
      config.timeouts.request,
      'Groww API request timed out'
    );
    cache.set(clean, { data, timestamp: Date.now() });
    return data;
  } catch (err) {
    console.warn(`[Groww API] Fetch failed for ${clean}: ${err.message}`);
    if (cached) return cached.data;
    throw err;
  }
}

module.exports = {
  getStockFinancials,
};