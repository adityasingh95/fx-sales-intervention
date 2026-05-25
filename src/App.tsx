import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActiveBlotter } from '@/features/blotter/ActiveBlotter';
import { HistoricBlotter } from '@/features/blotter/HistoricBlotter';

function formatClock(d: Date): string {
  return d.toLocaleTimeString('en-GB', { hour12: false });
}

function useSessionClock(): string {
  const [time, setTime] = useState(() => formatClock(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);
  return time;
}

function isDevMode(): boolean {
  return new URLSearchParams(window.location.search).has('dev');
}

export default function App() {
  const clock = useSessionClock();
  const dev = isDevMode();

  return (
    <div className="flex min-h-screen flex-col bg-bg-app text-text">
      <div
        aria-hidden
        className="h-[2px] bg-gradient-to-r from-blue to-ai-accent"
      />
      <header className="flex h-14 items-center justify-between border-b border-border bg-bg-panel px-4">
        <h1 className="font-sans text-md font-medium tracking-tight text-text">
          FX Sales Workstation
        </h1>
        <div className="flex items-center gap-4 text-text-dim">
          {dev && (
            <div
              data-testid="dev-injector-slot"
              className="rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs text-text-dim"
            >
              Dev injector
            </div>
          )}
          <button
            type="button"
            aria-label="Toggle mute"
            className="rounded-sm p-1 text-text-dim transition-colors hover:text-text"
          >
            <Volume2 size={18} aria-hidden />
          </button>
          <time
            aria-label="Session clock"
            className="font-mono text-sm tabular-nums text-text-dim"
          >
            {clock}
          </time>
        </div>
      </header>
      <main className="flex flex-1 flex-col overflow-hidden">
        <section className="basis-[55%] overflow-hidden border-b border-border">
          <ActiveBlotter />
        </section>
        <section className="basis-[45%] overflow-hidden">
          <HistoricBlotter />
        </section>
      </main>
    </div>
  );
}
