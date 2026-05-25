export function HistoricBlotter() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border bg-bg-panel-2 px-4 py-2 text-xs font-medium uppercase tracking-tight text-text-mute">
        <span className="mr-3 font-sans">Historic Deals</span>
      </div>
      <div className="flex flex-1 items-center justify-center text-sm text-text-mute">
        No historic deals yet.
      </div>
    </div>
  );
}
