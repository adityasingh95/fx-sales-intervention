import type { Pair } from '@/services/feed/types';

const NBSP = ' ';

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export const formatTime = (epochMs: number): string => TIME_FMT.format(new Date(epochMs));

// "12,500,000 EUR" — base CCY is the first three letters of the pair.
const AMOUNT_FMT = new Intl.NumberFormat('en-US');

export const formatAmount = (notional: number, pair: Pair): string => {
  const base = pair.slice(0, 3);
  return `${AMOUNT_FMT.format(notional)}${NBSP}${base}`;
};

// Rounding to a pair's display precision (4dp for the dollar majors, 2dp
// for the JPY/INR pairs) — used by the Rate cell so consumers don't have
// to know each pair's pip position.
const PAIR_PRECISION: Record<Pair, number> = {
  EURUSD: 4,
  GBPUSD: 4,
  USDJPY: 2,
  USDINR: 2,
};

export const formatRate = (rate: number, pair: Pair): string =>
  rate.toFixed(PAIR_PRECISION[pair]);
