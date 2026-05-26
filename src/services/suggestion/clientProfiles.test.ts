import { describe, expect, it } from 'vitest';
import { getClientProfile } from './clientProfiles';

describe('getClientProfile', () => {
  it('Acme Corp → platinum, 450M vol, 0.78 acceptance, high_engagement', () => {
    const p = getClientProfile('Acme Corp');
    expect(p.tier).toBe('platinum');
    expect(p.recent30dVolume).toBe(450_000_000);
    expect(p.recent30dAcceptanceRate).toBe(0.78);
    expect(p.recentBehaviorFlag).toBe('high_engagement');
  });

  it('Globex Industries → standard, 35M vol, 0.62 acceptance, normal', () => {
    const p = getClientProfile('Globex Industries');
    expect(p.tier).toBe('standard');
    expect(p.recent30dVolume).toBe(35_000_000);
    expect(p.recent30dAcceptanceRate).toBe(0.62);
    expect(p.recentBehaviorFlag).toBe('normal');
  });

  it('Halcyon Capital → new tier, 0 vol, neutral 0.5 acceptance, normal', () => {
    const p = getClientProfile('Halcyon Capital');
    expect(p.tier).toBe('new');
    expect(p.recent30dVolume).toBe(0);
    // Encoded as neutral 0.5 (no history) — see clientProfiles.ts comment.
    expect(p.recent30dAcceptanceRate).toBe(0.5);
    expect(p.recentBehaviorFlag).toBe('normal');
  });

  it('Northwind FX → gold, 120M vol, 0.71 acceptance, high_engagement', () => {
    const p = getClientProfile('Northwind FX');
    expect(p.tier).toBe('gold');
    expect(p.recent30dVolume).toBe(120_000_000);
    expect(p.recent30dAcceptanceRate).toBe(0.71);
    expect(p.recentBehaviorFlag).toBe('high_engagement');
  });

  it('Polaris Holdings → standard, 18M vol, 0.34 acceptance, flight_risk', () => {
    const p = getClientProfile('Polaris Holdings');
    expect(p.tier).toBe('standard');
    expect(p.recent30dVolume).toBe(18_000_000);
    expect(p.recent30dAcceptanceRate).toBe(0.34);
    expect(p.recentBehaviorFlag).toBe('flight_risk');
  });

  it('unknown client → new tier with safe neutral defaults', () => {
    const p = getClientProfile('Mystery Corp');
    expect(p.tier).toBe('new');
    expect(p.recent30dVolume).toBe(0);
    expect(p.recent30dAcceptanceRate).toBe(0.5);
    expect(p.recentBehaviorFlag).toBe('normal');
    expect(p.clientName).toBe('Mystery Corp');
  });
});
