import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from './settingsStore';

describe('useSettingsStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    useSettingsStore.setState({
      muted: false,
      externalFeedKey: null,
      externalFeedEnabled: false,
    });
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

  // FXSW-036: blotter split (v2 resize handle)
  it('defaults blotterSplit to 55', () => {
    expect(useSettingsStore.getState().blotterSplit).toBe(55);
  });

  it('setBlotterSplit updates the value and persists', () => {
    useSettingsStore.getState().setBlotterSplit(70);
    expect(useSettingsStore.getState().blotterSplit).toBe(70);
    expect(window.sessionStorage.getItem('si.blotterSplit')).toBe('70');
  });

  it('restores blotterSplit from sessionStorage on reload', async () => {
    window.sessionStorage.setItem('si.blotterSplit', '40');
    const fresh = await import('./settingsStore?reload=' + Date.now());
    expect(fresh.useSettingsStore.getState().blotterSplit).toBe(40);
  });

  it('falls back to default 55 when stored value is malformed', async () => {
    window.sessionStorage.setItem('si.blotterSplit', 'not-a-number');
    const fresh = await import('./settingsStore?reload=' + Date.now());
    expect(fresh.useSettingsStore.getState().blotterSplit).toBe(55);
  });

  // FXSW-052: external market-data feed (v3)
  it('external feed defaults to disabled with no key', () => {
    const s = useSettingsStore.getState();
    expect(s.externalFeedEnabled).toBe(false);
    expect(s.externalFeedKey).toBeNull();
  });

  it('setExternalFeedKey persists; empty string clears it', () => {
    useSettingsStore.getState().setExternalFeedKey('abc123');
    expect(useSettingsStore.getState().externalFeedKey).toBe('abc123');
    expect(window.sessionStorage.getItem('si.externalFeedKey')).toBe('abc123');
    useSettingsStore.getState().setExternalFeedKey('');
    expect(useSettingsStore.getState().externalFeedKey).toBeNull();
    expect(window.sessionStorage.getItem('si.externalFeedKey')).toBeNull();
  });

  it('setExternalFeedEnabled persists the toggle', () => {
    useSettingsStore.getState().setExternalFeedEnabled(true);
    expect(useSettingsStore.getState().externalFeedEnabled).toBe(true);
    expect(window.sessionStorage.getItem('si.externalFeedEnabled')).toBe('true');
  });

  it('restores external feed key/enabled from sessionStorage on reload', async () => {
    window.sessionStorage.setItem('si.externalFeedKey', 'persisted-key');
    window.sessionStorage.setItem('si.externalFeedEnabled', 'true');
    const fresh = await import('./settingsStore?reload=' + Date.now());
    expect(fresh.useSettingsStore.getState().externalFeedKey).toBe('persisted-key');
    expect(fresh.useSettingsStore.getState().externalFeedEnabled).toBe(true);
  });
});
