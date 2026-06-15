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
      .fn<Parameters<typeof fetch>, Promise<Response>>()
      .mockResolvedValueOnce(okResponse(1.17234))
      .mockResolvedValueOnce(okResponse(157.778));
    const mids = await fetchMids('KEY', ['EURUSD', 'USDJPY'], fetchImpl as unknown as typeof fetch);
    expect(mids).toEqual({ EURUSD: 1.1723, USDJPY: 157.78 });
  });

  it('passes the api key and C: symbol in the request URL', async () => {
    const fetchImpl = vi
      .fn<Parameters<typeof fetch>, Promise<Response>>()
      .mockResolvedValue(okResponse(1.1));
    await fetchMids('secret key', ['EURUSD'], fetchImpl as unknown as typeof fetch);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).toContain('C:EURUSD');
    expect(url).toContain('apiKey=secret%20key');
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
