import { describe, expect, it } from 'vitest';
import { formatAmount, formatRate, formatTime } from './format';

describe('formatTime', () => {
  it('formats a Date as 24-hour HH:mm:ss', () => {
    // 2026-05-25T16:23:08Z — Date is timezone-dependent, so use a fixed
    // local time via Date constructor for stability across CI runners.
    const d = new Date(2026, 4, 25, 16, 23, 8);
    expect(formatTime(d.getTime())).toBe('16:23:08');
  });

  it('pads single-digit components', () => {
    const d = new Date(2026, 4, 25, 4, 5, 9);
    expect(formatTime(d.getTime())).toBe('04:05:09');
  });
});

describe('formatAmount', () => {
  it('formats with thousands separators and base CCY suffix', () => {
    expect(formatAmount(12_500_000, 'EURUSD')).toBe('12,500,000 EUR');
  });

  it('uses the first three letters of the pair as the base CCY', () => {
    expect(formatAmount(5_000_000, 'USDJPY')).toBe('5,000,000 USD');
    expect(formatAmount(3_000_000, 'USDINR')).toBe('3,000,000 USD');
  });
});

describe('formatRate', () => {
  it('uses 4dp for the dollar majors', () => {
    expect(formatRate(1.17152, 'EURUSD')).toBe('1.1715');
    expect(formatRate(1.351, 'GBPUSD')).toBe('1.3510');
  });

  it('uses 2dp for the JPY/INR pairs', () => {
    expect(formatRate(157.7723, 'USDJPY')).toBe('157.77');
    expect(formatRate(95.671, 'USDINR')).toBe('95.67');
  });
});
