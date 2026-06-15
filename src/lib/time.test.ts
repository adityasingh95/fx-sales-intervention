import { describe, expect, it } from 'vitest';
import { addBusinessDays, formatSettlementDate, valueDateForTenor } from './time';

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('addBusinessDays', () => {
  it('Monday + 2 → Wednesday', () => {
    expect(addBusinessDays(d(2026, 5, 18), 2).getDay()).toBe(3);
    expect(addBusinessDays(d(2026, 5, 18), 2).getDate()).toBe(20);
  });

  it('Wednesday + 2 → Friday', () => {
    expect(addBusinessDays(d(2026, 5, 20), 2).getDay()).toBe(5);
    expect(addBusinessDays(d(2026, 5, 20), 2).getDate()).toBe(22);
  });

  it('Thursday + 2 → Monday (skips Sat + Sun)', () => {
    expect(addBusinessDays(d(2026, 5, 21), 2).getDay()).toBe(1);
    expect(addBusinessDays(d(2026, 5, 21), 2).getDate()).toBe(25);
  });

  it('Friday + 2 → Tuesday (skips Sat + Sun)', () => {
    expect(addBusinessDays(d(2026, 5, 22), 2).getDay()).toBe(2);
    expect(addBusinessDays(d(2026, 5, 22), 2).getDate()).toBe(26);
  });

  it('weekend trade date rolls forward to Monday before adding', () => {
    // Saturday May 23, 2026 → roll to Monday May 25 → +2 = Wednesday May 27.
    expect(addBusinessDays(d(2026, 5, 23), 2).getDate()).toBe(27);
    // Sunday May 24 → roll to Monday May 25 → +2 = Wednesday May 27.
    expect(addBusinessDays(d(2026, 5, 24), 2).getDate()).toBe(27);
  });
});

describe('formatSettlementDate', () => {
  it('formats as DD MMM YYYY', () => {
    expect(formatSettlementDate(d(2026, 5, 27))).toBe('27 May 2026');
  });
});

describe('valueDateForTenor', () => {
  // Trade Mon 25 May 2026 → spot (T+2) = Wed 27 May 2026.
  const trade = d(2026, 5, 25);

  it('SPOT returns the T+2 spot date', () => {
    expect(formatSettlementDate(valueDateForTenor(trade, 'SPOT'))).toBe('27 May 2026');
  });

  it('1W adds 7 calendar days to spot', () => {
    // 27 May + 7 = Wed 3 Jun 2026 (a business day).
    expect(formatSettlementDate(valueDateForTenor(trade, '1W'))).toBe('03 Jun 2026');
  });

  it('1M adds one month to spot', () => {
    // 27 May + 1 month = Mon 27 Jun? 27 Jun 2026 is a Saturday → roll to Mon 29.
    expect(formatSettlementDate(valueDateForTenor(trade, '1M'))).toBe('29 Jun 2026');
  });

  it('1Y adds twelve months to spot', () => {
    // 27 May 2027 is a Thursday — a business day.
    expect(formatSettlementDate(valueDateForTenor(trade, '1Y'))).toBe('27 May 2027');
  });

  it('forward value dates are strictly later than spot', () => {
    const spot = valueDateForTenor(trade, 'SPOT').getTime();
    for (const tenor of ['1W', '2W', '1M', '3M', '6M', '9M', '1Y'] as const) {
      expect(valueDateForTenor(trade, tenor).getTime()).toBeGreaterThan(spot);
    }
  });
});
