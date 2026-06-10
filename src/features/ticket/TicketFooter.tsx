import { Button as ActionButton, HoldButton } from '@/components/Button';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import type { DealEvent as ParentDealEvent } from '@/state/machines/dealMachine';

// FXSW-020: 6-button footer per docs/02 §4.7. Visibility gated on the
// SI state + (for Send Stream / Send Quote / Return to Stream) the
// pricing mode. Reject and Send Stream require 600ms hold-to-confirm
// or double-click; other actions are single-click. ActionButton +
// HoldButton primitives lifted to src/components/Button.tsx in FXSW-030.

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
      className="flex flex-wrap items-center justify-end gap-1 border-t border-border px-2 py-3 sm:gap-2 sm:px-5"
    >
      {showReturnToStream && (
        <ActionButton
          testId="btn-return-stream"
          onClick={onReturnToStream}
          variant="ghost"
        >
          <span className="hidden sm:inline">Return to </span>Stream
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
