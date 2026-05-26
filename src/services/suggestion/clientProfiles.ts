import type { ClientProfile } from './types';

// Five named profiles from docs/09-suggestion-engine.md §11. Static for v1.
// Halcyon (new client) has no acceptance history; encoded as 0.5 so the
// engine's `acceptanceRate < 0.4` rule treats "no data" as neutral
// rather than "low acceptance" — see §11 footnote in dev-log.
const PROFILES: Record<string, ClientProfile> = {
  'Acme Corp': {
    clientId: 'acme-corp',
    clientName: 'Acme Corp',
    tier: 'platinum',
    recent30dVolume: 450_000_000,
    recent30dAcceptanceRate: 0.78,
    averageMarginPaid: 1.5,
    recentBehaviorFlag: 'high_engagement',
  },
  'Globex Industries': {
    clientId: 'globex-industries',
    clientName: 'Globex Industries',
    tier: 'standard',
    recent30dVolume: 35_000_000,
    recent30dAcceptanceRate: 0.62,
    averageMarginPaid: 3.0,
    recentBehaviorFlag: 'normal',
  },
  'Halcyon Capital': {
    clientId: 'halcyon-capital',
    clientName: 'Halcyon Capital',
    tier: 'new',
    recent30dVolume: 0,
    recent30dAcceptanceRate: 0.5,
    averageMarginPaid: 0,
    recentBehaviorFlag: 'normal',
  },
  'Northwind FX': {
    clientId: 'northwind-fx',
    clientName: 'Northwind FX',
    tier: 'gold',
    recent30dVolume: 120_000_000,
    recent30dAcceptanceRate: 0.71,
    averageMarginPaid: 2.5,
    recentBehaviorFlag: 'high_engagement',
  },
  'Polaris Holdings': {
    clientId: 'polaris-holdings',
    clientName: 'Polaris Holdings',
    tier: 'standard',
    recent30dVolume: 18_000_000,
    recent30dAcceptanceRate: 0.34,
    averageMarginPaid: 3.0,
    recentBehaviorFlag: 'flight_risk',
  },
};

export function getClientProfile(clientName: string): ClientProfile {
  const known = PROFILES[clientName];
  if (known) return known;
  return {
    clientId: 'unknown',
    clientName,
    tier: 'new',
    recent30dVolume: 0,
    recent30dAcceptanceRate: 0.5,
    averageMarginPaid: 0,
    recentBehaviorFlag: 'normal',
  };
}
