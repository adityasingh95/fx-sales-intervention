import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { _resetTitleFlash, flashDocumentTitle } from './titleFlash';

describe('flashDocumentTitle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.title = 'FX Sales Workstation';
    _resetTitleFlash();
    document.title = 'FX Sales Workstation';
  });

  afterEach(() => {
    _resetTitleFlash();
    vi.useRealTimers();
  });

  it('prefixes the title with "● " for 5 seconds and restores it', () => {
    flashDocumentTitle();
    expect(document.title).toBe('● FX Sales Workstation');
    vi.advanceTimersByTime(5000);
    expect(document.title).toBe('FX Sales Workstation');
  });

  it('repeated calls within the window do not double-prefix', () => {
    flashDocumentTitle();
    expect(document.title).toBe('● FX Sales Workstation');
    vi.advanceTimersByTime(2000);
    flashDocumentTitle();
    expect(document.title).toBe('● FX Sales Workstation');
    // Timer resets — restore happens 5s after the second call.
    vi.advanceTimersByTime(4000);
    expect(document.title).toBe('● FX Sales Workstation');
    vi.advanceTimersByTime(1100);
    expect(document.title).toBe('FX Sales Workstation');
  });
});
