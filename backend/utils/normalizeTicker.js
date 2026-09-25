function normalizeTicker(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let clean = raw.trim().toUpperCase();

  if (clean.endsWith('.NS') || clean.endsWith('.BO')) {
    clean = clean.slice(0, -3);
  }

  return clean;
}

function toYFinanceTicker(raw) {
  const clean = normalizeTicker(raw);
  if (!clean) return '';
  return `${clean}.NS`;
}

function isValidTicker(raw) {
  if (!raw || typeof raw !== 'string') return false;
  const clean = normalizeTicker(raw);
  if (!clean) return false;
  return /^[A-Z0-9&.-]+$/.test(clean);
}

module.exports = {
  normalizeTicker,
  toYFinanceTicker,
  isValidTicker,
};