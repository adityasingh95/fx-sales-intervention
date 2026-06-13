import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function mockMatchMedia(prefersLight: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

let reloadCounter = 0;
function freshImport() {
  reloadCounter += 1;
  return import('./themeStore?reload=' + Date.now() + '_' + reloadCounter);
}

describe('useThemeStore', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = '';
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = '';
    vi.restoreAllMocks();
  });

  describe('first-visit defaults', () => {
    it('defaults to dark when prefers-color-scheme: dark and no stored value', async () => {
      mockMatchMedia(false);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('defaults to light when prefers-color-scheme: light and no stored value', async () => {
      mockMatchMedia(true);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('uses sessionStorage value when one exists (overrides system preference)', async () => {
      window.sessionStorage.setItem('si.theme', 'light');
      mockMatchMedia(false);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('light');
    });
  });

  describe('setMode', () => {
    it('updates the mode in state', async () => {
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('persists the mode to sessionStorage', async () => {
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(window.sessionStorage.getItem('si.theme')).toBe('light');
      useThemeStore.getState().setMode('dark');
      expect(window.sessionStorage.getItem('si.theme')).toBe('dark');
    });

    it('updates document.documentElement.dataset.theme on change', async () => {
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      useThemeStore.getState().setMode('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('toggle', () => {
    it('flips dark to light', async () => {
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('flips light to dark', async () => {
      window.sessionStorage.setItem('si.theme', 'light');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('persists the new mode to sessionStorage', async () => {
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().toggle();
      expect(window.sessionStorage.getItem('si.theme')).toBe('light');
    });
  });

  describe('initial DOM side-effect', () => {
    it('writes dataset.theme=light on init when stored value is light', async () => {
      window.sessionStorage.setItem('si.theme', 'light');
      await freshImport();
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('writes dataset.theme=dark on init with no stored value and dark system preference', async () => {
      await freshImport();
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('Safari private-mode tolerance', () => {
    it('does not throw when sessionStorage.setItem throws', async () => {
      const original = window.sessionStorage.setItem;
      window.sessionStorage.setItem = () => {
        throw new Error('QuotaExceeded');
      };
      const { useThemeStore } = await freshImport();
      expect(() => useThemeStore.getState().setMode('light')).not.toThrow();
      expect(useThemeStore.getState().mode).toBe('light');
      window.sessionStorage.setItem = original;
    });
  });
});
