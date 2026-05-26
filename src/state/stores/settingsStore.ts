import { create } from 'zustand';

// User-settings store. Persists to sessionStorage per CLAUDE.md rule §3
// ("Never persist beyond sessionStorage, and even that only for the
// mute-toggle and the AI-suggestion dismissal flag"). Reload during a
// session restores the flag; a new session starts unmuted.

const STORAGE_KEY = 'si.muted';

function readMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, muted ? 'true' : 'false');
  } catch {
    // sessionStorage may be unavailable (Safari private mode etc.); ignore.
  }
}

interface SettingsState {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
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
}));
