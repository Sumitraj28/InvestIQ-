const { computeSignal } = require('../services/signalEngine');

describe('Signal Engine', () => {
  const mockHistory = [
    { date: '2022-01-01', close: 100 },
    { date: '2022-02-01', close: 105 },
    { date: '2023-01-01', close: 120 },
    { date: '2023-06-01', close: 130 },
    { date: '2024-01-01', close: 140 },
    { date: '2024-06-01', close: 150 },
  ];

  const baseStock = {
    history5y: mockHistory,
    lastPrice: 150,
    peRatio: 20,
    sector: 'information technology',
    industry: 'it services',
  };

  test('computeSignal returns valid signal object', () => {
    const signal = computeSignal(baseStock);
    expect(signal).toHaveProperty('verdict');
    expect(signal).toHaveProperty('score');
    expect(signal).toHaveProperty('metrics');
    expect(signal).toHaveProperty('reasoning');
    expect(signal).toHaveProperty('disclaimer');
  });

  test('verdict is one of BUY, HOLD, AVOID', () => {
    const signal = computeSignal(baseStock);
    expect(['BUY', 'HOLD', 'AVOID']).toContain(signal.verdict);
  });

  test('score is between 0 and 1', () => {
    const signal = computeSignal(baseStock);
    expect(signal.score).toBeGreaterThanOrEqual(0);
    expect(signal.score).toBeLessThanOrEqual(1);
  });

  test('handles insufficient history gracefully', () => {
    const signal = computeSignal({ ...baseStock, history5y: [] });
    expect(signal.verdict).toBeDefined();
    expect(signal.metrics.sma50).toBeNull();
    expect(signal.metrics.sma200).toBeNull();
  });

  test('handles missing price gracefully', () => {
    const signal = computeSignal({ ...baseStock, lastPrice: null });
    expect(signal.verdict).toBeDefined();
  });

  test('handles missing PE ratio', () => {
    const signal = computeSignal({ ...baseStock, peRatio: 0 });
    expect(signal.metrics.peRatio).toBe(0);
    expect(signal.metrics.valuationFlag).toBe('NEUTRAL');
  });

  test('calculates SMA correctly', () => {
    const stock = {
      history5y: [
        { date: '2023-01-01', close: 100 },
        { date: '2023-02-01', close: 110 },
        { date: '2023-03-01', close: 120 },
        { date: '2023-04-01', close: 130 },
        { date: '2023-05-01', close: 140 },
        { date: '2023-06-01', close: 150 },
      ],
      lastPrice: 150,
    };
    const signal = computeSignal(stock);
    expect(signal.metrics.sma50).toBeNull();
    expect(signal.metrics.sma200).toBeNull();
  });

  test('RSI calculation works', () => {
    const stock = {
      history5y: Array.from({ length: 20 }, (_, i) => ({
        date: new Date(2023, 0, i + 1).toISOString(),
        close: 100 + i * 2,
      })),
      lastPrice: 138,
    };
    const signal = computeSignal(stock);
    expect(signal.metrics.rsi14).not.toBeNull();
    expect(signal.metrics.rsi14).toBeGreaterThan(0);
    expect(signal.metrics.rsi14).toBeLessThanOrEqual(100);
  });
});