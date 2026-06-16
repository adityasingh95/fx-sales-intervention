import { dealtCcyCode, formatAmount } from '@/lib/format';
import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import { isForwardTenor, type Deal } from '@/types/deal';

// Per docs/02 §4.6: read-only deal details. Direction, notional,
// account, trade date, settlement (value) date. FXSW-057: value date is
// tenor-aware and forwards add a Tenor field.

export interface DealSummaryPanelProps {
  deal: Deal;
}

export default function DealSummaryPanel({ deal }: DealSummaryPanelProps) {
  const tradeDate = new Date(deal.createdAt);
  const settlementDate = valueDateForTenor(tradeDate, deal.tenor);
  const dealtCode = dealtCcyCode(deal.pair, deal.dealtCcy);
  const isForward = isForwardTenor(deal.tenor);

  return (
    <section
      data-testid="deal-summary-panel"
      aria-label="Deal Summary"
      className="flex flex-col gap-2"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">
        Deal Summary
      </h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <div data-field="direction">
          <dt className="text-xs uppercase tracking-tight text-text-mute">Direction</dt>
          <dd className="font-mono font-medium text-text">
            {deal.side} {dealtCode}
          </dd>
        </div>
        <div data-field="notional">
          <dt className="text-xs uppercase tracking-tight text-text-mute">Notional</dt>
          <dd className="font-mono tabular-nums text-text">
            {formatAmount(deal.notional, deal.pair, deal.dealtCcy)}
          </dd>
        </div>
        <div data-field="account">
          <dt className="text-xs uppercase tracking-tight text-text-mute">Account</dt>
          <dd className="font-mono text-text">{deal.accountCode}</dd>
        </div>
        <div data-field="trade-date">
          <dt className="text-xs uppercase tracking-tight text-text-mute">Trade date</dt>
          <dd className="font-mono text-text">{formatSettlementDate(tradeDate)}</dd>
        </div>
        <div data-field="settlement-date">
          <dt className="text-xs uppercase tracking-tight text-text-mute">
            {isForward ? 'Value date' : 'Settlement date'}
          </dt>
          <dd className="font-mono text-text">{formatSettlementDate(settlementDate)}</dd>
        </div>
        {isForward && (
          <div data-field="tenor">
            <dt className="text-xs uppercase tracking-tight text-text-mute">Tenor</dt>
            <dd className="font-mono text-text">{deal.tenor}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
