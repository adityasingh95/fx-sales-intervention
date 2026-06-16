import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { isV3, isV4 } from '@/lib/devVersion';
import { useIsMobile } from '@/lib/useIsMobile';
import { dealFeed } from '@/services/feed/dealFeed';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import { TENORS, type Tenor } from '@/types/deal';
import { SCENARIO_IDS, type ScenarioId, type ScenarioOverrides } from '@/types/scenario';

// Injectable instruments (v4). `AUTO` derives SPOT/OUTRIGHT from the tenor (the
// v3 behaviour); `NDF` is the Phase 10 instrument and forces a forward tenor.
// SWAP is added when Phase 11 lands its pricing UI.
type InjectInstrument = 'AUTO' | 'NDF';
const INJECT_INSTRUMENTS: readonly InjectInstrument[] = ['AUTO', 'NDF'];
const INSTRUMENT_LABEL: Record<InjectInstrument, string> = {
  AUTO: 'Auto',
  NDF: 'NDF',
};

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
  const isMobile = useIsMobile();
  const visibleScenarios: readonly ScenarioId[] = SCENARIO_IDS;
  // FXSW-059: v3 only — inject any scenario as a forward by overriding the
  // tenor at inject time. SPOT (default) keeps the bare-URL behaviour.
  const showForwardSelect = isV3();
  // FXSW-078: v4 only — inject any scenario as a specific instrument (NDF now).
  const showInstrumentSelect = isV4();
  const [tenor, setTenor] = useState<Tenor>('SPOT');
  const [instrument, setInstrument] = useState<InjectInstrument>('AUTO');
  const injectScenario = (id: ScenarioId): void => {
    const overrides: ScenarioOverrides = {};
    if (tenor !== 'SPOT') overrides.tenor = tenor;
    if (instrument !== 'AUTO') overrides.instrumentType = instrument;
    const hasOverride = overrides.tenor !== undefined || overrides.instrumentType !== undefined;
    dealFeed.inject(id, hasOverride ? overrides : undefined);
  };

  const resetSession = (): void => {
    dealFeed.reset();
    for (const entry of useDealsStore.getState().deals.values()) {
      entry.actor.stop();
    }
    useDealsStore.setState({ deals: new Map(), historic: [] });
    useUiStore.setState({ openDealId: null, openHistoricId: null });
  };

  if (isMobile) {
    return (
      <MobileDevInjector
        visibleScenarios={visibleScenarios}
        onInject={injectScenario}
        onReset={resetSession}
        tenor={tenor}
        onTenorChange={setTenor}
        showForwardSelect={showForwardSelect}
        instrument={instrument}
        onInstrumentChange={setInstrument}
        showInstrumentSelect={showInstrumentSelect}
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
      {showForwardSelect && (
        <TenorSelect tenor={tenor} onChange={setTenor} />
      )}
      {showInstrumentSelect && (
        <InstrumentSelect instrument={instrument} onChange={setInstrument} />
      )}
      {visibleScenarios.map((id) => (
        <button
          key={id}
          type="button"
          data-testid={`inject-${id}`}
          onClick={() => injectScenario(id)}
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

interface TenorSelectProps {
  tenor: Tenor;
  onChange: (t: Tenor) => void;
}

function TenorSelect({ tenor, onChange }: TenorSelectProps) {
  return (
    <select
      data-testid="forward-tenor-select"
      aria-label="Injection tenor"
      value={tenor}
      onChange={(e) => onChange(e.target.value as Tenor)}
      className="shrink-0 rounded-sm border border-border bg-bg-elevated px-1 py-1 text-xs font-medium text-text-dim hover:border-blue/60 hover:text-text"
    >
      {TENORS.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
    </select>
  );
}

interface InstrumentSelectProps {
  instrument: InjectInstrument;
  onChange: (i: InjectInstrument) => void;
}

function InstrumentSelect({ instrument, onChange }: InstrumentSelectProps) {
  return (
    <select
      data-testid="inject-instrument"
      aria-label="Injection instrument"
      value={instrument}
      onChange={(e) => onChange(e.target.value as InjectInstrument)}
      className="shrink-0 rounded-sm border border-border bg-bg-elevated px-1 py-1 text-xs font-medium text-text-dim hover:border-blue/60 hover:text-text"
    >
      {INJECT_INSTRUMENTS.map((i) => (
        <option key={i} value={i}>
          {INSTRUMENT_LABEL[i]}
        </option>
      ))}
    </select>
  );
}

interface MobileDevInjectorProps {
  visibleScenarios: readonly ScenarioId[];
  onInject: (id: ScenarioId) => void;
  onReset: () => void;
  tenor: Tenor;
  onTenorChange: (t: Tenor) => void;
  showForwardSelect: boolean;
  instrument: InjectInstrument;
  onInstrumentChange: (i: InjectInstrument) => void;
  showInstrumentSelect: boolean;
}

function MobileDevInjector({
  visibleScenarios,
  onInject,
  onReset,
  tenor,
  onTenorChange,
  showForwardSelect,
  instrument,
  onInstrumentChange,
  showInstrumentSelect,
}: MobileDevInjectorProps) {
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
            {showForwardSelect && (
              <TenorSelect tenor={tenor} onChange={onTenorChange} />
            )}
            {showInstrumentSelect && (
              <InstrumentSelect instrument={instrument} onChange={onInstrumentChange} />
            )}
            {visibleScenarios.map((id) => (
              <button
                key={id}
                type="button"
                data-testid={`inject-${id}`}
                onClick={() => {
                  onInject(id);
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
