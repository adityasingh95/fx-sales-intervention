import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FALLBACK, main, round } from '../../scripts/fetch-reference-mids';

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
    logSpy.mockReset();
    warnSpy.mockReset();
    await rm(dir, { recursive: true, force: true });
  });

  it('round(1/0.85361, 4) returns 1.1715', () => {
    expect(round(1 / 0.85361, 4)).toBe(1.1715);
  });

  it('with a Frankfurter-shaped response, writes USD-based inverted mids', async () => {
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
    expect(written.source).toBe('frankfurter.dev');
    expect(written.date).toBe('2026-05-20');
    expect(written.mids).toEqual({
      EURUSD: 1.1715,
      GBPUSD: 1.3511,
      USDJPY: 157.77,
      USDINR: 95.67,
    });
  });

  it('with fetch throwing, writes the fallback and resolves (exit 0)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('network down')),
    );
    const out = join(dir, 'mids.json');

    await expect(main(out)).resolves.toBeUndefined();

    const written = JSON.parse(await readFile(out, 'utf8'));
    expect(written).toEqual(FALLBACK);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('with a non-ok HTTP response, writes the fallback', async () => {
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
