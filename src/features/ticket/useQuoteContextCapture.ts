import { useEffect, useRef } from 'react';
import { useDealsStore, type DealEntry } from '@/state/stores/dealsStore';
import { isForwardTenor, type MarginPair } from '@/types/deal';
import type { AppliedMargin } from '@/types/lifecycle';
import type { MarkupMode } from './pricing/ForwardPointsPanel';

// Captures the markup reason when the trader sends a price (FXSW-060). The SI
// machine creates the PRICE_BACK lifecycle event on the QuoteSent transition;
// this merges in the applied margin / AI-suggested / rationale. Resets when the
// deal returns to PickedUp so a re-quote (after Withdraw) re-records. Extracted
// from TicketPanel to keep that file under the 300-line limit.
export function useQuoteContextCapture(
  entry: DealEntry | undefined,
  params: {
    marginPair: MarginPair;
    fwdMarginPair: MarginPair;
    markupMode: MarkupMode;
    aiApplied: boolean;
    appliedRationale: string | null;
    // FXSW-086: present only for SWAP deals — the effective net-points margin +
    // mode actually applied. Takes precedence over the spot/forward shape.
    swap?: { mode: 'PER_COMPONENT' | 'TOTAL'; net: MarginPair };
  },
): void {
  const recorded = useRef(false);
  const { marginPair, fwdMarginPair, markupMode, aiApplied, appliedRationale, swap } = params;

  useEffect(() => {
    if (!entry) return;
    const { deal, siState } = entry;
    if (siState === 'PickedUp') {
      recorded.current = false;
      return;
    }
    if (siState === 'QuoteSent' && !recorded.current) {
      recorded.current = true;
      const fwd = markupMode === 'all-in' ? { bid: 0, ask: 0 } : fwdMarginPair;
      const appliedMargin: AppliedMargin = swap
        ? { kind: 'swap', mode: swap.mode, net: swap.net }
        : isForwardTenor(deal.tenor)
          ? { kind: 'forward', spot: marginPair, fwd }
          : { kind: 'spot', margin: marginPair };
      useDealsStore.getState().recordQuoteContext(deal.dealId, {
        appliedMargin,
        aiSuggested: aiApplied,
        rationale: appliedRationale ?? undefined,
      });
    }
  }, [entry, marginPair, fwdMarginPair, markupMode, aiApplied, appliedRationale, swap]);
}
