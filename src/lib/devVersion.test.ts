import { describe, expect, it } from 'vitest';
import { parseDevVersion } from './devVersion';

describe('parseDevVersion', () => {
  it('returns "v2" for ?dev=v2', () => {
    expect(parseDevVersion('?dev=v2')).toBe('v2');
  });

  it('returns "v1" for ?dev=1', () => {
    expect(parseDevVersion('?dev=1')).toBe('v1');
  });

  it('returns "v1" for ?dev with no value', () => {
    expect(parseDevVersion('?dev')).toBe('v1');
  });

  it('returns "v1" for ?dev=v3 (unsupported value)', () => {
    expect(parseDevVersion('?dev=v3')).toBe('v1');
  });

  it('returns "v1" for ?dev=V2 (case-sensitive — must be lowercase)', () => {
    expect(parseDevVersion('?dev=V2')).toBe('v1');
  });

  it('returns "v1" for empty query string', () => {
    expect(parseDevVersion('')).toBe('v1');
  });

  it('returns "v1" for a query string with other params', () => {
    expect(parseDevVersion('?foo=bar&baz=qux')).toBe('v1');
  });

  it('returns "v2" when ?dev=v2 sits alongside other params', () => {
    expect(parseDevVersion('?other=thing&dev=v2&extra=42')).toBe('v2');
  });
});
