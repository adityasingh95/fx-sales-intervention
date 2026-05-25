import { describe, expect, it } from 'vitest';
import { resolveBasePath } from '../../scripts/resolveBasePath';

describe('resolveBasePath (vite base path)', () => {
  it('returns the env value when set', () => {
    expect(resolveBasePath('/fx-sales-intervention/')).toBe(
      '/fx-sales-intervention/',
    );
    expect(resolveBasePath('/foo/')).toBe('/foo/');
  });

  it('returns "/" when the env value is undefined', () => {
    expect(resolveBasePath(undefined)).toBe('/');
  });

  it('returns "/" when the env value is the empty string', () => {
    expect(resolveBasePath('')).toBe('/');
  });
});
