import clsx from 'clsx';
import { dealtCcyCode, formatTime } from '@/lib/format';
import { isV3, isV4 } from '@/lib/devVersion';
import { valueDateLabel } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';
import { instrumentOf } from '@/types/deal';
import { useHistoricDeals, type HistoricEntry, type HistoricOutcome } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';

// Cap per docs/02 §3 Capacity — keep the rendered slice bounded.
const HISTORIC_CAP = 100;

// FXSW-066: Request ID / Trade ID / Value date columns are v3-only; GA layout
// is unchanged.
const v3Cols = isV3();
// FXSW-080: instrument column is v4-only; GA + v3 layouts are unchanged.
const v4Cols = isV4();

const columns: Array<{ key: string; label: string; width: string }> = [
  { key: 'time', label: 'Time', width: 'w-[80px]' },
  ...(v3Cols ? [{ key: 'requestId', label: 'Request ID', width: 'w-[120px]' }] : []),
  ...(v3Cols ? [{ key: 'tradeId', label: 'Trade ID', width: 'w-[120px]' }] : []),
  { key: 'client', label: 'Client', width: 'w-[160px]' },
  { key: 'account', label: 'Account', width: 'w-[100px]' },
  { key: 'pair', label: 'CCY Pair', width: 'w-[80px]' },
  { key: 'side', label: 'Side', width: 'w-[60px]' },
  { key: 'amount', label: 'Amount', width: 'w-[120px]' },
  { key: 'tenor', label: 'Tenor', width: 'w-[60px]' },
  ...(v4Cols ? [{ key: 'instrument', label: 'Instrument', width: 'w-[90px]' }] : []),
  ...(v3Cols ? [{ key: 'valueDate', label: 'Value Date', width: 'w-[100px]' }] : []),
  { key: 'outcome', label: 'Outcome', width: 'flex-1 min-w-[160px]' },
];

const valueDateFor = (entry: HistoricEntry): string => valueDateLabel(entry.deal);

const OUTCOME_COLOR: Record<HistoricOutcome, string> = {
  Executed: 'text-green',
  'Rejected by Trader': 'text-red',
  'Rejected by Client': 'text-red',
  Expired: 'text-text-dim',
  Cancelled: 'text-text-dim',
};

function Row({ entry, onOpen }: { entry: HistoricEntry; onOpen?: () => void }) {
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      data-deal-id={entry.deal.dealId}
      data-outcome={entry.outcome}
      onClick={onOpen}
      className={clsx(
        'flex w-full items-center border-b border-border bg-bg-app px-4 py-2 text-left text-sm text-text-dim',
        onOpen && 'transition-colors hover:bg-bg-row-hover',
      )}
    >
      <div className="w-[80px] font-mono text-xs tabular-nums">{formatTime(entry.archivedAt)}</div>
      {v3Cols && (
        <div className="w-[120px] font-mono text-xs uppercase">{entry.requestId}</div>
      )}
      {v3Cols && (
        <div className="w-[120px] font-mono text-xs uppercase">{entry.tradeId ?? '—'}</div>
      )}
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
      {v4Cols && (
        <div data-testid="deal-instrument" className="w-[90px] font-mono text-xs uppercase">
          {instrumentOf(entry.deal)}
        </div>
      )}
      {v3Cols && (
        <div className="w-[100px] font-mono text-xs tabular-nums">{valueDateFor(entry)}</div>
      )}
      <div className={clsx('flex flex-1 min-w-[160px] items-center', OUTCOME_COLOR[entry.outcome])}>
        {entry.outcome}
      </div>
    </Tag>
  );
}

// FXSW-042 — mobile card-stack row. Two-line layout:
//   Row 1: [time] [amount + ccy] [pair]
//   Row 2: [client] · [outcome]
function HistoricCard({ entry, onOpen }: { entry: HistoricEntry; onOpen?: () => void }) {
  const Tag = onOpen ? 'button' : 'div';
  return (
    <Tag
      type={onOpen ? 'button' : undefined}
      data-deal-id={entry.deal.dealId}
      data-outcome={entry.outcome}
      onClick={onOpen}
      className={clsx(
        'flex w-full flex-col gap-1.5 rounded-md border border-border bg-bg-panel px-3 py-2 text-left text-sm text-text-dim',
        onOpen && 'transition-colors hover:bg-bg-row-hover',
      )}
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
      {v3Cols && (
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase text-text-mute">
          <span>{entry.tradeId ?? entry.requestId}</span>
          <span>Val {valueDateFor(entry)}</span>
        </div>
      )}
    </Tag>
  );
}

export function HistoricBlotter() {
  const all = useHistoricDeals();
  const visible = all.slice(0, HISTORIC_CAP);
  const isMobile = useIsMobile();
  const useCards = isMobile;
  // FXSW-060: under v3, rows open the read-only detail overlay. On the bare
  // GA URL they stay non-interactive <div>s.
  const clickable = isV3();
  const openHistoric = useUiStore((s) => s.openHistoric);
  const onOpenFor = (id: string): (() => void) | undefined =>
    clickable ? () => openHistoric(id) : undefined;
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-border bg-bg-glass/60 px-4 py-2 text-xs font-medium uppercase tracking-widest text-text-mute backdrop-blur-sm shadow-[inset_0_-1px_0_rgba(210,255,228,0.04)]">
        <span className="mr-3 font-mono">Historic Deals</span>
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
              visible.map((entry) => (
                <HistoricCard
                  key={entry.deal.dealId}
                  entry={entry}
                  onOpen={onOpenFor(entry.deal.dealId)}
                />
              ))
            )}
          </div>
        ) : (
          <div className={v4Cols ? 'min-w-[1350px]' : v3Cols ? 'min-w-[1260px]' : 'min-w-[920px]'}>
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
                visible.map((entry) => (
                  <Row key={entry.deal.dealId} entry={entry} onOpen={onOpenFor(entry.deal.dealId)} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
