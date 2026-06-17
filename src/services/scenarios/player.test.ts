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

  it('applies a tenor override, injecting a scenario as a forward (FXSW-059)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_fwd',
    });
    player.inject('OFF_HOURS_INTERVENTION', { tenor: '3M' });
    expect(emitted[0]).toMatchObject({ type: 'NEW_SI_DEAL', deal: { tenor: '3M' } });
  });

  it('defaults to the scenario tenor (SPOT) when no override is given', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_spot',
    });
    player.inject('OFF_HOURS_INTERVENTION');
    expect(emitted[0]).toMatchObject({ type: 'NEW_SI_DEAL', deal: { tenor: 'SPOT' } });
  });

  it('derives instrumentType from tenor when no override is given (FXSW-078)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_inst',
    });
    // SPOT scenario → SPOT instrument.
    player.inject('OFF_HOURS_INTERVENTION');
    expect(emitted[0]).toMatchObject({ deal: { tenor: 'SPOT', instrumentType: 'SPOT' } });
    // Forward tenor override → OUTRIGHT instrument.
    player.inject('OFF_HOURS_INTERVENTION', { tenor: '3M' });
    expect(emitted[1]).toMatchObject({ deal: { tenor: '3M', instrumentType: 'OUTRIGHT' } });
  });

  it('coerces an NDF on a SPOT request to the shortest forward tenor (FXSW-078)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_ndf',
    });
    player.inject('OFF_HOURS_INTERVENTION', { instrumentType: 'NDF' });
    expect(emitted[0]).toMatchObject({
      type: 'NEW_SI_DEAL',
      deal: { instrumentType: 'NDF', tenor: '1W' },
    });
  });

  it('keeps an explicit forward tenor for an NDF override (FXSW-078)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_ndf2',
    });
    player.inject('OFF_HOURS_INTERVENTION', { instrumentType: 'NDF', tenor: '6M' });
    expect(emitted[0]).toMatchObject({ deal: { instrumentType: 'NDF', tenor: '6M' } });
  });

  it('injects a SWAP with NEAR + FAR legs; Deal.tenor mirrors the near leg (FXSW-082)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_swap',
    });
    player.inject('OFF_HOURS_INTERVENTION', { instrumentType: 'SWAP', tenor: '1M', farTenor: '6M' });
    expect(emitted[0]).toMatchObject({
      type: 'NEW_SI_DEAL',
      deal: {
        instrumentType: 'SWAP',
        tenor: '1M',
        legs: [
          { kind: 'NEAR', tenor: '1M' },
          { kind: 'FAR', tenor: '6M' },
        ],
      },
    });
  });

  it('coerces an out-of-order SWAP far (far ≤ near) to the next tenor after near (FXSW-082)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_swap2',
    });
    player.inject('OFF_HOURS_INTERVENTION', { instrumentType: 'SWAP', tenor: '3M', farTenor: '1M' });
    expect(emitted[0]).toMatchObject({
      deal: { legs: [{ kind: 'NEAR', tenor: '3M' }, { kind: 'FAR', tenor: '6M' }] },
    });
  });

  it('leaves single-leg deals without a legs array (FXSW-082 — swaps only)', () => {
    const emitted: DealEvent[] = [];
    const player = createScenarioPlayer({
      emit: (e) => emitted.push(e),
      generateDealId: () => 'd_single',
    });
    player.inject('OFF_HOURS_INTERVENTION', { tenor: '3M' });
    const deal = (emitted[0] as { deal: { legs?: unknown } }).deal;
    expect(deal.legs).toBeUndefined();
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
