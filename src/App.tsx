import { Volume2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ActiveBlotter } from '@/features/blotter/ActiveBlotter';
import { HistoricBlotter } from '@/features/blotter/HistoricBlotter';
import DevInjector from '@/features/dev-injector/DevInjector';

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
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg-panel px-3 sm:px-4">
        <h1 className="shrink-0 whitespace-nowrap font-sans text-sm font-medium tracking-tight text-text sm:text-md">
          FX Sales Workstation
        </h1>
        {dev && (
          <div
            data-testid="dev-injector-slot"
            className="min-w-0 flex-1 overflow-x-auto"
          >
            <DevInjector />
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-text-dim sm:gap-4">
          <button
            type="button"
            aria-label="Toggle mute"
            className="rounded-sm p-1 text-text-dim transition-colors hover:text-text"
          >
            <Volume2 size={18} aria-hidden />
          </button>
          <time
            aria-label="Session clock"
            className="font-mono text-xs tabular-nums text-text-dim sm:text-sm"
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
