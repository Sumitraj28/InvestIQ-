const logoDomains = {
  RELIANCE: 'ril.com',
  TCS: 'tcs.com',
  INFY: 'infosys.com',
  HDFCBANK: 'hdfcbank.com',
  ICICIBANK: 'icicibank.com',
  SBIN: 'sbi.co.in',
  AXISBANK: 'axisbank.com',
  KOTAKBANK: 'kotak.com',
  ITC: 'itcportal.com',
  HINDUNILVR: 'hul.co.in',
  BHARTIARTL: 'airtel.in',
  LT: 'larsentoubro.com',
  MARUTI: 'marutisuzuki.com',
  'M&M': 'mahindra.com',
  TATAMOTORS: 'tatamotors.com',
  TATASTEEL: 'tatasteel.com',
  SUNPHARMA: 'sunpharma.com',
  CIPLA: 'cipla.com',
  ASIANPAINT: 'asianpaints.com',
  BAJFINANCE: 'bajajfinserv.in',
  HCLTECH: 'hcltech.com',
  WIPRO: 'wipro.com',
  ADANIENT: 'adanienterprises.com',
  NTPC: 'ntpc.co.in',
  POWERGRID: 'powergrid.in',
};

export function cleanTickerSymbol(ticker = '') {
  return String(ticker).toUpperCase().replace(/\.(NS|BO)$/i, '');
}

export function getLogoDomain(ticker = '', website = '') {
  if (website) {
    try {
      return new URL(website).hostname.replace(/^www\./, '');
    } catch {
      return website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
    }
  }

  return logoDomains[cleanTickerSymbol(ticker)] || '';
}

export function getLogoUrls(ticker = '', website = '') {
  const domain = getLogoDomain(ticker, website);
  if (!domain) return [];

  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    `https://logo.clearbit.com/${domain}`,
  ];
}

export function getLogoUrl(ticker = '', website = '') {
  return getLogoUrls(ticker, website)[0] || '';
}
