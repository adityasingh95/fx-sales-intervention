import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getDevVersion } from '@/lib/devVersion';
import { useIsMobile } from '@/lib/useIsMobile';
import { dealFeed } from '@/services/feed/dealFeed';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import {
  V1_SCENARIO_IDS,
  V2_SCENARIO_IDS,
  type ScenarioId,
} from '@/types/scenario';

// Compact labels for the header chip-style buttons.
const LABEL: Record<ScenarioId, string> = {
  HAPPY_PATH_ESP: 'Happy ESP',
  OFF_HOURS_INTERVENTION: 'Off Hours',
  CREDIT_BREACH: 'Credit Breach',
  SIZE_LIMIT_MARGIN_TUNE: 'Size + AI',
  RELEASE_PATH: 'Hold/Release',
  BOTH_SIDED_INQUIRY: 'Both-Sided',
  QUOTE_DEALT_INQUIRY: 'Quote-Dealt',
};

function injectButtonClasses(): string {
  return 'shrink-0 whitespace-nowrap rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text';
}

export default function DevInjector() {
  const devVersion = getDevVersion();
  const isMobile = useIsMobile();
  const visibleScenarios: readonly ScenarioId[] =
    devVersion === 'v2' ? [...V1_SCENARIO_IDS, ...V2_SCENARIO_IDS] : V1_SCENARIO_IDS;

  const resetSession = (): void => {
    dealFeed.reset();
    for (const entry of useDealsStore.getState().deals.values()) {
      entry.actor.stop();
    }
    useDealsStore.setState({ deals: new Map(), historic: [] });
    useUiStore.setState({ openDealId: null });
  };

  if (isMobile) {
    return (
      <MobileDevInjector
        visibleScenarios={visibleScenarios}
        onReset={resetSession}
      />
    );
  }

  return (
    <div
      data-testid="dev-injector"
      className="flex w-max items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1"
    >
      <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-tight text-text-mute">
        Dev
      </span>
      {visibleScenarios.map((id) => (
        <button
          key={id}
          type="button"
          data-testid={`inject-${id}`}
          onClick={() => dealFeed.inject(id)}
          className={clsx(injectButtonClasses())}
        >
          {LABEL[id]}
        </button>
      ))}
      <button
        type="button"
        data-testid="inject-RESET"
        onClick={resetSession}
        className={clsx(injectButtonClasses(), 'border-red/30 text-red hover:border-red')}
      >
        Reset
      </button>
    </div>
  );
}

interface MobileDevInjectorProps {
  visibleScenarios: readonly ScenarioId[];
  onReset: () => void;
}

function MobileDevInjector({ visibleScenarios, onReset }: MobileDevInjectorProps) {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Menu uses `position: fixed` with viewport coords so it escapes any
  // ancestor with `overflow: hidden/auto` (the header slot clips on mobile).
  const handleToggle = (): void => {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
  };

  return (
    <div data-testid="dev-injector">
      <button
        ref={buttonRef}
        type="button"
        data-testid="dev-injector-toggle"
        onClick={handleToggle}
        className="flex items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Dev <ChevronDown size={12} aria-hidden />
      </button>
      {open && menuPos && (
        <>
          <div
            data-testid="dev-injector-backdrop"
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div
            data-testid="dev-injector-menu"
            role="menu"
            style={{ top: menuPos.top, left: menuPos.left }}
            className="fixed z-40 flex w-44 flex-col gap-1 rounded-sm border border-border bg-bg-panel p-2 shadow-xl"
          >
            {visibleScenarios.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`inject-${id}`}
                onClick={() => {
                  dealFeed.inject(id);
                  setOpen(false);
                }}
                className="w-full rounded-sm border border-border bg-bg-elevated px-2 py-1.5 text-left text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text"
              >
                {LABEL[id]}
              </button>
            ))}
            <button
              type="button"
              data-testid="inject-RESET"
              onClick={() => {
                onReset();
                setOpen(false);
              }}
              className="w-full rounded-sm border border-red/30 bg-bg-elevated px-2 py-1.5 text-left text-xs font-medium text-red transition-colors hover:border-red"
            >
              Reset
            </button>
          </div>
        </>
      )}
    </div>
  );
}
