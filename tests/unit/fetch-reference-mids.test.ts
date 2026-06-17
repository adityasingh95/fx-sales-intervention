import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FALLBACK, main, round } from '../../scripts/fetch-reference-mids';

// FXSW-088: the live fetch is opt-in (FETCH_LIVE_MIDS=true). Tests that exercise
// the live path enable it explicitly and clear the hard fallback override.
const enableLiveFetch = (): void => {
  vi.stubEnv('FETCH_LIVE_MIDS', 'true');
  vi.stubEnv('USE_FALLBACK_MIDS', '');
};

describe('fetch-reference-mids', () => {
  let dir: string;
  const logSpy = vi.spyOn(console, 'log');
  const warnSpy = vi.spyOn(console, 'warn');

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'mids-'));
    logSpy.mockImplementation(() => {});
    warnSpy.mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    logSpy.mockReset();
    warnSpy.mockReset();
    await rm(dir, { recursive: true, force: true });
  });

  it('round(1/0.85361, 4) returns 1.1715', () => {
    expect(round(1 / 0.85361, 4)).toBe(1.1715);
  });

  it('defaults to the pinned fallback and makes NO network call when FETCH_LIVE_MIDS is unset (FXSW-088)', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = join(dir, 'mids.json');

    await main(out);

    expect(fetchSpy).not.toHaveBeenCalled();
    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
  });

  it('honours USE_FALLBACK_MIDS as a hard override even when live fetch is requested (FXSW-088)', async () => {
    vi.stubEnv('FETCH_LIVE_MIDS', 'true');
    vi.stubEnv('USE_FALLBACK_MIDS', 'true');
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const out = join(dir, 'mids.json');

    await main(out);

    expect(fetchSpy).not.toHaveBeenCalled();
    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
  });

  it('with FETCH_LIVE_MIDS and a live-source response, writes USD-based inverted mids', async () => {
    enableLiveFetch();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          date: '2026-05-20',
          rates: { EUR: 0.85361, GBP: 0.74013, JPY: 157.77, INR: 95.67 },
        }),
      }),
    );
    const out = join(dir, 'mids.json');

    await main(out);

    const written = JSON.parse(await readFile(out, 'utf8'));
    // FXSW-088 T-6: assert the live source (not the fallback) without naming the
    // provider, so no vendor literal lives in this test file.
    expect(written.source).not.toBe('fallback');
    expect(written.date).toBe('2026-05-20');
    expect(written.mids).toEqual({
      EURUSD: 1.1715,
      GBPUSD: 1.3511,
      USDJPY: 157.77,
      USDINR: 95.67,
    });
  });

  it('rejects a poisoned-but-200 payload (out-of-range mid) and writes the fallback (FXSW-088)', async () => {
    enableLiveFetch();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        // JPY rate of 0 → 1/… style inversion isn't used for JPY, but a wildly
        // wrong USDJPY (e.g. 5) is outside [50, 300] and must be rejected.
        json: async () => ({
          date: '2026-05-20',
          rates: { EUR: 0.85361, GBP: 0.74013, JPY: 5, INR: 95.67 },
        }),
      }),
    );
    const out = join(dir, 'mids.json');

    await main(out);

    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('rejects a missing/zero rate that would invert to a non-finite mid (FXSW-088)', async () => {
    enableLiveFetch();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          date: '2026-05-20',
          rates: { EUR: 0, GBP: 0.74013, JPY: 157.77, INR: 95.67 },
        }),
      }),
    );
    const out = join(dir, 'mids.json');

    await main(out);

    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
  });

  it('with FETCH_LIVE_MIDS and fetch throwing, writes the fallback and resolves (exit 0)', async () => {
    enableLiveFetch();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const out = join(dir, 'mids.json');

    await expect(main(out)).resolves.toBeUndefined();

    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('with FETCH_LIVE_MIDS and a non-ok HTTP response, writes the fallback', async () => {
    enableLiveFetch();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );
    const out = join(dir, 'mids.json');

    await main(out);

    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
  });
});
