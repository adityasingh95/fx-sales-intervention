import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPoller, DEFAULT_POLL_MS } from './poller';
import { ProviderError } from './provider';
import type { ExternalFeedStatus, MidMap } from './types';

describe('createPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('polls immediately on start, then every interval', async () => {
    const fetchMids = vi.fn<() => Promise<MidMap>>().mockResolvedValue({ EURUSD: 1.1 });
    const onResult = vi.fn();
    const onStatus = vi.fn<(status: ExternalFeedStatus) => void>();
    const poller = createPoller({ fetchMids, onResult, onStatus, intervalMs: 1000 });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMids).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({ EURUSD: 1.1 });
    expect(onStatus).toHaveBeenLastCalledWith('live');

    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMids).toHaveBeenCalledTimes(2);
    poller.stop();
  });

  it('stop() halts further polling', async () => {
    const fetchMids = vi.fn<() => Promise<MidMap>>().mockResolvedValue({});
    const poller = createPoller({
      fetchMids,
      onResult: vi.fn(),
      onStatus: vi.fn(),
      intervalMs: 1000,
    });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    poller.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(fetchMids).toHaveBeenCalledTimes(1);
  });

  it('reports rate-limited status and backs off exponentially', async () => {
    const fetchMids = vi
      .fn<() => Promise<MidMap>>()
      .mockRejectedValue(new ProviderError('429', true));
    const onStatus = vi.fn<(status: ExternalFeedStatus) => void>();
    const poller = createPoller({ fetchMids, onResult: vi.fn(), onStatus, intervalMs: 1000 });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith('rate-limited', '429');
    expect(fetchMids).toHaveBeenCalledTimes(1);

    // First retry after the base interval; second after 2× (backoff doubled).
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMids).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMids).toHaveBeenCalledTimes(2); // not yet — needs 2000ms
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetchMids).toHaveBeenCalledTimes(3);
    poller.stop();
  });

  it('reports generic error status on non-rate-limit failures', async () => {
    const fetchMids = vi.fn<() => Promise<MidMap>>().mockRejectedValue(new Error('network'));
    const onStatus = vi.fn<(status: ExternalFeedStatus) => void>();
    const poller = createPoller({ fetchMids, onResult: vi.fn(), onStatus, intervalMs: 1000 });
    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(onStatus).toHaveBeenLastCalledWith('error', 'network');
    poller.stop();
  });

  it('defaults to a 5-minute cadence', () => {
    expect(DEFAULT_POLL_MS).toBe(300_000);
  });
});
