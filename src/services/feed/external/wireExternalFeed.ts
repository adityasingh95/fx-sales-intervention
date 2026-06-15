import { useSettingsStore } from '@/state/stores/settingsStore';
import { externalFeed } from './externalFeed';

// Bridges the settings store to the external-feed service (FXSW-052). Kept out
// of the store itself to avoid a store→service import cycle. Driven by the
// session-only key/enabled flags; both default OFF, so calling this on a fresh
// session is a no-op and the simulated feed is untouched.
export function wireExternalFeed(): () => void {
  let applied: { enabled: boolean; key: string | null } = { enabled: false, key: null };

  const apply = (enabled: boolean, key: string | null): void => {
    if (enabled === applied.enabled && key === applied.key) return;
    applied = { enabled, key };
    if (enabled && key) externalFeed.enable(key);
    else externalFeed.disable();
  };

  const initial = useSettingsStore.getState();
  apply(initial.externalFeedEnabled, initial.externalFeedKey);

  return useSettingsStore.subscribe((state) =>
    apply(state.externalFeedEnabled, state.externalFeedKey),
  );
}
