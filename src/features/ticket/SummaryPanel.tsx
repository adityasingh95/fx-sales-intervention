import { formatAmount } from '@/lib/format';
import { formatSettlementDate, valueDateForTenor, valueDateLabel } from '@/lib/time';
import { instrumentOf, swapLegSide, type Deal } from '@/types/deal';

// Per docs/02 §4.2: natural-language one-liner + key/value strip.
// Sentence template: "Client [Name] wants to [BUY|SELL] [amount]
// [base_ccy] vs [quote_ccy] for [tenor] settlement."
// A swap (FXSW-082) reads as a two-leg, opposite-direction trade and shows both
// leg value dates rather than a single settlement.

export interface SummaryPanelProps {
  deal: Deal;
}

const SIDE_VERB: Record<'BUY' | 'SELL', string> = { BUY: 'buy', SELL: 'sell' };

export default function SummaryPanel({ deal }: SummaryPanelProps) {
  // The "vs" leg is whichever currency the trader is NOT dealing in.
  const other = deal.dealtCcy === 'BASE' ? deal.pair.slice(3, 6) : deal.pair.slice(0, 3);
  const tradeDate = new Date(deal.createdAt);
  const isSwap = instrumentOf(deal) === 'SWAP';
  const legs = deal.legs ?? [];
  const nearTenor = legs[0]?.tenor ?? deal.tenor;
  const farTenor = legs[1]?.tenor ?? deal.tenor;
  const nearSide = swapLegSide(deal.side, 'NEAR');
  const farSide = swapLegSide(deal.side, 'FAR');
  const settlementDate = valueDateForTenor(tradeDate, deal.tenor);

  return (
    <section
      data-testid="summary-panel"
      aria-label="Summary"
      className="flex flex-col gap-2"
    >
      {isSwap ? (
        <p className="text-sm text-text">
          Client <strong className="font-medium">{deal.clientName}</strong> wants a{' '}
          <strong className="font-mono font-medium uppercase">
            {nearTenor} ⇄ {farTenor}
          </strong>{' '}
          swap on{' '}
          <strong className="font-medium">
            {formatAmount(deal.notional, deal.pair, deal.dealtCcy)}
          </strong>{' '}
          vs <strong className="font-mono font-medium uppercase">{other}</strong>
          {deal.side === 'BOTH' ? (
            ' (two-sided).'
          ) : (
            <>
              {' '}
              — near {SIDE_VERB[nearSide as 'BUY' | 'SELL']} / far{' '}
              {SIDE_VERB[farSide as 'BUY' | 'SELL']}.
            </>
          )}
        </p>
      ) : (
        <p className="text-sm text-text">
          Client <strong className="font-medium">{deal.clientName}</strong>{' '}
          {deal.side === 'BOTH' ? 'wants two-sided prices on ' : 'wants to '}
          <strong className="font-medium">
            {deal.side === 'BOTH' ? '' : `${deal.side} `}
            {formatAmount(deal.notional, deal.pair, deal.dealtCcy)}
          </strong>{' '}
          vs <strong className="font-mono font-medium uppercase">{other}</strong> for{' '}
          <strong className="font-mono font-medium uppercase">{deal.tenor}</strong>{' '}
          settlement.
        </p>
      )}
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
          <dt className="text-text-mute uppercase tracking-tight">
            {isSwap ? 'Settlement (near → far)' : 'Settlement'}
          </dt>
          <dd data-testid="summary-settlement" className="font-mono text-text">
            {isSwap ? valueDateLabel(deal) : formatSettlementDate(settlementDate)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
