import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useSettingsStore } from '@/state/stores/settingsStore';
import MuteToggle from './MuteToggle';

describe('<MuteToggle />', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSettingsStore.setState({ muted: false });
  });
  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('renders Bell icon when unmuted; aria-pressed=false', () => {
    render(<MuteToggle />);
    const btn = screen.getByTestId('mute-toggle');
    expect(btn).toHaveAttribute('data-muted', 'false');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAccessibleName(/mute/i);
  });

  it('click flips state and swaps icon attributes', () => {
    render(<MuteToggle />);
    const btn = screen.getByTestId('mute-toggle');
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('data-muted', 'true');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAccessibleName(/unmute/i);
    expect(useSettingsStore.getState().muted).toBe(true);
    expect(window.sessionStorage.getItem('si.muted')).toBe('true');
  });

  it('second click flips back to unmuted', () => {
    render(<MuteToggle />);
    const btn = screen.getByTestId('mute-toggle');
    act(() => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    expect(useSettingsStore.getState().muted).toBe(false);
  });
});
