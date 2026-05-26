import clsx from 'clsx';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { DealEvent as ParentDealEvent } from '@/state/machines/dealMachine';

// FXSW-020: 6-button footer per docs/02 §4.7. Visibility gated on the
// SI state + (for Send Stream / Send Quote / Return to Stream) the
// pricing mode. Reject and Send Stream require 600ms hold-to-confirm
// or double-click; other actions are single-click.

const HOLD_MS = 600;

export interface TicketFooterProps {
  dealId: string;
  siState: string;
  pricingMode: 'streaming' | 'fixed';
  onReturnToStream: () => void;
}

export default function TicketFooter({
  dealId,
  siState,
  pricingMode,
  onReturnToStream,
}: TicketFooterProps) {
  const fire = (event: ParentDealEvent): void => {
    useDealsStore.getState().forwardEvent(dealId, event);
  };

  const isPickedUp = siState === 'PickedUp';
  const isQuoted = siState === 'Quoted';
  const isQuoteSent = siState === 'QuoteSent';
  const isWithdrawSent = siState === 'WithdrawSent';
  const isHoldSent = siState === 'HoldSent';
  const isRejectSent = siState === 'RejectSent';

  // Each button stays mounted across its *Sent window (so the spinner
  // can render in place); otherwise the button only shows while its
  // originating state is the current state.
  const showReject = isPickedUp || isQuoted || isRejectSent;
  const showRelease = isPickedUp || isQuoted || isHoldSent;
  const showSendStream =
    pricingMode === 'streaming' && (isPickedUp || isQuoteSent);
  const showSendQuote = pricingMode === 'fixed' && (isPickedUp || isQuoteSent);
  const showWithdraw = isQuoted || isWithdrawSent;
  const showReturnToStream = pricingMode === 'fixed' && isPickedUp;

  return (
    <footer
      data-testid="ticket-footer"
      className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3"
    >
      {showReturnToStream && (
        <ActionButton
          testId="btn-return-stream"
          onClick={onReturnToStream}
          variant="ghost"
        >
          Return to Stream
        </ActionButton>
      )}
      {showRelease && (
        <ActionButton
          testId="btn-release"
          onClick={() => {
            fire({ type: 'Hold' });
            // FXSW-031 — Release hands the ticket back to the desk;
            // closing the panel matches docs/07 Scenario 5 ("the ticket
            // panel closes"). Distinct from the passive close paths
            // (Esc / backdrop) which do NOT fire Hold per docs/02 §4.8.
            useUiStore.getState().closeTicket();
          }}
          inFlight={isHoldSent}
          variant="ghost"
        >
          Release
        </ActionButton>
      )}
      {showReject && (
        <HoldButton
          testId="btn-reject"
          onConfirm={() => fire({ type: 'Reject' })}
          inFlight={isRejectSent}
          variant="danger"
        >
          Reject
        </HoldButton>
      )}
      {showWithdraw && (
        <ActionButton
          testId="btn-withdraw"
          onClick={() => fire({ type: 'Withdraw' })}
          inFlight={isWithdrawSent}
          variant="secondary"
        >
          Withdraw
        </ActionButton>
      )}
      {showSendStream && (
        <HoldButton
          testId="btn-send-stream"
          onConfirm={() => fire({ type: 'Quote' })}
          inFlight={isQuoteSent}
          variant="primary"
        >
          Send Stream
        </HoldButton>
      )}
      {showSendQuote && (
        <ActionButton
          testId="btn-send-quote"
          onClick={() => fire({ type: 'Quote' })}
          inFlight={isQuoteSent}
          variant="primary"
        >
          Send Quote
        </ActionButton>
      )}
    </footer>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-blue text-white hover:bg-blue/85 border-blue',
  secondary: 'bg-bg-elevated text-text border-border hover:border-blue/60',
  danger: 'bg-red/15 text-red border-red/40 hover:bg-red/25',
  ghost: 'bg-transparent text-text-dim border-border hover:border-blue/60 hover:text-text',
};

interface CommonProps {
  testId: string;
  children: ReactNode;
  inFlight?: boolean;
  variant: Variant;
}

interface ActionButtonProps extends CommonProps {
  onClick: () => void;
}

function ActionButton({
  testId,
  children,
  inFlight,
  variant,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-in-flight={inFlight ? 'true' : undefined}
      disabled={inFlight}
      onClick={onClick}
      className={clsx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-sm border px-4 text-sm font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
      )}
    >
      {inFlight && <Loader2 size={14} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

interface HoldButtonProps extends CommonProps {
  onConfirm: () => void;
}

function HoldButton({ testId, children, inFlight, variant, onConfirm }: HoldButtonProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [holding, setHolding] = useState(false);

  const cancel = (): void => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setHolding(false);
  };

  const start = (): void => {
    if (inFlight) return;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      onConfirm();
      cancel();
    }, HOLD_MS);
  };

  // Double-click is the alternative confirm path per docs/02 §4.7.
  const onDoubleClick = (): void => {
    if (inFlight) return;
    onConfirm();
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <button
      type="button"
      data-testid={testId}
      data-in-flight={inFlight ? 'true' : undefined}
      data-holding={holding ? 'true' : undefined}
      aria-describedby={`${testId}-hint`}
      disabled={inFlight}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onDoubleClick={onDoubleClick}
      className={clsx(
        'relative inline-flex h-9 items-center justify-center gap-2 overflow-hidden rounded-sm border px-4 text-sm font-medium transition-colors duration-100 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_CLASSES[variant],
      )}
    >
      {/* Hold-progress overlay — visual cue for the 600ms confirm window. */}
      {holding && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            transformOrigin: 'left center',
            background: 'currentColor',
            opacity: 0.25,
            animation: 'holdgrow 600ms linear forwards',
          }}
        />
      )}
      <span className="relative z-10 inline-flex items-center gap-2">
        {inFlight && <Loader2 size={14} className="animate-spin" aria-hidden />}
        {children}
      </span>
      <span id={`${testId}-hint`} className="sr-only">
        Hold for 600ms or double-click to confirm
      </span>
    </button>
  );
}
