import { describe, expect, it } from 'vitest';
import { parseThemePreviewEnabled } from './themeMode';

describe('parseThemePreviewEnabled', () => {
  it('returns true for ?theme=preview', () => {
    expect(parseThemePreviewEnabled('?theme=preview')).toBe(true);
  });

  it('returns false for ?theme=light', () => {
    expect(parseThemePreviewEnabled('?theme=light')).toBe(false);
  });

  it('returns false for ?theme=dark', () => {
    expect(parseThemePreviewEnabled('?theme=dark')).toBe(false);
  });

  it('returns false for ?theme with no value', () => {
    expect(parseThemePreviewEnabled('?theme')).toBe(false);
  });

  it('returns false for ?theme=PREVIEW (case-sensitive — must be lowercase)', () => {
    expect(parseThemePreviewEnabled('?theme=PREVIEW')).toBe(false);
  });

  it('returns false for empty query string', () => {
    expect(parseThemePreviewEnabled('')).toBe(false);
  });

  it('returns false for a query string with other params', () => {
    expect(parseThemePreviewEnabled('?foo=bar&baz=qux')).toBe(false);
  });

  it('returns true when ?theme=preview sits alongside other params', () => {
    expect(parseThemePreviewEnabled('?other=thing&theme=preview&extra=42')).toBe(true);
  });

  it('returns true when ?theme=preview sits alongside ?dev=v2 (orthogonal flags)', () => {
    expect(parseThemePreviewEnabled('?dev=v2&theme=preview')).toBe(true);
  });
});
