import { describe, expect, it } from 'vitest';
import { addBusinessDays, formatSettlementDate } from './time';

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
