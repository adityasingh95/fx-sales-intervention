import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { formatRate } from '@/lib/format';
import { usePrice } from '@/services/feed/usePrice';
import type { Pair } from '@/services/feed/types';

// FXSW-017: streaming mode only. Fixed mode + margin controls land in
// FXSW-018. Spec: docs/02 §4.4 + docs/05 §4.
//
// - Bid + Ask cells render live from the PricingFeed via usePrice.
// - On a value change, the cell briefly flashes (80ms) green for an
//   up-tick or red for a down-tick. Class clears after the timer.
// - Stale-feed: if no new tick lands within 3 seconds, all cells render
//   the em-dash placeholder per docs/05 §8.

const STALE_MS = 3000;
const FLASH_MS = 80;

type FlashDir = 'up' | 'down' | null;

export interface PricingPanelProps {
  pair: Pair;
}

export default function PricingPanel({ pair }: PricingPanelProps) {
  const tick = usePrice(pair);
  const prevBid = useRef<number | null>(null);
  const prevAsk = useRef<number | null>(null);
  const [bidFlash, setBidFlash] = useState<FlashDir>(null);
  const [askFlash, setAskFlash] = useState<FlashDir>(null);
  const [stale, setStale] = useState(false);

  // Tick-direction flash + stale-feed timer reset.
  useEffect(() => {
    if (!tick) return;
    let bidTimer: ReturnType<typeof setTimeout> | null = null;
    let askTimer: ReturnType<typeof setTimeout> | null = null;
    if (prevBid.current !== null && tick.bid !== prevBid.current) {
      setBidFlash(tick.bid > prevBid.current ? 'up' : 'down');
      bidTimer = setTimeout(() => setBidFlash(null), FLASH_MS);
    }
    if (prevAsk.current !== null && tick.ask !== prevAsk.current) {
      setAskFlash(tick.ask > prevAsk.current ? 'up' : 'down');
      askTimer = setTimeout(() => setAskFlash(null), FLASH_MS);
    }
    prevBid.current = tick.bid;
    prevAsk.current = tick.ask;
    setStale(false);
    const staleTimer = setTimeout(() => setStale(true), STALE_MS);
    return () => {
      if (bidTimer) clearTimeout(bidTimer);
      if (askTimer) clearTimeout(askTimer);
      clearTimeout(staleTimer);
    };
  }, [tick]);

  const showValues = tick !== null && !stale;

  return (
    <section
      data-testid="pricing-panel"
      aria-label="Pricing"
      className="flex flex-col gap-2"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
        Trader Rate
      </h2>
      <div className="flex items-center gap-4">
        <Cell
          testId="bid-cell"
          label="Bid"
          flash={bidFlash}
          value={showValues ? formatRate(tick.bid, pair) : '—'}
        />
        <div data-testid="mid-cell" className="flex flex-col items-center">
          <span className="font-mono text-base tabular-nums text-text-dim">
            {showValues ? formatRate(tick.mid, pair) : '—'}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
            Mid
          </span>
        </div>
        <Cell
          testId="ask-cell"
          label="Ask"
          flash={askFlash}
          value={showValues ? formatRate(tick.ask, pair) : '—'}
        />
      </div>
    </section>
  );
}

function Cell({
  testId,
  label,
  flash,
  value,
}: {
  testId: string;
  label: string;
  flash: FlashDir;
  value: string;
}) {
  return (
    <div
      data-testid={testId}
      data-flash={flash ?? undefined}
      className={clsx(
        'flex flex-1 flex-col items-center rounded-sm border bg-bg-elevated px-3 py-2 transition-colors duration-[80ms]',
        flash === 'up' && 'border-green',
        flash === 'down' && 'border-red',
        !flash && 'border-border',
      )}
    >
      <span className="font-mono text-2xl tabular-nums text-text">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-tight text-text-mute">
        {label}
      </span>
    </div>
  );
}
