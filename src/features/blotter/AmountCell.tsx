import { formatAmount } from '@/lib/format';
import type { Pair } from '@/services/feed/types';
import type { DealtCcy } from '@/types/deal';

export interface AmountCellProps {
  notional: number;
  pair: Pair;
  dealtCcy?: DealtCcy;
}

export default function AmountCell({ notional, pair, dealtCcy = 'BASE' }: AmountCellProps) {
  // Split CCY into its own span so the suffix dims independently.
  const formatted = formatAmount(notional, pair, dealtCcy);
  const [amount, ccy] = formatted.split(/\s+/);
  return (
    <span className="font-mono tabular-nums text-text">
      {amount} <span className="text-text-mute">{ccy}</span>
    </span>
  );
}
