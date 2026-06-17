import clsx from 'clsx';
import { X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import StatusCell from '@/features/blotter/StatusCell';
import { derivedStatus } from '@/features/blotter/statusFromMachines';
import { isV3 } from '@/lib/devVersion';
import { formatTime } from '@/lib/format';
import { quoteSideFor } from '@/lib/quoteSide';
import type { PriceTick } from '@/services/feed/types';
import { usePrice } from '@/services/feed/usePrice';
import { getMarketContext } from '@/services/suggestion/marketContext';
import { forwardPointsFeed } from '@/services/feed/forwardPoints';
import { useSuggestionState } from './useSuggestionState';
import { useQuoteContextCapture } from './useQuoteContextCapture';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import { instrumentOf, isForwardTenor, type MarginPair } from '@/types/deal';
import ClientSummaryPanel from './ClientSummaryPanel';
import DealSummaryPanel from './DealSummaryPanel';
import PricingPanel from './PricingPanel';
import ForwardPointsPanel, { type MarkupMode } from './pricing/ForwardPointsPanel';
import LegTabs from './pricing/LegTabs';
import SwapPanel from './pricing/SwapPanel';
import ReasonsPanel from './ReasonsPanel';
import SuggestionPanel from './SuggestionPanel';
import SummaryPanel from './SummaryPanel';
import TicketFooter from './TicketFooter';

// FXSW-014 shell. Renders only when uiStore.openDealId is set. Slides in
// from the right via transform: translateX over 240ms per docs/02 §1 +
// docs/05 §2; backdrop click + Esc both close. Opening fires SI PickUp
// for the deal (only if SI is still in Initial — re-opening a PickedUp
// deal does not double-fire). Closing does not auto-Hold per
// docs/02 §4.8 — the operator releases explicitly via the Release button
// (Footer is FXSW-019/021, out of scope here).
export default function TicketPanel() {
  const openDealId = useUiStore((s) => s.openDealId);
  const entry = useDealsStore((s) => (openDealId ? s.deals.get(openDealId) : undefined));
  const [slidIn, setSlidIn] = useState(false);
  // FXSW-039: dual-margin state. Each side carries an independent pip
  // markup. The AI suggestion engine returns a single value applied to
  // both sides on Apply; Undo restores the prior pair losslessly via
  // the saved pair below.
  const defaultPips = entry?.deal.defaultMarginPips ?? 3;
  const [marginPair, setMarginPair] = useState<MarginPair>({
    bid: defaultPips,
    ask: defaultPips,
  });
  const [savedPairForUndo, setSavedPairForUndo] = useState<MarginPair | null>(null);
  // FXSW-057: forward-points margin (component mode) + markup mode. Spot deals
  // ignore both.
  const [fwdMarginPair, setFwdMarginPair] = useState<MarginPair>({ bid: 0, ask: 0 });
  const [savedFwdForUndo, setSavedFwdForUndo] = useState<MarginPair | null>(null);
  const [markupMode, setMarkupMode] = useState<MarkupMode>('component');
  // FXSW-086: SWAP effective net-points margin + mode, reported up by SwapPanel
  // so the quote-context capture records what was applied at QuoteSent.
  const [swapPricing, setSwapPricing] = useState<{
    mode: 'PER_COMPONENT' | 'TOTAL';
    net: MarginPair;
  } | null>(null);
  // FXSW-069 (v3): a "happy" auto-priced (ESP) deal needs no manual
  // intervention, so opening it shows a read-only view and does NOT fire
  // PickUp. Latched once per open so it stays stable after the deal
  // auto-confirms (RFS → TradeConfirmed) while SI remains `Initial`.
  const [autoView, setAutoView] = useState(false);
  // FXSW-060: track whether the live margin came from the AI suggestion (and
  // its rationale) so the markup reason can be captured at quote time.
  const [aiApplied, setAiApplied] = useState(false);
  const [appliedRationale, setAppliedRationale] = useState<string | null>(null);
  // Convenience setter for the AI-suggestion Apply path — writes both
  // sides equal so a single suggested pip value applies symmetrically.
  const setMargin = useCallback((n: number) => {
    setMarginPair({ bid: n, ask: n });
  }, []);
  const margin = marginPair.bid;
  // Pricing mode is per-open-deal local state. Lifted from PricingPanel
  // in FXSW-019 so ClientSummaryPanel can read the same display tick.
  const [pricingMode, setPricingMode] = useState<'streaming' | 'fixed'>('streaming');
  const [fixedSide, setFixedSide] = useState<'bid' | 'ask' | null>(null);
  const [frozenTick, setFrozenTick] = useState<PriceTick | null>(null);
  // We always subscribe to the live tick (cheap, single subscription
  // per ticket session); the display tick switches based on
  // pricingMode.
  const liveTick = usePrice(entry?.deal.pair ?? 'EURUSD');
  const displayTick = pricingMode === 'fixed' ? frozenTick : liveTick;
  // AI suggestion lifecycle (FXSW-025/026), extracted to a hook in FXSW-057.
  const { suggestion, recompute: computeAndSetSuggestion } = useSuggestionState(entry, liveTick);

  // Reset margin + pricing mode whenever a different deal opens.
  useEffect(() => {
    if (entry) {
      setMarginPair({
        bid: entry.deal.defaultMarginPips,
        ask: entry.deal.defaultMarginPips,
      });
      setSavedPairForUndo(null);
      setFwdMarginPair({ bid: 0, ask: 0 });
      setSavedFwdForUndo(null);
      setMarkupMode('component');
      setSwapPricing(null);
      setAiApplied(false);
      setAppliedRationale(null);
      setPricingMode('streaming');
      setFixedSide(null);
      setFrozenTick(null);
    }
  }, [openDealId, entry]);

  // Esc closes. Listener only active while open.
  useEffect(() => {
    if (!openDealId) return;
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') useUiStore.getState().closeTicket();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [openDealId]);

  // Fire SI PickUp once per open, only if the deal is still in Initial — but
  // never for a happy auto-priced (ESP) deal under v3 (rfs Executable + si
  // Initial = AUTO). Those open read-only instead, so an already auto-priced
  // deal isn't pulled into manual handling (FXSW-069).
  useEffect(() => {
    if (!openDealId) return;
    const cur = useDealsStore.getState().deals.get(openDealId);
    if (!cur) return;
    const auto = isV3() && cur.rfsState === 'Executable' && cur.siState === 'Initial';
    setAutoView(auto);
    if (!auto && cur.siState === 'Initial') {
      useDealsStore.getState().forwardEvent(openDealId, { type: 'PickUp' });
    }
  }, [openDealId]);

  // FXSW-079/080: NDF is points-only. The effective spot margin is zeroed for an
  // NDF at this single boundary so EVERY consumer below — the manual ticket, the
  // auto-priced view, and the quote-context capture — gets the inert value and no
  // render path can reintroduce a spot markup (security F-1/F-2/F-3).
  const instrument = entry ? instrumentOf(entry.deal) : 'SPOT';
  const isNdf = instrument === 'NDF';
  const effectiveSpotMargin: MarginPair = isNdf ? { bid: 0, ask: 0 } : marginPair;
  const effectiveMarkupMode: MarkupMode = isNdf ? 'component' : markupMode;

  // FXSW-060: capture the markup reason when the trader sends a price. The
  // captured spot margin is the *effective* one, so an NDF record carries a zero
  // spot component matching the price actually sent (security F-3).
  useQuoteContextCapture(entry, {
    marginPair: effectiveSpotMargin,
    fwdMarginPair,
    markupMode: effectiveMarkupMode,
    aiApplied,
    appliedRationale,
    swap:
      instrument === 'SWAP'
        ? (swapPricing ?? { mode: 'PER_COMPONENT', net: { bid: 0, ask: 0 } })
        : undefined,
  });

  // Two-pass mount so the slide-in animates from `translate-x-full` to
  // `translate-x-0`. Reset whenever a different deal opens.
  useEffect(() => {
    if (!openDealId) {
      setSlidIn(false);
      return;
    }
    const handle = requestAnimationFrame(() => setSlidIn(true));
    return () => cancelAnimationFrame(handle);
  }, [openDealId]);

  if (!openDealId || !entry) return null;

  const { deal, rejectionReasons, siState, rfsState, dealable } = entry;
  const status = derivedStatus(rfsState, siState, dealable);
  // Forward pricing (FXSW-057). Forward points are stable per (pair, tenor).
  // In all-in markup mode the forward-points margin is held at zero (the spot
  // margin applies to the whole outright).
  const isForward = isForwardTenor(deal.tenor);
  // FXSW-075: two-sided points flow through pricing — bid side uses bid points,
  // ask side uses ask points (see lib/pips outrightPair/clientForwardPair).
  // `instrument`/`isNdf`/`effectiveSpotMargin`/`effectiveMarkupMode` are computed
  // once above (so the capture hook + both render branches share them).
  const fwdPoints = isForward
    ? forwardPointsFeed.get(deal.pair, deal.tenor)
    : { bid: 0, ask: 0, mid: 0 };
  const effectiveFwdMargin: MarginPair =
    effectiveMarkupMode === 'all-in' ? { bid: 0, ask: 0 } : fwdMarginPair;
  const quoteSide = quoteSideFor(deal.side, deal.dealtCcy);
  // v3 only — GA keeps both margin sides editable regardless of request side.
  const restrictMarginSides = isV3();

  return (
    <div
      className="fixed inset-0 z-40"
      onClick={() => useUiStore.getState().closeTicket()}
      role="presentation"
    >
      <div
        data-testid="ticket-panel"
        data-deal-id={deal.dealId}
        data-instrument={instrument}
        data-readonly={autoView ? 'true' : undefined}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={autoView ? 'Auto-priced deal' : 'Sales Intervention ticket'}
        className={clsx(
          'absolute right-0 top-0 flex h-full w-full max-w-full flex-col border-l border-border bg-bg-glass shadow-2xl backdrop-blur-xl backdrop-saturate-150 transition-transform duration-[240ms] ease-[cubic-bezier(0.16,1,0.3,1)] sm:w-[640px]',
          slidIn ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-sans text-sm font-medium text-text">
              {autoView ? 'Auto-priced' : 'Sales Intervention'}
            </span>
            <span className="font-mono text-xs text-text-mute">{deal.dealId}</span>
          </div>
          <button
            type="button"
            aria-label="Close ticket"
            onClick={() => useUiStore.getState().closeTicket()}
            className="rounded-sm p-1 text-text-dim transition-colors hover:bg-bg-row-hover hover:text-text"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-5 overflow-auto px-5 py-4">
          <div className="flex items-center gap-3">
            <StatusCell status={status} />
            <span className="font-mono text-xs uppercase tracking-tight text-text-dim">
              {formatTime(deal.createdAt)}
            </span>
          </div>

          {instrument === 'SWAP' ? (
            <>
              {autoView ? (
                <p
                  data-testid="auto-priced-note"
                  className="rounded-sm border border-border bg-bg-elevated/40 p-3 text-sm text-text-dim"
                >
                  This deal is auto-priced and streaming to the client within tolerance. No
                  manual intervention is required.
                </p>
              ) : (
                <ReasonsPanel reasons={rejectionReasons} />
              )}
              <SummaryPanel deal={deal} />
              <SwapPanel
                deal={deal}
                tick={displayTick}
                quoteSide={quoteSide}
                restrictMarginSides={restrictMarginSides}
                readOnly={autoView}
                onPricingChange={setSwapPricing}
              />
              <DealSummaryPanel deal={deal} />
            </>
          ) : autoView ? (
            <>
              <p
                data-testid="auto-priced-note"
                className="rounded-sm border border-border bg-bg-elevated/40 p-3 text-sm text-text-dim"
              >
                This deal is auto-priced and streaming to the client within tolerance. No
                manual intervention is required.
              </p>
              <SummaryPanel deal={deal} />
              {isForward && (
                <>
                  {isNdf && (
                    <p
                      data-testid="ndf-note"
                      className="rounded-sm border border-border bg-bg-elevated/40 p-3 text-[11px] leading-snug text-text-mute"
                    >
                      Non-Deliverable Forward — cash-settled. Markup is taken on the
                      forward points only; there is no spot-level markup.
                    </p>
                  )}
                  <ForwardPointsPanel
                    pair={deal.pair}
                    tenor={deal.tenor}
                    tick={displayTick}
                    fwdPoints={fwdPoints}
                    markupMode={effectiveMarkupMode}
                    onMarkupModeChange={setMarkupMode}
                    showMarkupToggle={!isNdf}
                    marginPair={effectiveSpotMargin}
                    fwdMarginPair={{ bid: 0, ask: 0 }}
                    onFwdMarginPairChange={() => {}}
                  />
                </>
              )}
              <ClientSummaryPanel
                tick={displayTick}
                marginPair={effectiveSpotMargin}
                notional={deal.notional}
                pair={deal.pair}
                quoteSide={quoteSide}
                fwdPoints={isForward ? fwdPoints : undefined}
                fwdMarginPair={{ bid: 0, ask: 0 }}
              />
              <DealSummaryPanel deal={deal} />
            </>
          ) : (
          <>
          <ReasonsPanel reasons={rejectionReasons} />
          <SuggestionPanel
            suggestion={suggestion}
            currentMargin={margin}
            onApply={(pips, fwdPips) => {
              setSavedPairForUndo(marginPair);
              setMarginPair({ bid: pips, ask: pips });
              setAiApplied(true);
              setAppliedRationale(
                suggestion?.kind === 'ready' ? suggestion.rationale : null,
              );
              if (fwdPips !== undefined) {
                setSavedFwdForUndo(fwdMarginPair);
                setFwdMarginPair({ bid: fwdPips, ask: fwdPips });
                setMarkupMode('component');
              }
            }}
            onUndo={() => {
              if (savedPairForUndo) {
                setMarginPair(savedPairForUndo);
                setSavedPairForUndo(null);
              }
              if (savedFwdForUndo) {
                setFwdMarginPair(savedFwdForUndo);
                setSavedFwdForUndo(null);
              }
              setAiApplied(false);
              setAppliedRationale(null);
            }}
            onRecompute={computeAndSetSuggestion}
            onReject={() =>
              useDealsStore.getState().forwardEvent(deal.dealId, { type: 'Reject' })
            }
            currentVolatility={getMarketContext(deal.pair).pairVolatility}
          />
          <SummaryPanel deal={deal} />
          <PricingPanel
            pair={deal.pair}
            liveTick={liveTick}
            frozenTick={frozenTick}
            pricingMode={pricingMode}
            fixedSide={fixedSide}
            margin={margin}
            onMarginChange={setMargin}
            onEnterFixed={(side) => {
              if (!liveTick) return;
              setPricingMode('fixed');
              setFixedSide(side);
              setFrozenTick(liveTick);
            }}
            onExitFixed={() => {
              setPricingMode('streaming');
              setFixedSide(null);
              setFrozenTick(null);
            }}
            quoteSide={quoteSide}
            marginPair={marginPair}
            onMarginPairChange={setMarginPair}
            restrictMarginSides={restrictMarginSides}
            showSpotMargin={!isNdf}
            onRefresh={() => {
              if (liveTick) setFrozenTick(liveTick);
            }}
          />
          {isForward && (
            <>
              <LegTabs legs={deal.legs ?? []} />
              {isNdf && (
                <p
                  data-testid="ndf-note"
                  className="rounded-sm border border-border bg-bg-elevated/40 p-3 text-[11px] leading-snug text-text-mute"
                >
                  Non-Deliverable Forward — cash-settled. Markup is taken on the
                  forward points only; there is no spot-level markup.
                </p>
              )}
              <ForwardPointsPanel
                pair={deal.pair}
                tenor={deal.tenor}
                tick={displayTick}
                fwdPoints={fwdPoints}
                markupMode={effectiveMarkupMode}
                onMarkupModeChange={setMarkupMode}
                showMarkupToggle={!isNdf}
                marginPair={effectiveSpotMargin}
                fwdMarginPair={effectiveFwdMargin}
                onFwdMarginPairChange={setFwdMarginPair}
                quoteSide={quoteSide}
                restrictMarginSides={restrictMarginSides}
              />
            </>
          )}
          <ClientSummaryPanel
            tick={displayTick}
            marginPair={effectiveSpotMargin}
            notional={deal.notional}
            pair={deal.pair}
            quoteSide={quoteSide}
            fwdPoints={isForward ? fwdPoints : undefined}
            fwdMarginPair={effectiveFwdMargin}
          />
          <DealSummaryPanel deal={deal} />
          </>
          )}
        </div>
        {!autoView && (
          <TicketFooter
            dealId={deal.dealId}
            siState={siState}
            pricingMode={pricingMode}
            onReturnToStream={() => {
              setPricingMode('streaming');
              setFixedSide(null);
              setFrozenTick(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
