import type { Tenor } from '@/types/deal';
import type { Factor, SuggestionInput } from './types';

// Forward-points margin suggestion (v3, FXSW-058). Kept separate from the spot
// rule chain in engine.ts so that chain (and its tests) stay untouched. The
// forward-points margin widens with tenor and with thin liquidity; it is a
// distinct component from the spot margin, applied to the forward points only.

const TENOR_YEARS: Record<Tenor, number> = {
  SPOT: 0,
  '1W': 1 / 52,
  '2W': 2 / 52,
  '1M': 1 / 12,
  '2M': 2 / 12,
  '3M': 0.25,
  '6M': 0.5,
  '9M': 0.75,
  '1Y': 1,
};

export function suggestForwardPointsMargin(
  tenor: Tenor,
  input: SuggestionInput,
): { pips: number; factor: Factor } {
  const years = TENOR_YEARS[tenor] ?? 0;
  let p = 0.5 + years * 2; // 1Y ≈ 2.5 pips before rounding
  if (input.market.sessionLiquidity === 'thin') p += 0.5;
  const pips = Math.max(1, Math.round(p));
  return {
    pips,
    factor: {
      name: 'Forward tenor',
      delta: pips,
      note: `${tenor} forward — points premium`,
    },
  };
}
