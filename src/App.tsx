import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import ResizeHandle from '@/components/ResizeHandle';
import { ActiveBlotter } from '@/features/blotter/ActiveBlotter';
import { HistoricBlotter } from '@/features/blotter/HistoricBlotter';
import DevInjector from '@/features/dev-injector/DevInjector';
import MuteToggle from '@/features/notifications/MuteToggle';
import ThemeToggle from '@/features/notifications/ThemeToggle';
import ToastStack from '@/features/notifications/ToastStack';
import { useNotificationSound } from '@/features/notifications/useNotificationSound';
import TicketPanel from '@/features/ticket/TicketPanel';
import { getDevVersion } from '@/lib/devVersion';
import { useSettingsStore } from '@/state/stores/settingsStore';
import { useUiStore } from '@/state/stores/uiStore';

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
  const ticketOpen = useUiStore((s) => s.openDealId !== null);
  const devVersion = getDevVersion();
  // FXSW-029: hook drives the WebAudio chime + autoplay-unlock listener
  // for the lifetime of the app. No-op output; side-effects only.
  useNotificationSound();

  const isV2 = devVersion === 'v2';
  const blotterSplit = useSettingsStore((s) => s.blotterSplit);
  const setBlotterSplit = useSettingsStore((s) => s.setBlotterSplit);

  const mainRef = useRef<HTMLElement | null>(null);

  // v1 uses static percentage basis; v2 switches to grow-weighted flex
  // below so the resize handle's split takes effect (percentage flex-basis
  // doesn't resolve under a stretched parent in column flex layouts).
  const activeBasis = '55%';
  const historicBasis = '45%';

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
            className="min-w-0 flex-1 overflow-visible sm:overflow-x-auto"
          >
            <DevInjector />
          </div>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-3 text-text-dim sm:gap-4">
          <ThemeToggle />
          <MuteToggle />
          <time
            aria-label="Session clock"
            className="font-mono text-xs tabular-nums text-text-dim sm:text-sm"
          >
            {clock}
          </time>
        </div>
      </header>
      <main
        ref={mainRef}
        className={clsx(
          'flex flex-1 flex-col overflow-hidden transition-opacity duration-[240ms]',
          ticketOpen && 'opacity-75',
        )}
      >
        <section
          className={clsx(
            'min-h-0 overflow-hidden',
            !isV2 && 'border-b border-border',
          )}
          style={
            isV2
              ? { flex: `${blotterSplit} 1 0` }
              : { flexBasis: activeBasis }
          }
        >
          <ActiveBlotter />
        </section>
        {isV2 && (
          <ResizeHandle
            split={blotterSplit}
            onSplitChange={setBlotterSplit}
            containerRef={mainRef}
          />
        )}
        <section
          className="min-h-0 overflow-hidden"
          style={
            isV2
              ? { flex: `${100 - blotterSplit} 1 0` }
              : { flexBasis: historicBasis }
          }
        >
          <HistoricBlotter />
        </section>
      </main>
      <TicketPanel />
      <ToastStack />
    </div>
  );
}
