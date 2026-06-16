import { create } from 'zustand';

export type ThemeMode = 'dark' | 'light';

const THEME_KEY = 'si.theme';

function readStoredMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(THEME_KEY);
    return raw === 'light' || raw === 'dark' ? raw : null;
  } catch {
    return null;
  }
}

function writeStoredMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(THEME_KEY, mode);
  } catch {
    // sessionStorage may be unavailable (Safari private mode); ignore.
  }
}

function prefersLight(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: light)').matches;
}

function applyDomTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = mode;
}

function resolveInitialMode(): ThemeMode {
  const stored = readStoredMode();
  if (stored !== null) return stored;
  return prefersLight() ? 'light' : 'dark';
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const initialMode = resolveInitialMode();
applyDomTheme(initialMode);

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  setMode: (mode) => {
    writeStoredMode(mode);
    applyDomTheme(mode);
    set({ mode });
  },
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    writeStoredMode(next);
    applyDomTheme(next);
    set({ mode: next });
  },
}));
