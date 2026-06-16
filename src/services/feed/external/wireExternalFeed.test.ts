import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the external-feed service so we assert the bridge's calls without a
// real poller / network.
vi.mock('./externalFeed', () => ({
  externalFeed: { enable: vi.fn(), disable: vi.fn() },
}));

import { externalFeed } from './externalFeed';
import { wireExternalFeed } from './wireExternalFeed';
import { useSettingsStore } from '@/state/stores/settingsStore';

const enable = externalFeed.enable as ReturnType<typeof vi.fn>;
const disable = externalFeed.disable as ReturnType<typeof vi.fn>;

describe('wireExternalFeed', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSettingsStore.setState({ externalFeedKey: null, externalFeedEnabled: false });
    enable.mockClear();
    disable.mockClear();
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('does not enable when off by default', () => {
    const off = wireExternalFeed();
    expect(enable).not.toHaveBeenCalled();
    off();
  });

  it('enables when key + toggle are set, disables when turned off', () => {
    const off = wireExternalFeed();
    useSettingsStore.getState().setExternalFeedKey('KEY');
    useSettingsStore.getState().setExternalFeedEnabled(true);
    expect(enable).toHaveBeenLastCalledWith('KEY');

    useSettingsStore.getState().setExternalFeedEnabled(false);
    expect(disable).toHaveBeenCalled();
    off();
  });

  it('does not enable with a toggle but no key', () => {
    const off = wireExternalFeed();
    useSettingsStore.getState().setExternalFeedEnabled(true);
    expect(enable).not.toHaveBeenCalled();
    off();
  });
});
