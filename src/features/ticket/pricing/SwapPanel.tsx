import clsx from 'clsx';
import { useEffect, useState } from 'react';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import {
  clientSwapNetPoints,
  effectiveSwapMargin,
  estimatedProfitUsd,
  type SwapMarkupMode,
} from '@/lib/pips';
import type { QuoteSide } from '@/lib/quoteSide';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { PriceTick } from '@/services/feed/types';
import type { Deal, MarginPair } from '@/types/deal';
import { BalanceZeroRow, MarginRow } from './MarginControls';
import SwapLegBlock from './SwapLegBlock';

// Swap pricing panel (FXSW-085, docs/05 §18.4). Two-leg layout (NEAR + FAR) with
// per-leg points, a prominent net-differential row (far − near per side), a
// markup-mode toggle (Per-component = a margin on each leg; Total = one margin on
// the net), per-scope Balance/Zero, and the one-sided lock across both legs + net.
// Client net points and estimated P/L derive from the net via lib/pips.

const ZERO: MarginPair = { bid: 0, ask: 0 };
const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

const PROFIT_FMT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function ModeButton({
  mode,
  label,
  active,
  onSelect,
}: {
  mode: SwapMarkupMode;
  label: string;
  active: boolean;
  onSelect: (mode: SwapMarkupMode) => void;
}) {
  return (
    <button
      type="button"
      data-testid={`swap-markup-mode-${mode === 'PER_COMPONENT' ? 'per-component' : 'total'}`}
      aria-pressed={active}
      onClick={() => onSelect(mode)}
      className={clsx(
        'rounded-sm border px-2 py-1 text-xs font-medium transition-colors',
        active ? 'border-border-focus text-text' : 'border-border text-text-dim hover:text-text',
      )}
    >
      {label}
    </button>
  );
}

export interface SwapPanelProps {
  deal: Deal;
  tick: PriceTick | null;
  quoteSide?: QuoteSide;
  restrictMarginSides?: boolean;
  readOnly?: boolean;
}

export default function SwapPanel({
  deal,
  tick,
  quoteSide = 'BOTH',
  restrictMarginSides = false,
  readOnly = false,
}: SwapPanelProps) {
  const [mode, setMode] = useState<SwapMarkupMode>('PER_COMPONENT');
  const [nearMargin, setNearMargin] = useState<MarginPair>(ZERO);
  const [farMargin, setFarMargin] = useState<MarginPair>(ZERO);
  const [totalMargin, setTotalMargin] = useState<MarginPair>(ZERO);

  // Reset markup state whenever a different deal opens.
  useEffect(() => {
    setMode('PER_COMPONENT');
    setNearMargin(ZERO);
    setFarMargin(ZERO);
    setTotalMargin(ZERO);
  }, [deal.dealId]);

  const legs = deal.legs ?? [];
  const nearTenor = legs[0]?.tenor ?? deal.tenor;
  const farTenor = legs[1]?.tenor ?? deal.tenor;
  const swap = swapPointsFeed.get(deal.pair, nearTenor, farTenor);

  const tradeDate = new Date(deal.createdAt);
  const nearDate = formatSettlementDate(valueDateForTenor(tradeDate, nearTenor));
  const farDate = formatSettlementDate(valueDateForTenor(tradeDate, farTenor));

  // One-sided lock (§17.1), applied across both legs + the net row.
  const bidLocked = readOnly || (restrictMarginSides && quoteSide === 'ASK');
  const askLocked = readOnly || (restrictMarginSides && quoteSide === 'BID');
  const showBalanceZero = !readOnly && !(restrictMarginSides && quoteSide !== 'BOTH');

  const effMargin = effectiveSwapMargin(
    mode,
    { total: totalMargin, near: nearMargin, far: farMargin },
    quoteSide,
  );
  const clientNet = clientSwapNetPoints(swap.net, effMargin);
  const midRate = tick?.mid ?? 0;
  const plBid = estimatedProfitUsd(effMargin.bid, deal.notional, deal.pair, midRate);
  const plAsk = estimatedProfitUsd(effMargin.ask, deal.notional, deal.pair, midRate);

  return (
    <section
      data-testid="swap-panel"
      aria-label="Swap pricing"
      className="flex flex-col gap-3 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
          Swap · {nearTenor} → {farTenor}
        </h2>
        {!readOnly && (
          <div data-testid="swap-markup-mode" className="flex gap-1">
            <ModeButton
              mode="PER_COMPONENT"
              label="Per-component"
              active={mode === 'PER_COMPONENT'}
              onSelect={setMode}
            />
            <ModeButton mode="TOTAL" label="Total" active={mode === 'TOTAL'} onSelect={setMode} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1">
          <SwapLegBlock
            kind="NEAR"
            tenor={nearTenor}
            valueDate={nearDate}
            points={swap.near}
            showMargin={mode === 'PER_COMPONENT'}
            margin={nearMargin}
            onMarginChange={setNearMargin}
            bidLocked={bidLocked}
            askLocked={askLocked}
            showBalanceZero={showBalanceZero}
          />
        </div>
        <div className="flex-1">
          <SwapLegBlock
            kind="FAR"
            tenor={farTenor}
            valueDate={farDate}
            points={swap.far}
            showMargin={mode === 'PER_COMPONENT'}
            margin={farMargin}
            onMarginChange={setFarMargin}
            bidLocked={bidLocked}
            askLocked={askLocked}
            showBalanceZero={showBalanceZero}
          />
        </div>
      </div>

      {/* Net differential (far − near per side) — the basis for the client quote. */}
      <div className="flex flex-col gap-1 rounded-sm border border-border-focus/40 bg-bg-elevated/60 p-2">
        <span className="text-[10px] uppercase tracking-tight text-text-mute">Net swap points</span>
        <div className="grid grid-cols-2 gap-x-4 text-center">
          <div>
            <span data-testid="swap-net-bid" className="font-mono text-base tabular-nums text-text">
              {fmtPoints(swap.net.bid)}
            </span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Net bid</div>
          </div>
          <div>
            <span data-testid="swap-net-ask" className="font-mono text-base tabular-nums text-text">
              {fmtPoints(swap.net.ask)}
            </span>
            <div className="text-[10px] uppercase tracking-tight text-text-mute">Net ask</div>
          </div>
        </div>
      </div>

      {mode === 'TOTAL' && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] uppercase tracking-tight text-text-mute">
            Net points margin
          </span>
          <div className="flex items-start gap-4">
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="bid"
                idPrefix="net-"
                labelPrefix="net "
                value={totalMargin.bid}
                onChange={(n) =>
                  setTotalMargin({ bid: Math.max(0, Math.floor(n)), ask: totalMargin.ask })
                }
                glow={false}
                disabled={bidLocked}
              />
            </div>
            <div className="flex flex-1 justify-center">
              <MarginRow
                testIdSuffix="ask"
                idPrefix="net-"
                labelPrefix="net "
                value={totalMargin.ask}
                onChange={(n) =>
                  setTotalMargin({ bid: totalMargin.bid, ask: Math.max(0, Math.floor(n)) })
                }
                glow={false}
                disabled={askLocked}
              />
            </div>
          </div>
          {showBalanceZero && (
            <BalanceZeroRow
              marginPair={totalMargin}
              onMarginPairChange={setTotalMargin}
              idPrefix="net"
              minMargin={0}
            />
          )}
        </div>
      )}

      {/* Client net (marked-up) + estimated P/L per quotable side. */}
      <div className="grid grid-cols-2 gap-x-4 text-center">
        <div className={clsx(bidLocked && 'opacity-40')}>
          <div data-testid="client-net-bid" className="font-mono tabular-nums text-text">
            {fmtPoints(clientNet.bid)}
          </div>
          <div data-testid="swap-pnl-bid" className="text-[10px] uppercase tracking-tight text-text-mute">
            {PROFIT_FMT.format(plBid)}
          </div>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Client bid</div>
        </div>
        <div className={clsx(askLocked && 'opacity-40')}>
          <div data-testid="client-net-ask" className="font-mono tabular-nums text-text">
            {fmtPoints(clientNet.ask)}
          </div>
          <div data-testid="swap-pnl-ask" className="text-[10px] uppercase tracking-tight text-text-mute">
            {PROFIT_FMT.format(plAsk)}
          </div>
          <div className="text-[10px] uppercase tracking-tight text-text-mute">Client ask</div>
        </div>
      </div>
    </section>
  );
}
