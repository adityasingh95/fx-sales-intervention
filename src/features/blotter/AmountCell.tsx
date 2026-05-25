import { formatAmount } from '@/lib/format';
import type { Pair } from '@/services/feed/types';

export interface AmountCellProps {
  notional: number;
  pair: Pair;
}

export default function AmountCell({ notional, pair }: AmountCellProps) {
  // Split base CCY into its own span so the suffix dims independently.
  const formatted = formatAmount(notional, pair);
  const [amount, ccy] = formatted.split(/\s+/);
  return (
    <span className="font-mono tabular-nums text-text">
      {amount} <span className="text-text-mute">{ccy}</span>
    </span>
  );
}
