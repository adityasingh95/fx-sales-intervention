---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
status: in-progress
ticket: FXSW-022
---

# Data model — `ClientProfile`

Per-client behaviour and engagement metadata. Consumed by the [suggestion engine](../components/suggestion-engine.md) to derive tier baseline + behavioural deltas.

```typescript
type ClientProfile = {
  clientId: string;
  clientName: string;
  tier: 'platinum' | 'gold' | 'standard' | 'new';
  recent30dVolume: number;             // notional traded, USD-equivalent
  recent30dAcceptanceRate: number;     // 0..1, fraction of quotes accepted
  averageMarginPaid: number;           // pips, weighted average over 30d
  recentBehaviorFlag: 'high_engagement' | 'price_sensitive' | 'normal' | 'flight_risk';
};
```

## Seed data (v1)

Five named profiles in `src/services/suggestion/clientProfiles.ts`. Each demo scenario uses one:

| Client | Tier | 30d vol (USD) | Accept rate | Behavior | Scenario |
|---|---|---|---|---|---|
| Acme Corp | platinum | 450M | 0.78 | high_engagement | [happy-path-esp.md](../scenarios/happy-path-esp.md) (ESP — no suggestion fires) |
| Globex Industries | standard | 35M | 0.62 | normal | [off-hours-intervention.md](../scenarios/off-hours-intervention.md) |
| Halcyon Capital | new | 0 | — | normal | [credit-breach.md](../scenarios/credit-breach.md) (credit-decline path — no margin proposed) |
| Northwind FX | gold | 120M | 0.71 | high_engagement | [size-limit-margin-tune.md](../scenarios/size-limit-margin-tune.md) |
| Polaris Holdings | standard | 18M | 0.34 | flight_risk | [release-path.md](../scenarios/release-path.md) (released before suggestion matters) |

Static for v1 — no profile updates from in-session trades.

## Lookup

`getClientProfile(clientName: string): ClientProfile`. Unknown client names return a default `'new'`-tier profile (defensive — protects the engine from undefined behaviour if a future scenario adds a client without registering a profile).

## Test contract

`clientProfiles.test.ts` asserts each named client returns the expected tier, volume, acceptance rate, behavior flag — drift-prone area per the [schema's code-drift checks](../WIKI_SCHEMA.md).

## Sources

- `docs/09-suggestion-engine.md` §3.1, §11 — profile shape + seed data
- `docs/BACKLOG.md` FXSW-022 — implementation ticket
