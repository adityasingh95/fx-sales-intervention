# 09 — AI Margin Suggestion Engine

The ticket shows an **AI Margin Suggestion** panel — a recommended margin in pips with a one-line rationale and an Apply button. In a real deployment this would be backed by a model trained on historical fills, client outcomes, and market microstructure. In this prototype it is a **deterministic rule engine** that produces plausible, demoable suggestions from the deal context, a simulated client profile, and the current market state.

The phrase "AI" is used because that is how the desk would perceive and describe the feature. The implementation is a pure function. No external API calls, no actual ML.

## 1. Why this feature

Sales traders making manual prices on intervention deals do this calculus dozens of times a day, mostly from feel: how big is the trade, who is the client, how volatile is the pair right now, are we in a thin session, has this client been declining our prices lately. Automating that into a one-glance suggestion — with the trader retaining final authority via Apply / override — is a credible product story and a strong demo moment.

## 2. Position in the ticket

The Suggestion Panel sits **between the Reasons Panel and the Pricing Panel**. It is always visible when the ticket is in `PickedUp` state. It is hidden in `QuoteSent` / `Quoted` / `WithdrawSent` / `RejectSent` / `HoldSent` states (the trader has already committed; recomputing would be noise).

Visual treatment specified in `05-ui-ux-spec.md §4.5` (modern panel, subtle indigo accent, sparkle icon).

## 3. Inputs

```typescript
type SuggestionInput = {
  deal: {
    pair: string;
    side: 'BUY' | 'SELL';
    notional: number;
    defaultMarginPips: number;
    rejectionReasons: RejectionReason[];
  };
  client: ClientProfile;
  market: {
    currentBid: number;
    currentAsk: number;
    pairVolatility: number;       // pips per minute, rolling
    sessionLiquidity: 'high' | 'normal' | 'thin';
  };
};
```

### Client profile shape

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

### 3.1 How market inputs are derived (v1 prototype)

`market.currentBid` / `currentAsk` come from the live `PricingFeed.getLatest(pair)` snapshot at compute time.

`market.pairVolatility` and `market.sessionLiquidity` are **not** computed from the feed in v1 — they're looked up from static tables. This keeps the engine deterministic for tests and keeps the documented per-scenario expected outputs (§8) stable.

```typescript
// src/services/suggestion/marketContext.ts
const PAIR_VOLATILITY: Record<string, number> = {
  EURUSD: 0.5,
  GBPUSD: 0.8,
  USDJPY: 1.0,
  USDINR: 1.2,
};

export function getMarketContext(pair: string): Pick<SuggestionInput['market'], 'pairVolatility' | 'sessionLiquidity'> {
  return {
    pairVolatility: PAIR_VOLATILITY[pair] ?? 0.5,
    sessionLiquidity: 'normal',  // v1: never thin; threshold rule (§5) stays as v2 hook
  };
}
```

All four v1 pair vol values are ≤ 1.5, so the engine's `pairVolatility > 1.5` branch never fires in v1. The rule lives in the engine for v2 (when vol may come from a real feed).

## 4. Output

```typescript
type MarginSuggestion = {
  suggestedPips: number;
  confidence: 'low' | 'medium' | 'high';
  rationale: string;                   // single-line, human-readable, ≤ 120 chars
  factors: Array<{
    name: string;                      // e.g. "Notional size"
    delta: number;                     // pips added (positive) or removed (negative)
    note: string;                      // short explanation, ≤ 60 chars
  }>;
  computedAt: number;                  // Date.now()
};
```

`factors` is shown in the "Why?" expansion so a trader can audit the suggestion. Total of `factors.map(f => f.delta)` plus the base equals `suggestedPips`.

## 5. The rule engine

```typescript
// src/services/suggestion/engine.ts

const TIER_BASE: Record<ClientTier, number> = {
  platinum: 1.5,
  gold: 2,
  standard: 3,
  new: 4,
};

const HIGH_VOL_PAIRS = new Set(['USDJPY', 'USDINR']);

export function suggestMargin(input: SuggestionInput): MarginSuggestion {
  const factors: Factor[] = [];
  let base = TIER_BASE[input.client.tier];
  factors.push({
    name: 'Client tier',
    delta: 0,
    note: `${input.client.tier} client baseline ${base} pips`,
  });

  // 1. Notional size
  const notionalUsd = approxUsdNotional(input.deal);
  if (notionalUsd > 20_000_000) {
    base += 2.5;
    factors.push({ name: 'Notional size', delta: 2.5, note: '>20M USD-equivalent — material risk premium' });
  } else if (notionalUsd > 10_000_000) {
    base += 1.5;
    factors.push({ name: 'Notional size', delta: 1.5, note: '10–20M USD-equivalent' });
  } else if (notionalUsd > 5_000_000) {
    base += 0.5;
    factors.push({ name: 'Notional size', delta: 0.5, note: '5–10M USD-equivalent' });
  }

  // 2. Pair-level vol & liquidity
  if (input.market.pairVolatility > 1.5) {
    base += 1;
    factors.push({ name: 'Volatility', delta: 1, note: 'Above-normal vol on this pair' });
  }
  if (input.market.sessionLiquidity === 'thin') {
    base += 1.5;
    factors.push({ name: 'Session liquidity', delta: 1.5, note: 'Thin liquidity — wider spread justified' });
  }
  if (HIGH_VOL_PAIRS.has(input.deal.pair)) {
    base += 0.5;
    factors.push({ name: 'Pair class', delta: 0.5, note: 'Historically wider-spread pair' });
  }

  // 3. Rejection-reason context
  if (input.deal.rejectionReasons.includes('OFF_HOURS')) {
    base += 1.5;
    factors.push({ name: 'Off-hours', delta: 1.5, note: 'Quote outside standard session — risk premium' });
  }
  if (input.deal.rejectionReasons.includes('SIZE_LIMIT')) {
    base += 0.5;
    factors.push({ name: 'Size band breach', delta: 0.5, note: 'Above auto-pricer band — manual margin' });
  }
  // CREDIT_LIMIT is not handled here — see §7.

  // 4. Client behavior
  if (input.client.recentBehaviorFlag === 'flight_risk') {
    base -= 1;
    factors.push({ name: 'Retention', delta: -1, note: 'Recent decline streak — tightening to win business' });
  }
  if (input.client.recentBehaviorFlag === 'high_engagement' && input.client.recent30dVolume > 100_000_000) {
    base -= 0.5;
    factors.push({ name: 'VIP volume', delta: -0.5, note: 'Top-10 client by volume — preferred pricing' });
  }
  if (input.client.recent30dAcceptanceRate < 0.4) {
    base -= 0.5;
    factors.push({ name: 'Acceptance rate', delta: -0.5, note: 'Below 40% acceptance — softer margin' });
  }

  // 5. Floor & rounding
  const final = Math.max(1, Math.round(base));

  return {
    suggestedPips: final,
    confidence: computeConfidence(input),
    rationale: buildRationale(factors, final, input),
    factors,
    computedAt: Date.now(),
  };
}
```

## 6. Confidence

```typescript
function computeConfidence(input: SuggestionInput): 'low' | 'medium' | 'high' {
  // High: established client with rich behavior history + normal market conditions.
  if (
    input.client.tier !== 'new' &&
    input.client.recent30dVolume > 10_000_000 &&
    input.market.sessionLiquidity !== 'thin'
  ) {
    return 'high';
  }
  // Low: new client OR thin liquidity OR very small client.
  if (
    input.client.tier === 'new' ||
    input.market.sessionLiquidity === 'thin' ||
    input.client.recent30dVolume < 1_000_000
  ) {
    return 'low';
  }
  return 'medium';
}
```

## 7. CREDIT_LIMIT special case

When the rejection reasons include `CREDIT_LIMIT`, the suggestion panel **does not propose a margin**. Instead it shows:

> "Credit limit breach — recommend declining. Suggested action: Reject."

The Apply button is replaced with a **Reject** shortcut button that triggers the same action as the footer's Reject. This frames the AI as a guardrail, not a price-at-all-costs tool.

## 8. Rationale builder

The one-line rationale composes 2–3 of the largest-magnitude factors into a natural sentence. Examples (real outputs from the rule engine, given the seed scenarios):

- Scenario 2 (Globex / USDJPY / Off-Hours): **"Standard-tier client, off-hours USDJPY — suggesting 5 pips."**
- Scenario 4 (Northwind / 12M EURUSD / Size Limit): **"Gold-tier client with 12M EURUSD above auto-pricer band — suggesting 4 pips."**
- Scenario for a platinum client during normal hours on 2M EURUSD: **"Platinum client with strong recent acceptance — suggesting 2 pips."**

Template (pseudocode):

```
let parts = []
if (clientFactor) parts.push(clientFactor.note)
if (sizeFactor && |sizeFactor.delta| >= 1) parts.push(sizeFactor.note)
if (marketFactor && |marketFactor.delta| >= 1) parts.push(marketFactor.note)
return parts.join(', ') + ` — suggesting ${suggestedPips} pips.`
```

Cap at 120 chars; if longer, drop the lowest-magnitude factor.

## 9. Reactivity

The suggestion is computed:

1. When the ticket opens (after `PickedUp`).
2. When `pairVolatility` shifts by > 30% from the value used for the last computation.
3. When the trader explicitly clicks "Recompute" in the panel header.

Updates are **debounced at 800ms** to avoid flicker. The panel briefly shows a "Recomputing…" affordance during the debounce window.

The suggestion does **not** recompute on every price tick — that would be noise and would create an impression of overconfidence.

## 10. Apply

Clicking Apply:

1. Sets `marginPips` in the dealContext to `suggestion.suggestedPips`.
2. The Pricing Panel's margin field animates to the new value (200ms easing).
3. The Client Summary updates live (it was already reactive to margin).
4. The Suggestion Panel collapses to a confirmation strip: "Applied 4 pips · Undo" — the Undo button restores the previous margin and re-expands the panel.
5. The XState `dealMachine` records the apply event in `context.history` for the test contract.

## 11. Client profile seed data

Five named clients live in `src/services/suggestion/clientProfiles.ts`. Each scenario in `07-scenario-pack.md` uses one of these:

| Client | Tier | 30d vol (USD) | Accept rate | Behavior |
|---|---|---|---|---|
| Acme Corp | platinum | 450M | 0.78 | high_engagement |
| Globex Industries | standard | 35M | 0.62 | normal |
| Halcyon Capital | new | 0 | — | normal |
| Northwind FX | gold | 120M | 0.71 | high_engagement |
| Polaris Holdings | standard | 18M | 0.34 | flight_risk |

These are static for v1 — no profile updates from in-session trades.

## 12. Testability

The suggestion engine is a pure function and is the most-tested part of the prototype. Coverage targets:

- 100% branch coverage on `engine.ts`.
- Snapshot tests for each named client + each scenario from `07-scenario-pack.md`.
- E2E test: open ticket → suggestion appears within 800ms → click Apply → margin field shows suggested value → row's `data-margin-pips` attribute matches.

## 13. UI element selectors (test contract)

```html
<section data-testid="suggestion-panel" data-suggestion-state="ready">
  <div data-testid="suggestion-pips">4</div>
  <div data-testid="suggestion-confidence">high</div>
  <p data-testid="suggestion-rationale">Gold-tier client with 12M EURUSD…</p>
  <button data-testid="suggestion-apply">Apply</button>
  <button data-testid="suggestion-why">Why?</button>
</section>
```

`data-suggestion-state` values: `computing`, `ready`, `applied`, `credit-decline` (the §7 special case).

## 14. Out of scope for v1

- Real model inference or API calls.
- Per-trader personalisation ("this trader usually adds 1 pip on top of any suggestion").
- Historical fill outcomes feedback loop.
- A/B comparison view ("with vs without AI").
- Confidence intervals / probability of acceptance prediction.

## 15. Integration with the v2 dual-margin model

In v2 the Pricing Panel has two independent margin inputs (bid + ask) instead of one. The suggestion engine API is **unchanged**: `computeSuggestion(...)` still returns a single integer `suggestedPips`.

The panel consumes that single value as follows:

- **Apply** writes `suggestedPips` to both `marginBid` and `marginAsk`. The trader then nudges either side independently if desired.
- **Undo** restores the **pair** that was in place before Apply (both prior values), not a single number.
- The 600ms indigo glow animation triggers on **both** input cells simultaneously.
- The suggestion is direction-aware only insofar as it always recommends a markup magnitude — never a sign or a side. Direction inference happens in the Pricing Panel via `quoteSideFor(side, dealtCcy)`, not in the engine.

The engine's internal pip-delta values (tier baseline, notional band, market deltas, behaviour deltas, confidence thresholds) are unchanged. The pure-function contract from §3 is preserved, which keeps the test surface (34 unit tests + 7 rationale tests + 6 client-profile tests) intact across the v2 migration.

Future v2.x work could optionally return a `{ bidPips, askPips }` shape to model asymmetric tier-based skews; intentionally deferred for the v2 phase to keep the engine API stable for the Wiki Agent's code-drift checks.
- Audit log of overrides (could be valuable for v2 — "trader overrode AI in 23% of cases this week").
