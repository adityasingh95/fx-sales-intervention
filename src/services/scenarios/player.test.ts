import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DealEvent } from '@/services/feed/types';
import { createScenarioPlayer } from './player';

describe('createScenarioPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('inject() returns the generated dealId and uses the supplied generator', () => {
    const emitted: DealEvent[] = [];
    let counter = 0;
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => `d_test${++counter}`,
      now: () => 1_700_000_000_000,
    });
    const id = player.inject('HAPPY_PATH_ESP');
    expect(id).toBe('d_test1');
    expect(emitted[0]).toMatchObject({
      type: 'NEW_ESP_DEAL',
      deal: { dealId: 'd_test1', clientName: 'Acme Corp', createdAt: 1_700_000_000_000 },
    });
  });

  it('notifyDealState ignores non-matching dealId and non-matching state', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_oh',
    });
    player.inject('OFF_HOURS_INTERVENTION');
    player.notifyDealState('d_other', 'Quoted');
    player.notifyDealState('d_oh', 'PickedUp');
    vi.advanceTimersByTime(3000);
    expect(emitted).toHaveLength(1);
  });
});
