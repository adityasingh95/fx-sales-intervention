import { useEffect, useState } from 'react';
import { formatRate } from '@/lib/format';
import { pricingFeed } from '@/services/feed/pricingFeed';
import type { Pair, PriceTick } from '@/services/feed/types';

export interface RateCellProps {
  pair: Pair;
}

// Shows the latest mid from pricingFeed. FXSW-012 scope: display only.
// Trader-margin-adjusted rate lands once the Pricing Panel ships
// (FXSW-021). Until the pricingFeed has emitted a first tick (e.g. in
// jsdom tests where nobody started it), shows the em-dash placeholder
// per docs/05 §8.
export default function RateCell({ pair }: RateCellProps) {
  const [tick, setTick] = useState<PriceTick | null>(() => pricingFeed.getLatest(pair));
  useEffect(() => pricingFeed.subscribe(pair, setTick), [pair]);
  return (
    <span className="font-mono tabular-nums text-text">
      {tick ? formatRate(tick.mid, pair) : '—'}
    </span>
  );
}
