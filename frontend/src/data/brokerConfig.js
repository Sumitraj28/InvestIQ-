/**
 * Broker Configuration and Verified Redirection Logic
 * Supports Groww, Zerodha Kite, Angel One, and Upstox.
 * Complies with strict security: verified URLs only, no fake trading URLs, no exposed tokens.
 */

export const KNOWN_GROWW_SLUGS = {
  RELIANCE: 'reliance-industries-ltd',
  TCS: 'tata-consultancy-services-ltd',
  INFY: 'infosys-ltd',
  HDFCBANK: 'hdfc-bank-ltd',
  ICICIBANK: 'icici-bank-ltd',
  SBIN: 'state-bank-of-india',
  ITC: 'itc-ltd',
  BHARTIARTL: 'bharti-airtel-ltd',
  LT: 'larsen-toubro-ltd',
  KOTAKBANK: 'kotak-mahindra-bank-ltd',
  AXISBANK: 'axis-bank-ltd',
  WIPRO: 'wipro-ltd',
  MARUTI: 'maruti-suzuki-india-ltd',
  BAJFINANCE: 'bajaj-finance-ltd',
  TATAMOTORS: 'tata-motors-ltd',
  TATASTEEL: 'tata-steel-ltd',
  TATAPOWER: 'tata-power-company-ltd',
  SUNPHARMA: 'sun-pharmaceutical-industries-ltd',
  CIPLA: 'cipla-ltd',
  ASIANPAINT: 'asian-paints-ltd',
  HCLTECH: 'hcl-technologies-ltd',
  TITAN: 'titan-company-ltd',
  NTPC: 'ntpc-ltd',
  POWERGRID: 'power-grid-corporation-of-india-ltd',
  GAIL: 'gail-india-ltd',
};

export const BROKER_OPTIONS = [
  {
    id: 'groww',
    name: 'Groww',
    displayName: 'Groww',
    tagline: 'Zero commission Mutual Funds & flat ₹20 on Equity intraday',
    description: 'Modern, beginner-friendly investing platform with clean UX, zero annual maintenance charges, and instant UPI order placement.',
    bestFor: 'Beginners & Long-term Investors',
    badge: 'Popular',
    pricing: '₹0 Delivery · ₹20 Intraday',
    features: [
      'Zero Account Opening & AMC',
      'Direct Mutual Funds & Stocks in one place',
      'Fast UPI deposits and instant withdrawals',
      'Real-time P&L and market reports',
    ],
    accentColor: '#00D09C',
    themeBg: 'bg-emerald-50 hover:bg-emerald-100/60 border-emerald-200',
    btnBg: 'bg-[#00D09C] hover:bg-[#00B888] text-white',
    officialUrl: 'https://groww.in/stocks',
    getStockUrl: (symbol) => {
      const clean = String(symbol || '').replace(/\.(NS|BO)$/i, '').trim().toUpperCase();
      const slug = KNOWN_GROWW_SLUGS[clean];
      if (slug) {
        return `https://groww.in/stocks/${slug}`;
      }
      return clean ? `https://groww.in/search?q=${encodeURIComponent(clean)}` : 'https://groww.in/stocks';
    },
  },
  {
    id: 'zerodha',
    name: 'Zerodha Kite',
    displayName: 'Zerodha Kite',
    tagline: "India's pioneer discount broker. Zero brokerage on Equity delivery",
    description: 'Ultra-fast flagship trading platform by Zerodha with TradingView and ChartIQ charts, advanced market depth, and Console analytics.',
    bestFor: 'Active Traders & Long-term Investors',
    badge: 'Trader Choice',
    pricing: '₹0 Delivery · ₹20 or 0.03% F&O',
    features: [
      'Zero brokerage on Equity Delivery and Direct MF',
      'Advanced TradingView & ChartIQ charting tools',
      'GTT (Good Till Triggered) long-term orders',
      'Sleek, distraction-free Kite Web and Mobile',
    ],
    accentColor: '#387ED1',
    themeBg: 'bg-blue-50 hover:bg-blue-100/60 border-blue-200',
    btnBg: 'bg-[#387ED1] hover:bg-[#2F6DB8] text-white',
    officialUrl: 'https://kite.zerodha.com',
    getStockUrl: (symbol) => {
      // Zerodha Kite terminal web link
      return 'https://kite.zerodha.com';
    },
  },
  {
    id: 'angelone',
    name: 'Angel One',
    displayName: 'Angel One',
    tagline: 'Full-service advisory with discount brokerage pricing',
    description: 'Comprehensive wealth creation platform offering personalized ARQ Prime advisory, SmartAPI algorithmic tools, and instant trade execution.',
    bestFor: 'Advisory & Smart Investing',
    badge: 'Advisory Backed',
    pricing: '₹0 Delivery for 30 days · ₹20/order',
    features: [
      'ARQ Prime rule-based stock recommendations',
      'SmartAPI for custom algorithmic trading',
      'Margin Trading Facility (MTF) with high leverage',
      'Lifetime free Demat account with zero AMC for 1st year',
    ],
    accentColor: '#E63946',
    themeBg: 'bg-rose-50 hover:bg-rose-100/60 border-rose-200',
    btnBg: 'bg-[#E63946] hover:bg-[#D32836] text-white',
    officialUrl: 'https://trade.angelone.in',
    getStockUrl: (symbol) => {
      const clean = String(symbol || '').replace(/\.(NS|BO)$/i, '').trim().toLowerCase();
      if (clean) {
        return `https://www.angelone.in/stocks/${clean}`;
      }
      return 'https://trade.angelone.in';
    },
  },
  {
    id: 'upstox',
    name: 'Upstox',
    displayName: 'Upstox Pro',
    tagline: 'Backed by Ratan Tata. Professional trading made intuitive',
    description: 'High-performance trading suite equipped with advanced Option Chains, TradingView integration, custom price alerts, and margin trading.',
    bestFor: 'F&O Traders & Technical Analysts',
    badge: 'Fast & Secure',
    pricing: '₹0 Mutual Funds · ₹20 Intraday & F&O',
    features: [
      'Upstox Pro TradingView integration with 100+ indicators',
      'Option Chain with Greeks & Max Pain analysis',
      'Zero maintenance Demat account',
      'Instant UPI fund withdrawal within seconds',
    ],
    accentColor: '#7B2CBF',
    themeBg: 'bg-purple-50 hover:bg-purple-100/60 border-purple-200',
    btnBg: 'bg-[#7B2CBF] hover:bg-[#6823A4] text-white',
    officialUrl: 'https://pro.upstox.com',
    getStockUrl: (symbol) => {
      const clean = String(symbol || '').replace(/\.(NS|BO)$/i, '').trim().toLowerCase();
      if (clean) {
        return `https://upstox.com/stocks/${clean}-share-price/`;
      }
      return 'https://pro.upstox.com';
    },
  },
];
