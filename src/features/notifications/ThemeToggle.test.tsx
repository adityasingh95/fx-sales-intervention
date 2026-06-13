import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

function mockMatchMedia(prefersLight: boolean): void {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('light') ? prefersLight : !prefersLight,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

let reloadCounter = 0;
async function freshImport() {
  reloadCounter += 1;
  vi.resetModules();
  return import('./ThemeToggle?reload=' + Date.now() + '_' + reloadCounter);
}

describe('<ThemeToggle />', () => {
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

  it('renders Sun icon when dark is active (icon is the target — what click switches TO)', async () => {
    const { default: ThemeToggle } = await freshImport();
    render(<ThemeToggle />);
    const btn = screen.getByTestId('theme-toggle');
    expect(btn).toHaveAttribute('data-theme-mode', 'dark');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAccessibleName(/light theme/i);
  });

  it('renders Moon icon when light is active', async () => {
    window.sessionStorage.setItem('si.theme', 'light');
    const { default: ThemeToggle } = await freshImport();
    render(<ThemeToggle />);
    const btn = screen.getByTestId('theme-toggle');
    expect(btn).toHaveAttribute('data-theme-mode', 'light');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAccessibleName(/dark theme/i);
  });

  it('click toggles the theme and updates attributes', async () => {
    const { default: ThemeToggle } = await freshImport();
    render(<ThemeToggle />);
    const btn = screen.getByTestId('theme-toggle');
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('data-theme-mode', 'light');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.sessionStorage.getItem('si.theme')).toBe('light');
  });

  it('second click flips back to dark', async () => {
    const { default: ThemeToggle } = await freshImport();
    render(<ThemeToggle />);
    const btn = screen.getByTestId('theme-toggle');
    act(() => {
      fireEvent.click(btn);
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('data-theme-mode', 'dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
