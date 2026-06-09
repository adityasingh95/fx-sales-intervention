import type { Pair } from '@/services/feed/types';
import type { DealtCcy } from '@/types/deal';

const NBSP = ' ';

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

export const formatTime = (epochMs: number): string => TIME_FMT.format(new Date(epochMs));

const AMOUNT_FMT = new Intl.NumberFormat('en-US');

// Returns the 3-letter currency code of the dealt leg of a pair.
// Base is the first three letters (e.g. EUR in EURUSD); quote is the
// last three (e.g. JPY in USDJPY).
export const dealtCcyCode = (pair: Pair, dealtCcy: DealtCcy = 'BASE'): string =>
  dealtCcy === 'BASE' ? pair.slice(0, 3) : pair.slice(3, 6);

// "12,500,000 EUR" — by default the base CCY of the pair. Pass
// `dealtCcy='QUOTE'` for quote-dealt notionals (e.g. "1,000,000,000 JPY").
export const formatAmount = (
  notional: number,
  pair: Pair,
  dealtCcy: DealtCcy = 'BASE',
): string =>
  `${AMOUNT_FMT.format(notional)}${NBSP}${dealtCcyCode(pair, dealtCcy)}`;

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
