import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import { useDealsStore } from '@/state/stores/dealsStore';
import { useNotificationsStore } from '@/state/stores/notificationsStore';
import { useSettingsStore } from '@/state/stores/settingsStore';
import type { Deal } from '@/types/deal';
import { dispatchNotifications } from './dispatcher';
import { _audio, useNotificationSound } from './useNotificationSound';

// Minimal stub AudioContext that records oscillator creations so we can
// assert "schedules an OscillatorNode" without jsdom's missing WebAudio.
function makeMockAudioContext() {
  const createdOscillators: Array<{
    frequency: { value: number };
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];
  const oscillator = (): unknown => {
    const node = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    createdOscillators.push(node);
    return node;
  };
  const gain = (): unknown => ({
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  });
  const ctx = {
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(oscillator),
    createGain: vi.fn(gain),
  };
  return { ctx, createdOscillators };
}

function Harness() {
  useNotificationSound();
  return null;
}

const makeDeal = (id = 'd_sound'): Deal => ({
  dealId: id,
  clientName: 'Globex Industries',
  accountCode: 'GLBX-JPY-2',
  pair: 'USDJPY',
  side: 'SELL',
  notional: 5_000_000,
  tenor: 'SPOT',
  defaultMarginPips: 3,
  createdAt: Date.now(),
});

const resetAll = (): void => {
  for (const entry of useDealsStore.getState().deals.values()) entry.actor.stop();
  useDealsStore.setState({ deals: new Map(), historic: [] });
  useNotificationsStore.getState().reset();
  useSettingsStore.setState({ muted: false });
  _audio.reset();
};

describe('useNotificationSound', () => {
  let mock: ReturnType<typeof makeMockAudioContext>;

  beforeEach(() => {
    mock = makeMockAudioContext();
    _audio.setFactory(() => mock.ctx as unknown as AudioContext);
    resetAll();
  });
  afterEach(() => {
    resetAll();
  });

  it('does NOT schedule before the first user gesture (audio not yet unlocked)', () => {
    render(<Harness />);
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(mock.createdOscillators).toHaveLength(0);
  });

  it('schedules an OscillatorNode on a new SI deal once audio is unlocked AND unmuted', () => {
    render(<Harness />);
    // Simulate the first user gesture — the document-click handler the
    // hook installs calls ctx.resume() and flips the unlocked flag.
    act(() => {
      fireEvent.click(document);
    });
    expect(mock.ctx.resume).toHaveBeenCalled();
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(mock.createdOscillators).toHaveLength(1);
    expect(mock.createdOscillators[0].frequency.value).toBe(880);
    expect(mock.createdOscillators[0].start).toHaveBeenCalled();
    expect(mock.createdOscillators[0].stop).toHaveBeenCalled();
  });

  it('does NOT schedule when muted, even after unlock + new SI deal', () => {
    render(<Harness />);
    act(() => {
      useSettingsStore.getState().setMuted(true);
      fireEvent.click(document);
    });
    act(() => {
      useDealsStore.getState().addDeal(makeDeal(), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(mock.createdOscillators).toHaveLength(0);
  });

  it('schedules once per new SI deal, not per render', () => {
    const { rerender } = render(<Harness />);
    act(() => {
      fireEvent.click(document);
      useDealsStore.getState().addDeal(makeDeal('d_a'), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(mock.createdOscillators).toHaveLength(1);
    // Force a re-render with no new deal — no new oscillator.
    rerender(<Harness />);
    expect(mock.createdOscillators).toHaveLength(1);
    // Second deal arrives — schedules a second.
    act(() => {
      useDealsStore.getState().addDeal(makeDeal('d_b'), ['OFF_HOURS']);
      dispatchNotifications(useDealsStore.getState().deals);
    });
    expect(mock.createdOscillators).toHaveLength(2);
  });
});
