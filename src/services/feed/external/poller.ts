import type { MidMap, ExternalFeedStatus } from './types';
import { ProviderError } from './provider';

// Pure polling controller (FXSW-051). No DOM, no React — driven entirely by the
// injected `fetchMids`, so it is unit-testable with fake timers. Self-reschedules
// with setTimeout (not setInterval) so error backoff is straightforward.

export const DEFAULT_POLL_MS = 5 * 60_000; // 5 minutes
export const MAX_BACKOFF_MS = 30 * 60_000; // cap exponential backoff at 30 min

export type PollerOptions = {
  fetchMids: () => Promise<MidMap>;
  onResult: (mids: MidMap) => void;
  onStatus: (status: ExternalFeedStatus, detail?: string) => void;
  intervalMs?: number;
};

export type Poller = {
  start: () => void;
  stop: () => void;
};

export function createPoller(opts: PollerOptions): Poller {
  const pollMs = opts.intervalMs ?? DEFAULT_POLL_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = true;
  let backoff = pollMs;

  const schedule = (ms: number): void => {
    timer = setTimeout(() => void runOnce(), ms);
  };

  async function runOnce(): Promise<void> {
    if (stopped) return;
    opts.onStatus('connecting');
    try {
      const mids = await opts.fetchMids();
      if (stopped) return;
      opts.onResult(mids);
      opts.onStatus('live');
      backoff = pollMs; // recovered — reset cadence
      schedule(pollMs);
    } catch (err) {
      if (stopped) return;
      const rateLimited = err instanceof ProviderError && err.rateLimited;
      opts.onStatus(rateLimited ? 'rate-limited' : 'error', (err as Error).message);
      schedule(backoff);
      backoff = Math.min(backoff * 2, MAX_BACKOFF_MS);
    }
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      backoff = pollMs;
      void runOnce(); // immediate first poll
    },
    stop() {
      stopped = true;
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
