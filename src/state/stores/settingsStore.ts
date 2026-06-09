import { create } from 'zustand';

// User-settings store. Persists to sessionStorage per CLAUDE.md rule §3.
// Reload during a session restores; a new session starts at defaults.

const MUTED_KEY = 'si.muted';
const BLOTTER_SPLIT_KEY = 'si.blotterSplit';
const DEFAULT_BLOTTER_SPLIT = 55;

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

interface SettingsState {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  blotterSplit: number;
  setBlotterSplit: (split: number) => void;
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
}));
