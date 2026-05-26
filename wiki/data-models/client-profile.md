---
last_updated: 2026-05-26
sources:
  - docs/09-suggestion-engine.md
  - docs/phase-summaries/FXSW-027-summary.md
status: stable
ticket: FXSW-022
---

# Data model — `ClientProfile`

Per-client behaviour and engagement metadata. Consumed by the [suggestion engine](../components/suggestion-engine.md) to derive tier baseline + behavioural deltas.

```typescript
type ClientTier = 'platinum' | 'gold' | 'standard' | 'new';

type ClientBehaviorFlag =
  | 'high_engagement'
  | 'price_sensitive'
  | 'normal'
  | 'flight_risk';

type ClientProfile = {
  clientId: string;
  clientName: string;
  tier: ClientTier;
  recent30dVolume: number;             // notional traded, USD-equivalent
  recent30dAcceptanceRate: number;     // 0..1, fraction of quotes accepted
  averageMarginPaid: number;           // pips, weighted average over 30d
  recentBehaviorFlag: ClientBehaviorFlag;
};
```

## Seed data (v1)

Five named profiles in `src/services/suggestion/clientProfiles.ts`. Each demo scenario uses one:

| Client | Tier | 30d vol (USD) | Accept rate | Avg margin | Behavior | Scenario |
|---|---|---|---|---|---|---|
| Acme Corp | platinum | 450M | 0.78 | 1.5 | high_engagement | [happy-path-esp.md](../scenarios/happy-path-esp.md) (ESP — no suggestion fires) |
| Globex Industries | standard | 35M | 0.62 | 3.0 | normal | [off-hours-intervention.md](../scenarios/off-hours-intervention.md) |
| Halcyon Capital | new | 0 | **0.5** | 0 | normal | [credit-breach.md](../scenarios/credit-breach.md) (credit-decline path — no margin proposed) |
| Northwind FX | gold | 120M | 0.71 | 2.5 | high_engagement | [size-limit-margin-tune.md](../scenarios/size-limit-margin-tune.md) |
| Polaris Holdings | standard | 18M | 0.34 | 3.0 | flight_risk | [release-path.md](../scenarios/release-path.md) (released before suggestion matters) |

Static for v1 — no profile updates from in-session trades.

### Halcyon's `recent30dAcceptanceRate = 0.5` (neutral prior)

Halcyon is a new client with no acceptance history. Encoding the missing data as `0` would have caused the [engine's](../components/suggestion-engine.md) `recent30dAcceptanceRate < 0.4` branch to fire and apply a `−0.5` "softer margin" delta — penalising the client for the absence of data. The seed instead encodes `0.5` (a neutral prior — half of the quotes accepted would be the expected baseline). Same principle for `averageMarginPaid = 0` (which the engine doesn't read, so the encoding is informational rather than load-bearing). Documented inline in `clientProfiles.ts` so the choice survives later readers.

## Lookup

`getClientProfile(clientName: string): ClientProfile`. Unknown client names return a default `'new'`-tier profile with `recent30dVolume: 0`, `recent30dAcceptanceRate: 0.5`, `averageMarginPaid: 0`, `recentBehaviorFlag: 'normal'` — the same neutral-prior shape as Halcyon. Defensive: protects the engine from undefined behaviour if a future scenario adds a client without registering a profile.

## Test contract

`clientProfiles.test.ts` (6 cases) asserts each named client returns the expected tier, volume, acceptance rate, behavior flag, and the unknown-client fallback. Drift-prone area — per the [schema's code-drift checks](../WIKI_SCHEMA.md) the seed values are verified against this table on every lint pass.

## Implementation

| Ticket | Commit |
|---|---|
| FXSW-022 | `59fff0e` |

## Sources

- `docs/09-suggestion-engine.md` §3.1, §11 — profile shape + seed data
- `docs/phase-summaries/FXSW-027-summary.md`
- `docs/dev-log.md` FXSW-022 — neutral-prior decision for Halcyon
- `docs/BACKLOG.md` FXSW-022
