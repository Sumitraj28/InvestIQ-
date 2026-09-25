function safeNumber(value, defaultValue = null) {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function safeInt(value, defaultValue = null) {
  const num = safeNumber(value, defaultValue);
  if (num === null) return defaultValue;
  return Math.trunc(num);
}

function safeFloat(value, defaultValue = null) {
  const num = safeNumber(value, defaultValue);
  if (num === null) return defaultValue;
  return parseFloat(num.toFixed(2));
}

module.exports = {
  safeNumber,
  safeInt,
  safeFloat,
};