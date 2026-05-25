import clsx from 'clsx';
import { formatTime } from '@/lib/format';
import { isHistoric, useActiveDeals, type DealEntry } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import AmountCell from './AmountCell';
import RateCell from './RateCell';
import ReasonsCell from './ReasonsCell';
import StatusCell from './StatusCell';
import { derivedStatus, type DisplayStatus } from './statusFromMachines';

const columns: Array<{ key: string; label: string; width: string }> = [
  { key: 'status', label: 'Status', width: 'w-[110px]' },
  { key: 'time', label: 'Time', width: 'w-[80px]' },
  { key: 'client', label: 'Client', width: 'w-[160px]' },
  { key: 'account', label: 'Account', width: 'w-[100px]' },
  { key: 'pair', label: 'CCY Pair', width: 'w-[80px]' },
  { key: 'side', label: 'Side', width: 'w-[60px]' },
  { key: 'amount', label: 'Amount', width: 'w-[120px]' },
  { key: 'tenor', label: 'Tenor', width: 'w-[60px]' },
  { key: 'rate', label: 'Rate', width: 'w-[120px]' },
  { key: 'reasons', label: 'Reasons', width: 'flex-1 min-w-[200px]' },
];

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
        'group flex w-full items-center border-b border-l-4 border-border bg-bg-app px-4 py-2 text-left text-sm transition-opacity duration-200 hover:bg-bg-row-hover',
        BAR_FOR[status],
        removing && 'opacity-60',
      )}
    >
      <div className="w-[110px]">
        <StatusCell status={status} />
      </div>
      <div className="w-[80px] font-mono text-xs tabular-nums text-text-dim">
        {formatTime(entry.deal.createdAt)}
      </div>
      <div className="w-[160px] text-text">{entry.deal.clientName}</div>
      <div className="w-[100px] font-mono text-xs uppercase text-text-dim">
        {entry.deal.accountCode}
      </div>
      <div className="w-[80px] font-mono uppercase text-text">{entry.deal.pair}</div>
      <div
        className={clsx(
          'w-[60px] font-mono font-medium',
          entry.deal.side === 'BUY' ? 'text-green' : 'text-red',
        )}
      >
        {entry.deal.side}
      </div>
      <div className="w-[120px] text-right">
        <AmountCell notional={entry.deal.notional} pair={entry.deal.pair} />
      </div>
      <div className="w-[60px] font-mono text-xs uppercase text-text-dim">
        {entry.deal.tenor}
      </div>
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
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-bg-panel-2 px-4 py-2 text-xs font-medium uppercase tracking-tight text-text-mute">
        <span className="mr-3 font-sans">Active Deals</span>
      </div>
      <div className="flex border-b border-border bg-bg-panel px-4 py-2 text-xs uppercase tracking-tight text-text-mute">
        {columns.map((col) => (
          <div key={col.key} className={col.width}>
            {col.label}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto" data-testid="active-blotter-body">
        {deals.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 py-8 text-sm text-text-mute">
            No active deals. Use the dev injector (top right) to start a scenario.
          </div>
        ) : (
          deals.map((entry) => <Row key={entry.deal.dealId} entry={entry} />)
        )}
      </div>
    </div>
  );
}
