import { create } from 'zustand';

// User-settings store. Persists to sessionStorage per CLAUDE.md rule §3.
// Reload during a session restores; a new session starts at defaults.

const MUTED_KEY = 'si.muted';
const BLOTTER_SPLIT_KEY = 'si.blotterSplit';
const DEFAULT_BLOTTER_SPLIT = 55;
// External market-data feed (v3, FXSW-052). Key + toggle are session-only and
// default OFF, so a fresh session is always the simulated deterministic feed.
const EXTERNAL_FEED_KEY = 'si.externalFeedKey';
const EXTERNAL_FEED_ENABLED_KEY = 'si.externalFeedEnabled';

function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(MUTED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MUTED_KEY, muted ? 'true' : 'false');
  } catch {
    // sessionStorage may be unavailable; ignore.
  }
}

function readBlotterSplit(): number {
  if (typeof window === 'undefined') return DEFAULT_BLOTTER_SPLIT;
  try {
    const raw = window.sessionStorage.getItem(BLOTTER_SPLIT_KEY);
    if (raw === null) return DEFAULT_BLOTTER_SPLIT;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : DEFAULT_BLOTTER_SPLIT;
  } catch {
    return DEFAULT_BLOTTER_SPLIT;
  }
}

function writeBlotterSplit(split: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(BLOTTER_SPLIT_KEY, String(split));
  } catch {
    // ignore
  }
}

function readExternalFeedKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(EXTERNAL_FEED_KEY);
  } catch {
    return null;
  }
}

function writeExternalFeedKey(key: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (key === null || key === '') window.sessionStorage.removeItem(EXTERNAL_FEED_KEY);
    else window.sessionStorage.setItem(EXTERNAL_FEED_KEY, key);
  } catch {
    // ignore
  }
}

function readExternalFeedEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(EXTERNAL_FEED_ENABLED_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeExternalFeedEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(EXTERNAL_FEED_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // ignore
  }
}

interface SettingsState {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  blotterSplit: number;
  setBlotterSplit: (split: number) => void;
  externalFeedKey: string | null;
  externalFeedEnabled: boolean;
  setExternalFeedKey: (key: string | null) => void;
  setExternalFeedEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  muted: readMuted(),
  toggleMute: () => {
    const next = !get().muted;
    writeMuted(next);
    set({ muted: next });
  },
  setMuted: (muted) => {
    writeMuted(muted);
    set({ muted });
  },
  blotterSplit: readBlotterSplit(),
  setBlotterSplit: (split) => {
    writeBlotterSplit(split);
    set({ blotterSplit: split });
  },
  externalFeedKey: readExternalFeedKey(),
  externalFeedEnabled: readExternalFeedEnabled(),
  setExternalFeedKey: (key) => {
    const normalized = key === '' ? null : key;
    writeExternalFeedKey(normalized);
    set({ externalFeedKey: normalized });
  },
  setExternalFeedEnabled: (enabled) => {
    writeExternalFeedEnabled(enabled);
    set({ externalFeedEnabled: enabled });
  },
}));
