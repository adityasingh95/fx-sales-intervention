import { type Pair } from './types';
import { forwardPointsFeed, type ForwardPointsPair } from './forwardPoints';
import type { Tenor } from '@/types/deal';

// Simulated swap-points feed (v4, FXSW-083). A pure composition of
// `forwardPointsFeed` (docs/04 §9.2): no new RNG draws, so the seed-42 spot
// stream and the forward mid sequence are untouched. The net differential is
// `far − near` per side, so a forward-forward swap (near = forward tenor) and an
// outright-vs-spot swap (near = SPOT, points {0,0,0}) both fall out of the same
// source. Far must be a later tenor than near; the caller enforces ordering —
// this feed does not reorder.

const round1 = (n: number): number => Math.round(n * 10) / 10;

export type SwapPoints = {
  near: ForwardPointsPair;
  far: ForwardPointsPair;
  net: { bid: number; ask: number };
};

export type SwapPointsFeed = {
  get: (pair: Pair, nearTenor: Tenor, farTenor: Tenor) => SwapPoints;
};

export const swapPointsFeed: SwapPointsFeed = {
  get(pair, nearTenor, farTenor) {
    const near = forwardPointsFeed.get(pair, nearTenor);
    const far = forwardPointsFeed.get(pair, farTenor);
    return {
      near,
      far,
      net: {
        bid: round1(far.bid - near.bid),
        ask: round1(far.ask - near.ask),
      },
    };
  },
};
