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
import ExternalFeedPanel from '@/features/settings/ExternalFeedPanel';
import HistoricDetailPanel from '@/features/ticket/HistoricDetailPanel';
import TicketPanel from '@/features/ticket/TicketPanel';
import { isV3 } from '@/lib/devVersion';
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

export default function App() {
  const clock = useSessionClock();
  const ticketOpen = useUiStore((s) => s.openDealId !== null);
  // FXSW-029: hook drives the WebAudio chime + autoplay-unlock listener
  // for the lifetime of the app. No-op output; side-effects only.
  useNotificationSound();

  const blotterSplit = useSettingsStore((s) => s.blotterSplit);
  const setBlotterSplit = useSettingsStore((s) => s.setBlotterSplit);

  const mainRef = useRef<HTMLElement | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-bg-app text-text">
      {/* Liquid Glass top accent bar -- iOS blue in light mode, blue-to-ai in dark */}
      <div
        aria-hidden
        className="h-[2px] bg-gradient-to-r from-blue to-blue/20"
      />
      {/* Glass header with specular highlight and backdrop vibrancy */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-bg-glass px-3 backdrop-blur-xl backdrop-saturate-[180%] shadow-[0_1px_0_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] sm:px-4">
        <h1 className="shrink-0 whitespace-nowrap font-sans text-sm font-medium tracking-tight text-text sm:text-md">
          FX Sales Workstation
        </h1>
        <div
          data-testid="dev-injector-slot"
          className="min-w-0 flex-1 overflow-visible sm:overflow-x-auto"
        >
          <DevInjector />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3 text-text-dim sm:gap-4">
          {isV3() && <ExternalFeedPanel />}
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
          'flex flex-1 flex-col overflow-hidden transition-[opacity,filter] duration-[280ms]',
          ticketOpen && 'opacity-60 blur-[1px]',
        )}
      >
        <section
          className="m-2 mb-1 min-h-0 overflow-hidden rounded-2xl bg-bg-glass shadow-panel backdrop-blur-2xl backdrop-saturate-[200%]"
          style={{ flex: `${blotterSplit} 1 0` }}
        >
          <ActiveBlotter />
        </section>
        <ResizeHandle
          split={blotterSplit}
          onSplitChange={setBlotterSplit}
          containerRef={mainRef}
        />
        <section
          className="m-2 mt-1 min-h-0 overflow-hidden rounded-2xl bg-bg-glass shadow-panel backdrop-blur-2xl backdrop-saturate-[200%]"
          style={{ flex: `${100 - blotterSplit} 1 0` }}
        >
          <HistoricBlotter />
        </section>
      </main>
      <TicketPanel />
      {isV3() && <HistoricDetailPanel />}
      <ToastStack />
    </div>
  );
}
