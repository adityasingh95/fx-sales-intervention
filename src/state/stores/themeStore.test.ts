import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function mockMatchMedia(prefersLight: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function setSearch(search: string): void {
  window.history.replaceState({}, '', `/${search}`);
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
    setSearch('');
    mockMatchMedia(false);
  });

  afterEach(() => {
    window.sessionStorage.clear();
    document.documentElement.dataset.theme = '';
    setSearch('');
    vi.restoreAllMocks();
  });

  describe('first-visit defaults', () => {
    it('forces dark when ?theme=preview is absent', async () => {
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('respects prefers-color-scheme: light when flag is on and no stored value', async () => {
      setSearch('?theme=preview');
      mockMatchMedia(true);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('respects prefers-color-scheme: dark when flag is on and no stored value', async () => {
      setSearch('?theme=preview');
      mockMatchMedia(false);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('uses sessionStorage value when flag is on and a value exists', async () => {
      setSearch('?theme=preview');
      window.sessionStorage.setItem('si.theme', 'light');
      mockMatchMedia(false);
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('ignores sessionStorage when flag is off (forces dark)', async () => {
      window.sessionStorage.setItem('si.theme', 'light');
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
    });
  });

  describe('setMode', () => {
    it('updates the mode in state', async () => {
      setSearch('?theme=preview');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('persists the mode to sessionStorage', async () => {
      setSearch('?theme=preview');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(window.sessionStorage.getItem('si.theme')).toBe('light');
      useThemeStore.getState().setMode('dark');
      expect(window.sessionStorage.getItem('si.theme')).toBe('dark');
    });

    it('updates document.documentElement.dataset.theme on change', async () => {
      setSearch('?theme=preview');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(document.documentElement.dataset.theme).toBe('light');
      useThemeStore.getState().setMode('dark');
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('does not persist when flag is off (force-dark mode)', async () => {
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().setMode('light');
      expect(window.sessionStorage.getItem('si.theme')).toBeNull();
    });
  });

  describe('toggle', () => {
    it('flips dark to light', async () => {
      setSearch('?theme=preview');
      const { useThemeStore } = await freshImport();
      expect(useThemeStore.getState().mode).toBe('dark');
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('light');
    });

    it('flips light to dark', async () => {
      setSearch('?theme=preview');
      window.sessionStorage.setItem('si.theme', 'light');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().toggle();
      expect(useThemeStore.getState().mode).toBe('dark');
    });

    it('persists the new mode to sessionStorage', async () => {
      setSearch('?theme=preview');
      const { useThemeStore } = await freshImport();
      useThemeStore.getState().toggle();
      expect(window.sessionStorage.getItem('si.theme')).toBe('light');
    });
  });

  describe('initial DOM side-effect', () => {
    it('writes dataset.theme=light on init when stored value is light', async () => {
      setSearch('?theme=preview');
      window.sessionStorage.setItem('si.theme', 'light');
      await freshImport();
      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('writes dataset.theme=dark when flag is off', async () => {
      await freshImport();
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('Safari private-mode tolerance', () => {
    it('does not throw when sessionStorage.setItem throws', async () => {
      setSearch('?theme=preview');
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
