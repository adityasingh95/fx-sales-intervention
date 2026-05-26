import { formatAmount } from '@/lib/format';
import { addBusinessDays, formatSettlementDate } from '@/lib/time';
import type { Deal } from '@/types/deal';

// Per docs/02 §4.2: natural-language one-liner + key/value strip.
// Sentence template: "Client [Name] wants to [BUY|SELL] [amount]
// [base_ccy] vs [quote_ccy] for [tenor] settlement."

export interface SummaryPanelProps {
  deal: Deal;
}

export default function SummaryPanel({ deal }: SummaryPanelProps) {
  const quote = deal.pair.slice(3);
  const tradeDate = new Date(deal.createdAt);
  const settlementDate = addBusinessDays(tradeDate, 2);
  return (
    <section
      data-testid="summary-panel"
      aria-label="Summary"
      className="flex flex-col gap-2"
    >
      <p className="text-sm text-text">
        Client <strong className="font-medium">{deal.clientName}</strong> wants to{' '}
        <strong className="font-medium">
          {deal.side} {formatAmount(deal.notional, deal.pair)}
        </strong>{' '}
        vs <strong className="font-mono font-medium uppercase">{quote}</strong> for{' '}
        <strong className="font-mono font-medium uppercase">{deal.tenor}</strong>{' '}
        settlement.
      </p>
      <dl className="grid grid-cols-3 gap-x-4 border-t border-border pt-2 text-xs">
        <div>
          <dt className="text-text-mute uppercase tracking-tight">Account</dt>
          <dd className="font-mono text-text">{deal.accountCode}</dd>
        </div>
        <div>
          <dt className="text-text-mute uppercase tracking-tight">Trade date</dt>
          <dd className="font-mono text-text">{formatSettlementDate(tradeDate)}</dd>
        </div>
        <div>
          <dt className="text-text-mute uppercase tracking-tight">Settlement</dt>
          <dd className="font-mono text-text">{formatSettlementDate(settlementDate)}</dd>
        </div>
      </dl>
    </section>
  );
}
