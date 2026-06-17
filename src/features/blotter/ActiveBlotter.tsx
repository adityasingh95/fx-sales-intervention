import clsx from 'clsx';
import { isV3, isV4 } from '@/lib/devVersion';
import { formatTime } from '@/lib/format';
import { valueDateLabel } from '@/lib/time';
import { useIsMobile } from '@/lib/useIsMobile';
import { instrumentOf } from '@/types/deal';
import { isHistoric, useActiveDeals, type DealEntry } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import AmountCell from './AmountCell';
import RateCell from './RateCell';
import ReasonsCell from './ReasonsCell';
import StatusCell from './StatusCell';
import { derivedStatus, type DisplayStatus } from './statusFromMachines';

// FXSW-066: Request ID + Value date columns are v3-only; the GA layout is
// unchanged.
const v3Cols = isV3();
// FXSW-080: instrument column is v4-only; GA + v3 layouts are unchanged.
const v4Cols = isV4();

const columns: Array<{ key: string; label: string; width: string }> = [
  { key: 'status', label: 'Status', width: 'w-[110px]' },
  { key: 'time', label: 'Time', width: 'w-[80px]' },
  ...(v3Cols ? [{ key: 'requestId', label: 'Request ID', width: 'w-[120px]' }] : []),
  { key: 'client', label: 'Client', width: 'w-[160px]' },
  { key: 'account', label: 'Account', width: 'w-[100px]' },
  { key: 'pair', label: 'CCY Pair', width: 'w-[80px]' },
  { key: 'side', label: 'Side', width: 'w-[60px]' },
  { key: 'amount', label: 'Amount', width: 'w-[120px]' },
  { key: 'tenor', label: 'Tenor', width: 'w-[60px]' },
  ...(v4Cols ? [{ key: 'instrument', label: 'Instrument', width: 'w-[90px]' }] : []),
  ...(v3Cols ? [{ key: 'valueDate', label: 'Value Date', width: 'w-[100px]' }] : []),
  { key: 'rate', label: 'Rate', width: 'w-[120px]' },
  { key: 'reasons', label: 'Reasons', width: 'flex-1 min-w-[200px]' },
];

const valueDateFor = (entry: DealEntry): string => valueDateLabel(entry.deal);

// Left-edge bar color per docs/02 §2 row treatment.
const BAR_FOR: Record<DisplayStatus, string> = {
  INTERVENE: 'border-l-amber',
  'PICKING UP': 'border-l-blue',
  'PICKED UP': 'border-l-blue',
  STREAMING: 'border-l-teal',
  WITHDRAWING: 'border-l-teal',
  RELEASING: 'border-l-amber',
  REJECTING: 'border-l-red',
  AUTO: 'border-l-transparent',
  DONE: 'border-l-green',
  REJECTED: 'border-l-red',
  DECLINED: 'border-l-red',
  EXPIRED: 'border-l-grey-700',
};

function Row({ entry }: { entry: DealEntry }) {
  const status = derivedStatus(entry.rfsState, entry.siState, entry.dealable);
  const openTicket = useUiStore((s) => s.openTicket);
  const removing = isHistoric(entry.siState);
  // FXSW-028 — amber row flash on mount for new SI deals. Plays once per
  // mount via a CSS keyframe; no JS timer needed because the keyframe
  // animation has `forwards` fill-mode and a fixed 300ms duration.
  const flashOnMount = !removing && entry.siState === 'Initial' && entry.dealable;
  return (
    <button
      type="button"
      onClick={() => openTicket(entry.deal.dealId)}
      data-deal-id={entry.deal.dealId}
      data-si-state={entry.siState}
      data-rfs-state={entry.rfsState}
      data-display-status={status}
      data-dealable={entry.dealable ? 'true' : 'false'}
      data-removing={removing ? 'true' : 'false'}
      data-row-flash={flashOnMount ? 'new' : undefined}
      className={clsx(
        'group flex w-full items-center border-b border-l-4 border-border bg-bg-app px-4 py-2 text-left text-sm transition-opacity duration-200 hover:bg-bg-row-hover',
        BAR_FOR[status],
        flashOnMount && 'animate-row-flash',
        removing && 'opacity-60',
      )}
    >
      <div className="w-[110px]">
        <StatusCell status={status} />
      </div>
      <div className="w-[80px] font-mono text-xs tabular-nums text-text-dim">
        {formatTime(entry.deal.createdAt)}
      </div>
      {v3Cols && (
        <div className="w-[120px] font-mono text-xs uppercase text-text-dim">
          {entry.requestId}
        </div>
      )}
      <div className="w-[160px] text-text">{entry.deal.clientName}</div>
      <div className="w-[100px] font-mono text-xs uppercase text-text-dim">
        {entry.deal.accountCode}
      </div>
      <div className="w-[80px] font-mono uppercase text-text">{entry.deal.pair}</div>
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
      <div className="w-[120px] text-right">
        <AmountCell
          notional={entry.deal.notional}
          pair={entry.deal.pair}
          dealtCcy={entry.deal.dealtCcy}
        />
      </div>
      <div className="w-[60px] pl-2 font-mono text-xs uppercase text-text-dim">
        {entry.deal.tenor}
      </div>
      {v4Cols && (
        <div
          data-testid="deal-instrument"
          className="w-[90px] font-mono text-xs uppercase text-text-dim"
        >
          {instrumentOf(entry.deal)}
        </div>
      )}
      {v3Cols && (
        <div className="w-[100px] font-mono text-xs tabular-nums text-text-dim">
          {valueDateFor(entry)}
        </div>
      )}
      <div className="w-[120px]">
        <RateCell pair={entry.deal.pair} />
      </div>
      <div className="flex flex-1 min-w-[200px] items-center">
        <ReasonsCell reasons={entry.rejectionReasons} />
      </div>
    </button>
  );
}

export function ActiveBlotter() {
  const deals = useActiveDeals();
  const isMobile = useIsMobile();
  const useCards = isMobile;
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center border-b border-border bg-bg-panel-2 px-4 py-2 text-xs font-medium uppercase tracking-tight text-text-mute">
        <span className="mr-3 font-sans">Active Deals</span>
      </div>
      <div className="flex-1 overflow-auto">
        {useCards ? (
          <div
            data-testid="active-blotter-body"
            className="flex flex-col gap-2 px-3 py-2"
          >
            {deals.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-text-mute">
                No active deals. Use the dev injector to start a scenario.
              </div>
            ) : (
              deals.map((entry) => <ActiveCard key={entry.deal.dealId} entry={entry} />)
            )}
          </div>
        ) : (
          <div className={v4Cols ? 'min-w-[1410px]' : v3Cols ? 'min-w-[1320px]' : 'min-w-[1100px]'}>
            <div className="sticky top-0 z-10 flex border-b border-border bg-bg-panel px-4 py-2 text-xs uppercase tracking-tight text-text-mute">
              {columns.map((col) => (
                <div key={col.key} className={col.width}>
                  {col.label}
                </div>
              ))}
            </div>
            <div data-testid="active-blotter-body">
              {deals.length === 0 ? (
                <div className="flex h-32 items-center justify-center px-4 py-8 text-sm text-text-mute">
                  No active deals. Use the dev injector (top right) to start a scenario.
                </div>
              ) : (
                deals.map((entry) => <Row key={entry.deal.dealId} entry={entry} />)
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// FXSW-042 — mobile card-stack row. Two-line layout:
//   Row 1: [status pill] [amount + ccy] [pair]
//   Row 2: [client] · [side] · [reasons chips]
// Tap opens the ticket (same handler as the desktop row).
function ActiveCard({ entry }: { entry: DealEntry }) {
  const status = derivedStatus(entry.rfsState, entry.siState, entry.dealable);
  const openTicket = useUiStore((s) => s.openTicket);
  const removing = isHistoric(entry.siState);
  return (
    <button
      type="button"
      onClick={() => openTicket(entry.deal.dealId)}
      data-deal-id={entry.deal.dealId}
      data-si-state={entry.siState}
      data-rfs-state={entry.rfsState}
      data-display-status={status}
      data-dealable={entry.dealable ? 'true' : 'false'}
      data-removing={removing ? 'true' : 'false'}
      className={clsx(
        'flex w-full flex-col gap-1.5 rounded-md border border-l-4 border-border bg-bg-panel px-3 py-2 text-left transition-opacity hover:bg-bg-row-hover',
        BAR_FOR[status],
        removing && 'opacity-60',
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm">
        <StatusCell status={status} />
        <span className="font-mono tabular-nums text-text">
          <AmountCell
            notional={entry.deal.notional}
            pair={entry.deal.pair}
            dealtCcy={entry.deal.dealtCcy}
          />
        </span>
        <span className="font-mono text-xs uppercase text-text-dim">{entry.deal.pair}</span>
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className="truncate text-text">{entry.deal.clientName}</span>
        <span
          className={clsx(
            'font-mono font-medium',
            entry.deal.side === 'BUY' && 'text-green',
            entry.deal.side === 'SELL' && 'text-red',
            entry.deal.side === 'BOTH' && 'text-text-dim',
          )}
        >
          {entry.deal.side}
        </span>
        <span className="flex flex-1 justify-end overflow-hidden">
          <ReasonsCell reasons={entry.rejectionReasons} />
        </span>
      </div>
      {v3Cols && (
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase text-text-mute">
          <span>{entry.requestId}</span>
          <span>Val {valueDateFor(entry)}</span>
        </div>
      )}
    </button>
  );
}
