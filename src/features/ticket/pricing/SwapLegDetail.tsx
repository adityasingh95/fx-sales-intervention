import { formatSettlementDate, valueDateForTenor } from '@/lib/time';
import { clientSwapNetPoints } from '@/lib/pips';
import { swapPointsFeed } from '@/services/feed/swapPoints';
import type { Deal, MarginPair } from '@/types/deal';

// Read-only swap leg detail for the historic overlay (FXSW-086). Lists each leg's
// tenor, two-sided points and value date, the raw net differential, and — when
// the deal was executed — the net points actually used (raw net marked up by the
// captured effective net margin).

const fmtPoints = (n: number): string => (n > 0 ? `+${n.toFixed(1)}` : n.toFixed(1));

export interface SwapLegDetailProps {
  deal: Deal;
  // The effective net-points margin captured at execution; absent if no price
  // was sent.
  executedNetMargin?: MarginPair;
}

export default function SwapLegDetail({ deal, executedNetMargin }: SwapLegDetailProps) {
  const legs = deal.legs ?? [];
  const nearTenor = legs[0]?.tenor ?? deal.tenor;
  const farTenor = legs[1]?.tenor ?? deal.tenor;
  const swap = swapPointsFeed.get(deal.pair, nearTenor, farTenor);
  const trade = new Date(deal.createdAt);
  const execNet = executedNetMargin ? clientSwapNetPoints(swap.net, executedNetMargin) : null;

  const rows: Array<{ id: 'near' | 'far'; tenor: string; date: string; bid: number; ask: number }> = [
    {
      id: 'near',
      tenor: nearTenor,
      date: formatSettlementDate(valueDateForTenor(trade, nearTenor)),
      bid: swap.near.bid,
      ask: swap.near.ask,
    },
    {
      id: 'far',
      tenor: farTenor,
      date: formatSettlementDate(valueDateForTenor(trade, farTenor)),
      bid: swap.far.bid,
      ask: swap.far.ask,
    },
  ];

  return (
    <section
      data-testid="swap-detail"
      aria-label="Swap legs"
      className="flex flex-col gap-2 rounded-sm border border-border bg-bg-elevated/40 p-3"
    >
      <h2 className="text-xs font-medium uppercase tracking-tight text-text-mute">Swap legs</h2>
      {rows.map((row) => (
        <div
          key={row.id}
          data-testid={`swap-detail-${row.id}`}
          className="flex items-center justify-between text-xs"
        >
          <span className="font-mono uppercase text-text-dim">{row.id} · {row.tenor}</span>
          <span className="font-mono tabular-nums text-text-mute">
            {fmtPoints(row.bid)} / {fmtPoints(row.ask)} pips
          </span>
          <span className="font-mono text-[10px] uppercase text-text-mute">{row.date}</span>
        </div>
      ))}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-2 text-xs">
        <span className="uppercase tracking-tight text-text-mute">Net swap points</span>
        <span className="font-mono tabular-nums text-text">
          <span data-testid="swap-detail-net-bid">{fmtPoints(swap.net.bid)}</span>
          {' / '}
          <span data-testid="swap-detail-net-ask">{fmtPoints(swap.net.ask)}</span>
        </span>
      </div>
      {execNet && (
        <div className="flex items-center justify-between text-xs">
          <span className="uppercase tracking-tight text-text-mute">Net used for execution</span>
          <span className="font-mono tabular-nums text-text">
            <span data-testid="swap-detail-exec-bid">{fmtPoints(execNet.bid)}</span>
            {' / '}
            <span data-testid="swap-detail-exec-ask">{fmtPoints(execNet.ask)}</span>
          </span>
        </div>
      )}
    </section>
  );
}
