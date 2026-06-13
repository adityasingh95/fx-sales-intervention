import clsx from 'clsx';
import { dealtCcyCode, formatTime } from '@/lib/format';
import { useIsMobile } from '@/lib/useIsMobile';
import { useHistoricDeals, type HistoricEntry, type HistoricOutcome } from '@/state/stores/dealsStore';

// Cap per docs/02 §3 Capacity — keep the rendered slice bounded.
const HISTORIC_CAP = 100;

const columns: Array<{ key: string; label: string; width: string }> = [
  { key: 'time', label: 'Time', width: 'w-[80px]' },
  { key: 'client', label: 'Client', width: 'w-[160px]' },
  { key: 'account', label: 'Account', width: 'w-[100px]' },
  { key: 'pair', label: 'CCY Pair', width: 'w-[80px]' },
  { key: 'side', label: 'Side', width: 'w-[60px]' },
  { key: 'amount', label: 'Amount', width: 'w-[120px]' },
  { key: 'tenor', label: 'Tenor', width: 'w-[60px]' },
  { key: 'outcome', label: 'Outcome', width: 'flex-1 min-w-[160px]' },
];

const OUTCOME_COLOR: Record<HistoricOutcome, string> = {
  Executed: 'text-green',
  'Rejected by Trader': 'text-red',
  'Rejected by Client': 'text-red',
  Expired: 'text-text-dim',
  Cancelled: 'text-text-dim',
};

function Row({ entry }: { entry: HistoricEntry }) {
  return (
    <div
      data-deal-id={entry.deal.dealId}
      data-outcome={entry.outcome}
      className="flex items-center border-b border-border bg-bg-app px-4 py-2 text-sm text-text-dim"
    >
      <div className="w-[80px] font-mono text-xs tabular-nums">{formatTime(entry.archivedAt)}</div>
      <div className="w-[160px]">{entry.deal.clientName}</div>
      <div className="w-[100px] font-mono text-xs uppercase">{entry.deal.accountCode}</div>
      <div className="w-[80px] font-mono uppercase">{entry.deal.pair}</div>
      <div
        className={clsx(
          'w-[60px] font-mono font-medium',
          entry.deal.side === 'BUY' && 'text-green',
          entry.deal.side === 'SELL' && 'text-red',
          entry.deal.side === 'BOTH' && 'text-text-dim',
        )}
      >
        {entry.deal.side}
      </div>
      <div className="w-[120px] text-right font-mono tabular-nums">
        {entry.deal.notional.toLocaleString('en-US')}{' '}
        <span className="text-text-mute">{dealtCcyCode(entry.deal.pair, entry.deal.dealtCcy)}</span>
      </div>
      <div className="w-[60px] pl-2 font-mono text-xs uppercase">{entry.deal.tenor}</div>
      <div className={clsx('flex flex-1 min-w-[160px] items-center', OUTCOME_COLOR[entry.outcome])}>
        {entry.outcome}
      </div>
    </div>
  );
}

// FXSW-042 — mobile card-stack row. Two-line layout:
//   Row 1: [time] [amount + ccy] [pair]
//   Row 2: [client] · [outcome]
function HistoricCard({ entry }: { entry: HistoricEntry }) {
  return (
    <div
      data-deal-id={entry.deal.dealId}
      data-outcome={entry.outcome}
      className="flex w-full flex-col gap-1.5 rounded-md border border-border bg-bg-panel px-3 py-2 text-sm text-text-dim"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs tabular-nums">{formatTime(entry.archivedAt)}</span>
        <span className="font-mono tabular-nums">
          {entry.deal.notional.toLocaleString('en-US')}{' '}
          <span className="text-text-mute">{dealtCcyCode(entry.deal.pair, entry.deal.dealtCcy)}</span>
        </span>
        <span className="font-mono text-xs uppercase">{entry.deal.pair}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="truncate">{entry.deal.clientName}</span>
        <span className={clsx('ml-auto', OUTCOME_COLOR[entry.outcome])}>{entry.outcome}</span>
      </div>
    </div>
  );
}

export function HistoricBlotter() {
  const all = useHistoricDeals();
  const visible = all.slice(0, HISTORIC_CAP);
  const isMobile = useIsMobile();
  const useCards = isMobile;
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-border bg-bg-panel-2 px-4 py-2 text-xs font-medium uppercase tracking-tight text-text-mute">
        <span className="mr-3 font-sans">Historic Deals</span>
      </div>
      <div className="flex-1 overflow-auto">
        {useCards ? (
          <div
            data-testid="historic-blotter-body"
            className="flex flex-col gap-2 px-3 py-2"
          >
            {visible.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-text-mute">
                No historic deals yet.
              </div>
            ) : (
              visible.map((entry) => <HistoricCard key={entry.deal.dealId} entry={entry} />)
            )}
          </div>
        ) : (
          <div className="min-w-[920px]">
            <div className="sticky top-0 z-10 flex border-b border-border bg-bg-panel px-4 py-2 text-xs uppercase tracking-tight text-text-mute">
              {columns.map((col) => (
                <div key={col.key} className={col.width}>
                  {col.label}
                </div>
              ))}
            </div>
            <div data-testid="historic-blotter-body">
              {visible.length === 0 ? (
                <div className="flex h-32 items-center justify-center px-4 py-8 text-sm text-text-mute">
                  No historic deals yet.
                </div>
              ) : (
                visible.map((entry) => <Row key={entry.deal.dealId} entry={entry} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
