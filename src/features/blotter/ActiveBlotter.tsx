import Chip from '@/components/Chip';
import Pill from '@/components/Pill';

const columns = [
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

// Hardcoded row exercising every visible token (status pill, mono amount,
// monospace rate, side colour, reasons chip, dim text, borders, spacing).
// Replaced by live data in FXSW-012.
export function ActiveBlotter() {
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
      <div className="flex-1 overflow-auto">
        <div
          data-testid="blotter-row-demo"
          className="group flex items-center border-l-4 border-l-amber border-b border-border bg-bg-app px-4 py-2 text-sm transition-colors hover:bg-bg-row-hover"
        >
          <div className="w-[110px]">
            <Pill color="amber">Intervene</Pill>
          </div>
          <div className="w-[80px] font-mono text-xs tabular-nums text-text-dim">
            14:23:08
          </div>
          <div className="w-[160px] text-text">Apex Capital</div>
          <div className="w-[100px] font-mono text-xs uppercase text-text-dim">
            APX-001
          </div>
          <div className="w-[80px] font-mono uppercase text-text">EURUSD</div>
          <div className="w-[60px] font-mono font-medium text-green">BUY</div>
          <div className="w-[120px] text-right font-mono tabular-nums text-text">
            12,500,000{' '}
            <span className="text-text-mute">EUR</span>
          </div>
          <div className="w-[60px] font-mono text-xs uppercase text-text-dim">
            SPOT
          </div>
          <div className="w-[120px] font-mono tabular-nums text-text">
            1.0786
          </div>
          <div className="flex flex-1 min-w-[200px] items-center gap-2">
            <Chip>Size &gt; auto-pricer band</Chip>
            <Chip>Client tier: Gold</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}
