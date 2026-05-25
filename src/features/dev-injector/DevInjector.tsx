import clsx from 'clsx';
import { dealFeed } from '@/services/feed/dealFeed';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useUiStore } from '@/state/stores/uiStore';
import { SCENARIO_IDS, type ScenarioId } from '@/types/scenario';

// Compact labels for the header chip-style buttons. Long enough to know
// which scenario, short enough to fit in the header strip.
const LABEL: Record<ScenarioId, string> = {
  HAPPY_PATH_ESP: 'Happy ESP',
  OFF_HOURS_INTERVENTION: 'Off Hours',
  CREDIT_BREACH: 'Credit Breach',
  SIZE_LIMIT_MARGIN_TUNE: 'Size + AI',
  RELEASE_PATH: 'Release',
};

function injectButtonClasses(): string {
  return 'shrink-0 whitespace-nowrap rounded-sm border border-border bg-bg-elevated px-2 py-1 text-xs font-medium text-text-dim transition-colors hover:border-blue/60 hover:text-text';
}

export default function DevInjector() {
  const resetSession = (): void => {
    dealFeed.reset();
    for (const entry of useDealsStore.getState().deals.values()) {
      entry.actor.stop();
    }
    useDealsStore.setState({ deals: new Map(), historic: [] });
    useUiStore.setState({ openDealId: null });
  };

  return (
    <div
      data-testid="dev-injector"
      className="flex w-max items-center gap-1 rounded-sm border border-border bg-bg-elevated px-2 py-1"
    >
      <span className="mr-1 shrink-0 text-[10px] font-medium uppercase tracking-tight text-text-mute">
        Dev
      </span>
      {SCENARIO_IDS.map((id) => (
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
