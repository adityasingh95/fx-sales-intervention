import { Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import Pill, { type PillColor } from '@/components/Pill';
import { externalFeed } from '@/services/feed/external/externalFeed';
import type { ExternalFeedStatus } from '@/services/feed/external/types';
import { useSettingsStore } from '@/state/stores/settingsStore';

// Generic status presentation — no vendor name appears anywhere user-visible
// (CLAUDE.md rule #2 still binds UI strings; the v3 exception covers adapter
// code only).
const STATUS_META: Record<ExternalFeedStatus, { color: PillColor; label: string }> = {
  off: { color: 'grey', label: 'Off' },
  connecting: { color: 'blue', label: 'Connecting' },
  live: { color: 'green', label: 'Live' },
  error: { color: 'red', label: 'Error' },
  'rate-limited': { color: 'amber', label: 'Rate limited' },
};

function useExternalFeedStatus(): ExternalFeedStatus {
  const [status, setStatus] = useState<ExternalFeedStatus>(() => externalFeed.getStatus());
  useEffect(() => externalFeed.subscribeStatus(setStatus), []);
  return status;
}

export default function ExternalFeedPanel() {
  const [open, setOpen] = useState(false);
  const status = useExternalFeedStatus();
  const apiKey = useSettingsStore((s) => s.externalFeedKey);
  const enabled = useSettingsStore((s) => s.externalFeedEnabled);
  const setApiKey = useSettingsStore((s) => s.setExternalFeedKey);
  const setEnabled = useSettingsStore((s) => s.setExternalFeedEnabled);
  const meta = STATUS_META[status];

  return (
    <div className="relative flex items-center gap-2">
      <span data-testid="external-feed-status" data-feed-status={status}>
        <Pill color={meta.color}>{meta.label}</Pill>
      </span>
      <button
        type="button"
        data-testid="external-feed-toggle"
        aria-label="Market data settings"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="rounded-sm p-1 text-text-dim transition-colors hover:text-text"
      >
        <Settings size={18} aria-hidden />
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Market data settings"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-sm border border-border bg-bg-panel p-3 shadow-xl"
        >
          <h2 className="mb-2 text-xs font-medium uppercase tracking-tight text-text-mute">
            Market data feed
          </h2>
          {/* FXSW-091 (T-2): the live feed (and its API-key entry) is confined to
              the dev server. The production build ships a restrictive CSP
              (`connect-src 'self'`) that would block the cross-origin poll, so the
              key is never collected in the shipped artefact — simulation only. */}
          {import.meta.env.DEV ? (
            <>
              <label className="mb-1 block text-xs text-text-dim" htmlFor="external-feed-key">
                API key
              </label>
              <input
                id="external-feed-key"
                data-testid="external-feed-key-input"
                type="password"
                value={apiKey ?? ''}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste API key"
                className="mb-3 w-full rounded-sm border border-border bg-bg-elevated px-2 py-1 font-mono text-xs text-text outline-none focus:border-border-focus"
              />
              <label className="flex items-center gap-2 text-xs text-text-dim">
                <input
                  type="checkbox"
                  data-testid="external-feed-enable"
                  checked={enabled}
                  disabled={!apiKey}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                Use live external prices
              </label>
              <p className="mt-2 text-[11px] leading-snug text-text-mute">
                Polls every 5 minutes and seeds the price engine. Key is kept for this session only.
              </p>
            </>
          ) : (
            <p data-testid="external-feed-sim-only" className="text-[11px] leading-snug text-text-mute">
              This build uses the simulated price feed. The live external feed is
              available in the development environment only.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
