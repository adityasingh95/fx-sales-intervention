import { describe, expect, it, vi } from 'vitest';
import { fetchMids, ProviderError } from './provider';

const okResponse = (close: number): Response =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ results: [{ c: close }] }),
  }) as unknown as Response;

describe('provider.fetchMids', () => {
  it('maps the aggregate close to pair mids with pair precision, no inversion', async () => {
    const fetchImpl = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValueOnce(okResponse(1.17234))
      .mockResolvedValueOnce(okResponse(157.778));
    const mids = await fetchMids('KEY', ['EURUSD', 'USDJPY'], fetchImpl as unknown as typeof fetch);
    expect(mids).toEqual({ EURUSD: 1.1723, USDJPY: 157.78 });
  });

  it('sends the api key via an Authorization header (never in the URL) and the C: symbol in the URL', async () => {
    const fetchImpl = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValue(okResponse(1.1));
    await fetchMids('secret key', ['EURUSD'], fetchImpl as unknown as typeof fetch);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://api.massive.com/v2/aggs/ticker');
    expect(url).toContain('C:EURUSD');
    // FXSW-088: the secret must not leak into the URL (logs/Referer); it rides
    // in the Authorization header instead.
    expect(url).not.toContain('apiKey');
    expect(url).not.toContain('secret');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret key');
  });

  it('throws a rate-limited ProviderError on HTTP 429', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 429 } as Response);
    await expect(
      fetchMids('KEY', ['EURUSD'], fetchImpl as unknown as typeof fetch),
    ).rejects.toMatchObject({ rateLimited: true });
  });

  it('throws a non-rate-limited ProviderError on other HTTP errors', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 500 } as Response);
    await expect(
      fetchMids('KEY', ['EURUSD'], fetchImpl as unknown as typeof fetch),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it('skips pairs whose close is missing or non-finite', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ results: [] }),
    } as unknown as Response);
    const mids = await fetchMids('KEY', ['EURUSD'], fetchImpl as unknown as typeof fetch);
    expect(mids).toEqual({});
  });
});
