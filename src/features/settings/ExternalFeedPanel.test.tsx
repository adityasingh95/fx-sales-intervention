import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

let status = 'off';
vi.mock('@/services/feed/external/externalFeed', () => ({
  externalFeed: {
    getStatus: () => status,
    subscribeStatus: (cb: (s: string) => void) => {
      cb(status);
      return () => {};
    },
  },
}));

import ExternalFeedPanel from './ExternalFeedPanel';
import { useSettingsStore } from '@/state/stores/settingsStore';

describe('ExternalFeedPanel', () => {
  beforeEach(() => {
    status = 'off';
    window.sessionStorage.clear();
    useSettingsStore.setState({ externalFeedKey: null, externalFeedEnabled: false });
  });
  afterEach(cleanup);

  // FXSW-088 T-6: intentional brand-neutrality denylist tripwire — the provider
  // names appear only inside `.not.toContain` guards (the v3 exception covers the
  // adapter, never user-visible UI). Retained by design.
  it('shows a generic Off status pill with no vendor name', () => {
    render(<ExternalFeedPanel />);
    const pill = screen.getByTestId('external-feed-status');
    expect(pill).toHaveAttribute('data-feed-status', 'off');
    expect(pill.textContent?.toLowerCase()).not.toContain('polygon');
    expect(pill.textContent?.toLowerCase()).not.toContain('massive');
  });

  it('reflects the live status', () => {
    status = 'live';
    render(<ExternalFeedPanel />);
    expect(screen.getByTestId('external-feed-status')).toHaveAttribute(
      'data-feed-status',
      'live',
    );
  });

  it('enable checkbox is disabled until a key is entered', () => {
    render(<ExternalFeedPanel />);
    fireEvent.click(screen.getByTestId('external-feed-toggle'));
    const enable = screen.getByTestId('external-feed-enable') as HTMLInputElement;
    expect(enable.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('external-feed-key-input'), {
      target: { value: 'KEY' },
    });
    expect(useSettingsStore.getState().externalFeedKey).toBe('KEY');
    expect((screen.getByTestId('external-feed-enable') as HTMLInputElement).disabled).toBe(
      false,
    );

    fireEvent.click(screen.getByTestId('external-feed-enable'));
    expect(useSettingsStore.getState().externalFeedEnabled).toBe(true);
  });
});
