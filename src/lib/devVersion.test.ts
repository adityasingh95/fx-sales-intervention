import { afterEach, describe, expect, it, vi } from 'vitest';

// devVersion parses window.location.search once at module load, so each case
// stubs location, then re-imports the module with a cache-buster query to
// force its initialiser to re-run against the stubbed value.
let reloadCounter = 0;
function freshImport(search: string) {
  vi.stubGlobal('location', { search });
  reloadCounter += 1;
  return import('./devVersion?reload=' + Date.now() + '_' + reloadCounter);
}

describe('devVersion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is v1 with no query string', async () => {
    const { devVersion, isV3 } = await freshImport('');
    expect(devVersion).toBe('v1');
    expect(isV3()).toBe(false);
  });

  it('is v1 for the legacy ?dev=1 flag (byte-for-byte GA)', async () => {
    const { devVersion, isV3 } = await freshImport('?dev=1');
    expect(devVersion).toBe('v1');
    expect(isV3()).toBe(false);
  });

  it('is v1 for any other dev value', async () => {
    const { isV3 } = await freshImport('?dev=v2');
    expect(isV3()).toBe(false);
  });

  it('is v3 when ?dev=v3 is present', async () => {
    const { devVersion, isV3 } = await freshImport('?dev=v3');
    expect(devVersion).toBe('v3');
    expect(isV3()).toBe(true);
  });

  it('is v3 when ?dev=v3 is combined with other params', async () => {
    const { isV3 } = await freshImport('?theme=preview&dev=v3');
    expect(isV3()).toBe(true);
  });
});
