import { describe, expect, it } from 'vitest';
import { buildSwapLegs, tenorRank } from '@/types/deal';

// FXSW-082 — forward-forward swap legs: NEAR + FAR with FAR strictly later.
describe('buildSwapLegs', () => {
  it('builds NEAR + FAR with the requested far when far is strictly later', () => {
    expect(buildSwapLegs('1M', '6M')).toEqual([
      { kind: 'NEAR', tenor: '1M' },
      { kind: 'FAR', tenor: '6M' },
    ]);
  });

  it('supports a SPOT near leg (forward-forward where near is spot)', () => {
    expect(buildSwapLegs('SPOT', '3M')).toEqual([
      { kind: 'NEAR', tenor: 'SPOT' },
      { kind: 'FAR', tenor: '3M' },
    ]);
  });

  it('coerces a far equal to near up to the next tenor (far ≤ near rejected)', () => {
    const [near, far] = buildSwapLegs('3M', '3M');
    expect(near.tenor).toBe('3M');
    expect(tenorRank(far.tenor)).toBeGreaterThan(tenorRank(near.tenor));
    expect(far.tenor).toBe('6M');
  });

  it('coerces a far earlier than near up to the next tenor after near', () => {
    expect(buildSwapLegs('6M', '1M')).toEqual([
      { kind: 'NEAR', tenor: '6M' },
      { kind: 'FAR', tenor: '9M' },
    ]);
  });

  it('defaults the far to the tenor immediately after near when far is omitted', () => {
    expect(buildSwapLegs('1M')).toEqual([
      { kind: 'NEAR', tenor: '1M' },
      { kind: 'FAR', tenor: '2M' },
    ]);
  });

  it('steps near back when near is the last tenor so a strictly-later far exists', () => {
    const [near, far] = buildSwapLegs('1Y', '1Y');
    expect(tenorRank(far.tenor)).toBeGreaterThan(tenorRank(near.tenor));
    expect(near.tenor).toBe('9M');
    expect(far.tenor).toBe('1Y');
  });
});
