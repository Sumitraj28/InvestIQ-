/**
 * Indian Stock Market Hours & Holiday Engine (NSE / BSE)
 *
 * Operating Schedule (Indian Standard Time - UTC+5:30):
 * - Pre-Open Session: 09:00 - 09:15 IST (Order entry: 09:00-09:08, Price discovery: 09:08-09:15)
 * - Normal Trading:   09:15 - 15:30 IST (Monday through Friday)
 * - Post-Close:       15:40 - 16:00 IST
 * - Closed:           16:00 - 09:00 IST next day, Weekends (Saturday/Sunday), & Public Holidays
 */

// Major NSE/BSE Trading Holidays for 2026 (YYYY-MM-DD format)
const NSE_HOLIDAYS_2026 = new Set([
  '2026-01-26', // Republic Day
  '2026-03-03', // Holi
  '2026-03-21', // Id-ul-Fitr (Ramadan Eid)
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-05-27', // Bakri Id / Eid ul-Adha
  '2026-06-26', // Muharram
  '2026-08-15', // Independence Day
  '2026-09-04', // Milad-un-Nabi
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-08', // Diwali Laxmi Pujan (Muhurat Trading only)
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Guru Nanak Jayanti
  '2026-12-25', // Christmas
]);

/**
 * Returns current IST time representation
 */
function getISTDate(date = new Date()) {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
  const istOffsetMs = 5.5 * 3600 * 1000;
  return new Date(utcMs + istOffsetMs);
}

/**
 * Evaluate current Indian Market Session State
 */
function getMarketStatus(date = new Date()) {
  const ist = getISTDate(date);
  const dayOfWeek = ist.getDay(); // 0 = Sunday, 6 = Saturday
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = NSE_HOLIDAYS_2026.has(dateStr);

  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Time boundaries in minutes from midnight IST:
  // 09:00 = 540
  // 09:15 = 555
  // 15:30 = 930
  // 16:00 = 960
  const PRE_OPEN_START = 540;
  const TRADING_START = 555;
  const TRADING_END = 930;
  const POST_CLOSE_END = 960;

  if (isWeekend || isHoliday) {
    const statusType = isWeekend ? 'WEEKEND_CLOSED' : 'HOLIDAY_CLOSED';
    const reasonText = isWeekend ? 'Weekend (Market Closed)' : 'National Trading Holiday (Republic Day / NSE Holiday)';
    return {
      session: 'CLOSED',
      status: statusType,
      isTrading: false,
      isMarketOpen: false,
      reason: reasonText,
      sessionDescription: reasonText,
      istTime: ist.toLocaleTimeString('en-IN', { hour12: true }),
      istDate: dateStr,
      nextSession: 'Opens next business day at 09:15 AM IST',
    };
  }

  if (timeInMinutes >= TRADING_START && timeInMinutes <= TRADING_END) {
    return {
      session: 'OPEN',
      status: 'OPEN',
      isTrading: true,
      isMarketOpen: true,
      reason: 'Regular Market Trading Session',
      sessionDescription: 'Regular Market Trading Session',
      istTime: ist.toLocaleTimeString('en-IN', { hour12: true }),
      istDate: dateStr,
      nextSession: 'Closes at 03:30 PM IST',
    };
  }

  if (timeInMinutes >= PRE_OPEN_START && timeInMinutes < TRADING_START) {
    return {
      session: 'PRE_OPEN',
      status: 'PRE_OPEN',
      isTrading: false,
      isMarketOpen: false,
      reason: 'Pre-Open Price Discovery Session',
      sessionDescription: 'Pre-Open Price Discovery Session',
      istTime: ist.toLocaleTimeString('en-IN', { hour12: true }),
      istDate: dateStr,
      nextSession: 'Normal trading begins at 09:15 AM IST',
    };
  }

  if (timeInMinutes > TRADING_END && timeInMinutes <= POST_CLOSE_END) {
    return {
      session: 'POST_CLOSE',
      status: 'POST_CLOSE',
      isTrading: false,
      isMarketOpen: false,
      reason: 'Post-Market Settlement Session',
      sessionDescription: 'Post-Market Settlement Session',
      istTime: ist.toLocaleTimeString('en-IN', { hour12: true }),
      istDate: dateStr,
      nextSession: 'Opens next business day at 09:15 AM IST',
    };
  }

  const closedDesc = timeInMinutes < PRE_OPEN_START ? 'Pre-Market Hours' : 'After-Hours (Market Closed)';
  return {
    session: 'CLOSED',
    status: 'CLOSED',
    isTrading: false,
    isMarketOpen: false,
    reason: closedDesc,
    sessionDescription: closedDesc,
    istTime: ist.toLocaleTimeString('en-IN', { hour12: true }),
    istDate: dateStr,
    nextSession: timeInMinutes < PRE_OPEN_START ? 'Opens today at 09:15 AM IST' : 'Opens tomorrow at 09:15 AM IST',
  };
}

function isMarketOpen(date = new Date()) {
  return getMarketStatus(date).isTrading;
}

module.exports = {
  getMarketStatus,
  isMarketOpen,
  getISTDate,
  NSE_HOLIDAYS_2026,
};
