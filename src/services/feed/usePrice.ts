import { useEffect, useState } from 'react';
import { pricingFeed } from './pricingFeed';
import type { Pair, PriceTick } from './types';

// Subscribes to the PricingFeed for a single pair. Per
// docs/06 §"Key points": price ticks go straight from the feed to the
// consumer's local React state — never through Zustand, because 300ms
// × 4 pairs would thrash store subscribers.
export const usePrice = (pair: Pair): PriceTick | null => {
  const [tick, setTick] = useState<PriceTick | null>(() => pricingFeed.getLatest(pair));
  useEffect(() => pricingFeed.subscribe(pair, setTick), [pair]);
  return tick;
};
