import { useCallback, useEffect, useRef, useState } from 'react';
import type { PriceTick } from '@/services/feed/types';
import { getClientProfile } from '@/services/suggestion/clientProfiles';
import { suggestMargin } from '@/services/suggestion/engine';
import { getMarketContext } from '@/services/suggestion/marketContext';
import type { MarginSuggestion } from '@/services/suggestion/types';
import type { DealEntry } from '@/state/stores/dealsStore';

// AI suggestion lifecycle (extracted from TicketPanel in FXSW-057 to keep that
// file under the 300-line limit). Computes once per PickedUp visit, snapshotting
// the tick at compute time (docs/09 §9); clears when SI leaves PickedUp and
// recomputes on re-entry. `recompute` drives the SuggestionPanel Recompute /
// vol-shift callbacks.
export function useSuggestionState(
  entry: DealEntry | undefined,
  liveTick: PriceTick | null,
): { suggestion: MarginSuggestion | null; recompute: () => void } {
  const [suggestion, setSuggestion] = useState<MarginSuggestion | null>(null);
  const computed = useRef(false);

  const recompute = useCallback((): void => {
    if (!entry || !liveTick) return;
    const profile = getClientProfile(entry.deal.clientName);
    const marketStatic = getMarketContext(entry.deal.pair);
    setSuggestion(
      suggestMargin({
        deal: {
          pair: entry.deal.pair,
          side: entry.deal.side,
          notional: entry.deal.notional,
          defaultMarginPips: entry.deal.defaultMarginPips,
          rejectionReasons: entry.rejectionReasons,
        },
        client: profile,
        market: {
          currentBid: liveTick.bid,
          currentAsk: liveTick.ask,
          ...marketStatic,
        },
      }),
    );
  }, [entry, liveTick]);

  useEffect(() => {
    if (!entry || entry.siState !== 'PickedUp') {
      setSuggestion(null);
      computed.current = false;
      return;
    }
    if (computed.current) return;
    if (!liveTick) return;
    computed.current = true;
    recompute();
  }, [entry, liveTick, recompute]);

  return { suggestion, recompute };
}
