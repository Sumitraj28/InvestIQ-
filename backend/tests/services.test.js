const { normalizeTicker, toYFinanceTicker, isValidTicker } = require('../utils/normalizeTicker');
const { safeNumber, safeInt, safeFloat } = require('../utils/safeNumber');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

describe('Utility Functions', () => {
  describe('normalizeTicker', () => {
    test('normalizes RELIANCE.NS to RELIANCE', () => {
      expect(normalizeTicker('RELIANCE.NS')).toBe('RELIANCE');
    });

    test('normalizes reliance to RELIANCE', () => {
      expect(normalizeTicker('reliance')).toBe('RELIANCE');
    });

    test('normalizes RELIANCE to RELIANCE', () => {
      expect(normalizeTicker('RELIANCE')).toBe('RELIANCE');
    });

    test('returns empty string for invalid input', () => {
      expect(normalizeTicker('')).toBe('');
      expect(normalizeTicker(null)).toBe('');
      expect(normalizeTicker(undefined)).toBe('');
    });

    test('handles .BO suffix', () => {
      expect(normalizeTicker('TCS.BO')).toBe('TCS');
    });
  });

  describe('toYFinanceTicker', () => {
    test('converts RELIANCE to RELIANCE.NS', () => {
      expect(toYFinanceTicker('RELIANCE')).toBe('RELIANCE.NS');
    });

    test('preserves RELIANCE.NS', () => {
      expect(toYFinanceTicker('RELIANCE.NS')).toBe('RELIANCE.NS');
    });
  });

  describe('isValidTicker', () => {
    test('validates correct tickers', () => {
      expect(isValidTicker('RELIANCE')).toBe(true);
      expect(isValidTicker('RELIANCE.NS')).toBe(true);
      expect(isValidTicker('M&M')).toBe(true);
      expect(isValidTicker('L&T')).toBe(true);
    });

    test('rejects invalid tickers', () => {
      expect(isValidTicker('')).toBe(false);
      expect(isValidTicker(null)).toBe(false);
      expect(isValidTicker('INVALID!')).toBe(false);
      expect(isValidTicker('SCRIPT<ALERT>')).toBe(false);
    });
  });

  describe('safeNumber', () => {
    test('returns number for valid input', () => {
      expect(safeNumber(123)).toBe(123);
      expect(safeNumber('123.45')).toBe(123.45);
      expect(safeNumber(0)).toBe(0);
    });

    test('returns default for invalid input', () => {
      expect(safeNumber(null, 10)).toBe(10);
      expect(safeNumber(undefined, 10)).toBe(10);
      expect(safeNumber('abc', 10)).toBe(10);
      expect(safeNumber(NaN, 10)).toBe(10);
    });
  });

  describe('safeInt', () => {
    test('returns integer', () => {
      expect(safeInt(123.9)).toBe(123);
      expect(safeInt('456')).toBe(456);
    });

    test('returns default for invalid', () => {
      expect(safeInt(null, 10)).toBe(10);
      expect(safeInt('abc', 10)).toBe(10);
    });
  });

  describe('safeFloat', () => {
    test('returns float with 2 decimals', () => {
      expect(safeFloat(123.456)).toBe(123.46);
      expect(safeFloat('789.12')).toBe(789.12);
    });
  });

  describe('response utilities', () => {
    test('successResponse creates correct structure', () => {
      const res = successResponse({ test: 'data' }, { cached: true });
      expect(res.success).toBe(true);
      expect(res.data).toEqual({ test: 'data' });
      expect(res.meta.cached).toBe(true);
      expect(res.meta.timestamp).toBeDefined();
    });

    test('errorResponse creates correct structure', () => {
      const res = errorResponse('Test error', 'TEST_ERROR', 400, 'req-123');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Test error');
      expect(res.code).toBe('TEST_ERROR');
      expect(res.status).toBe(400);
      expect(res.requestId).toBe('req-123');
    });

    test('paginatedResponse creates correct structure', () => {
      const res = paginatedResponse([1, 2, 3], { page: 1, total: 3 });
      expect(res.success).toBe(true);
      expect(res.data).toEqual([1, 2, 3]);
      expect(res.pagination.page).toBe(1);
    });
  });
});