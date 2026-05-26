import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSettingsStore.setState({ muted: false });
  });

  afterEach(() => {
    window.sessionStorage.clear();
  });

  it('defaults to unmuted', () => {
    expect(useSettingsStore.getState().muted).toBe(false);
  });

  it('toggleMute flips the flag', () => {
    useSettingsStore.getState().toggleMute();
    expect(useSettingsStore.getState().muted).toBe(true);
    useSettingsStore.getState().toggleMute();
    expect(useSettingsStore.getState().muted).toBe(false);
  });

  it('persists to sessionStorage on toggle', () => {
    useSettingsStore.getState().toggleMute();
    expect(window.sessionStorage.getItem('si.muted')).toBe('true');
    useSettingsStore.getState().toggleMute();
    expect(window.sessionStorage.getItem('si.muted')).toBe('false');
  });

  it('setMuted writes the value and persists', () => {
    useSettingsStore.getState().setMuted(true);
    expect(useSettingsStore.getState().muted).toBe(true);
    expect(window.sessionStorage.getItem('si.muted')).toBe('true');
  });

  // Reload-restore semantics: simulated by writing the storage value
  // then re-importing the module so its initialiser runs again.
  it('restores muted state from sessionStorage on reload', async () => {
    window.sessionStorage.setItem('si.muted', 'true');
    // Re-import to force the store's initialiser to read from storage.
    const fresh = await import('./settingsStore?reload=' + Date.now());
    expect(fresh.useSettingsStore.getState().muted).toBe(true);
  });
});
