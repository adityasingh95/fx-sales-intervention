import { describe, expect, it } from 'vitest';
import { makeRequestId, makeTradeId } from './ids';
import { makeRng } from '@/services/feed/rng';

// FXSW-090 F-3 — display IDs come from an injectable random source so tests can
// pin them with a seeded generator; the REQ-/TRD- prefixes + 6-char format hold.
describe('ids', () => {
  it('default generator keeps the REQ-/TRD- 6-char format', () => {
    expect(makeRequestId()).toMatch(/^REQ-[A-Z0-9]{6}$/);
    expect(makeTradeId()).toMatch(/^TRD-[A-Z0-9]{6}$/);
  });

  it('a seeded rng pins the id deterministically (reproducible across runs)', () => {
    expect(makeRequestId(makeRng(42))).toBe(makeRequestId(makeRng(42)));
    expect(makeTradeId(makeRng(7))).toBe(makeTradeId(makeRng(7)));
    expect(makeRequestId(makeRng(42))).toMatch(/^REQ-[A-Z0-9]{6}$/);
  });

  it('different seeds generally produce different ids', () => {
    expect(makeRequestId(makeRng(1))).not.toBe(makeRequestId(makeRng(2)));
  });
});
