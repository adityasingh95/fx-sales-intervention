# 04 — Dummy Feed Specification

The dummy feed replaces every backend system in the Caplin SI architecture: quote ticket, quote handler, risk system, pricing system. It runs entirely in the browser. No network, no WebSocket, no setTimeout-based polling — just an event emitter and a couple of intervals.

## 1. Two channels

### `PricingFeed`
Emits continuous bid/ask updates for each supported currency pair.

### `DealFeed`
Emits new deals (both ESP and SI), client decisions on outstanding quotes, and expiry/cancel events.

Both implement a common `Subscribable<T>` interface and live under `/src/services/feed/`.

## 2. Supported pairs (v1)

Reference mids are **bootstrapped at build time** from Frankfurter (see §10). The values below are illustrative — the actual `referenceMids.json` is regenerated on every build so the demo never opens with stale-looking numbers.

| Pair | Reference mid (May 2026 anchor) | Pip position | Realistic spread (pips) |
|---|---|---|---|
| EURUSD | 1.1715 | 4th decimal | 0.5 |
| GBPUSD | 1.3510 | 4th decimal | 1.0 |
| USDJPY | 157.77 | 2nd decimal | 1.0 |
| USDINR | 95.67 | 2nd decimal | 2.0 |

The four pairs cover two pip-precision regimes (4-decimal vs 2-decimal JPY-style), one EM pair, and the operator's home market (INR) — small but credible coverage.

## 3. PricingFeed behavior

### 3.1 Price model

Simple random walk around the reference mid:

```
next_mid = current_mid + N(0, σ) * pipSize
bid = next_mid - spread/2 * pipSize
ask = next_mid + spread/2 * pipSize
```

Where `σ` is a per-pair volatility multiplier (in pips):
- EURUSD: 0.3
- GBPUSD: 0.4
- USDJPY: 0.3
- USDINR: 0.5

Mids drift but are gently mean-reverted toward the reference (10% pull per tick) so prices don't wander absurdly during a demo.

### 3.2 Tick frequency

300ms per tick. Each tick updates **all** supported pairs simultaneously. Fast enough to feel live, slow enough to read.

### 3.3 Message shape

```typescript
type PriceTick = {
  pair: string;          // "EURUSD"
  bid: number;           // 1.08495
  ask: number;           // 1.08505
  mid: number;           // 1.08500
  timestamp: number;     // Date.now()
};
```

### 3.4 Public API

```typescript
interface PricingFeed {
  subscribe(pair: string, cb: (tick: PriceTick) => void): () => void;
  getLatest(pair: string): PriceTick | null;
  start(): void;
  stop(): void;
}
```

The returned function from `subscribe` unsubscribes. Calling `start()` is idempotent; the dev injector "Reset session" calls `stop()` then `start()`.

## 4. DealFeed behavior

### 4.1 Inputs

The DealFeed does **not** auto-generate deals. It is **scenario-driven**. The dev injector calls `dealFeed.inject(scenarioId)` and the feed plays a pre-defined script of events.

This is a deliberate design choice: random deal generation in a demo creates noise. Scripted scenarios are reproducible, demoable, and testable.

### 4.2 Event types

```typescript
type DealEvent =
  | { type: 'NEW_SI_DEAL'; deal: Deal; rejectionReasons: RejectionReason[] }
  | { type: 'NEW_ESP_DEAL'; deal: Deal }
  | { type: 'CLIENT_ACCEPT'; dealId: string }
  | { type: 'CLIENT_REJECT'; dealId: string }
  | { type: 'CLIENT_CANCEL'; dealId: string }
  | { type: 'EXPIRE'; dealId: string };
```

### 4.3 Deal shape

```typescript
type Deal = {
  dealId: string;            // "d_" + nanoid(6)
  clientName: string;        // e.g. "Acme Corp"
  accountCode: string;       // e.g. "ACME-EUR-1"
  pair: string;              // "EURUSD"
  side: 'BUY' | 'SELL';
  notional: number;          // in base CCY units, e.g. 5_000_000
  tenor: 'SPOT';             // v1 only
  defaultMarginPips: number; // typically 3
  createdAt: number;
};

type RejectionReason = 'OFF_HOURS' | 'SIZE_LIMIT' | 'CREDIT_LIMIT';
```

### 4.4 Public API

```typescript
interface DealFeed {
  subscribe(cb: (event: DealEvent) => void): () => void;
  inject(scenarioId: ScenarioId): void;   // start a scripted scenario
  reset(): void;                          // clear all in-flight scenarios
}
```

## 5. Scenarios (the script library)

Five scenarios in v1. Each is a list of `{ delayMs, event }` pairs, played out by the DealFeed when `inject()` is called.

### 5.1 `HAPPY_PATH_ESP`
1. t=0: `NEW_ESP_DEAL` — Acme Corp BUY 1M EURUSD
2. t=2000: `CLIENT_ACCEPT` for that deal

Expected UI: row appears with `AUTO` status, after 2s flips to `EXECUTED`, dims, vanishes from Active at t=7000, lands in Historic.

### 5.2 `OFF_HOURS_INTERVENTION`
1. t=0: `NEW_SI_DEAL` — Globex Industries SELL 5M USDJPY, reasons: `['OFF_HOURS']`
2. (await trader Send Stream)
3. +1500ms after `SEND_STREAM`: `CLIENT_ACCEPT`

Expected: amber notification, ticket opens with off-hours reason, trader sends stream, client accepts ~1.5s later, deal lands in Historic.

### 5.3 `CREDIT_BREACH`
1. t=0: `NEW_SI_DEAL` — Halcyon Capital BUY 25M GBPUSD, reasons: `['CREDIT_LIMIT']`
2. (await trader action)

Expected: trader reviews credit reason and **rejects**; deal lands in Historic as `REJECTED_BY_TRADER`. No further client events fire.

### 5.4 `SIZE_LIMIT_MARGIN_TUNE`
1. t=0: `NEW_SI_DEAL` — Northwind FX SELL 12M EURUSD, reasons: `['SIZE_LIMIT']`
2. (await trader Send Stream; design assumption: trader will widen margin first)
3. +2000ms after `SEND_STREAM`: `CLIENT_ACCEPT`

Expected: trader widens margin (e.g. 3 → 6 pips), client summary updates live, send stream, accept.

### 5.5 `RELEASE_PATH`
1. t=0: `NEW_SI_DEAL` — Polaris Holdings BUY 3M USDINR, reasons: `['SIZE_LIMIT']`
2. (await trader action)

Expected: trader opens, reviews, clicks Release. Deal returns to `PENDING_INTERVENTION`; row remains in Active. (No automatic second-trader pickup in v1 — operator can re-open and finish if they want.)

## 6. Client simulation logic

For scenarios that include client decisions (`HAPPY_PATH_ESP`, `OFF_HOURS_INTERVENTION`, `SIZE_LIMIT_MARGIN_TUNE`):

- The scenario fires `CLIENT_ACCEPT` after a fixed delay following the relevant action.
- The DealFeed listens to deal status changes via the deal store and triggers the queued event when the precondition state is reached. If the trader never sends, no acceptance fires — the scenario quietly stalls.

## 7. Implementation notes

- **No real `setInterval` in production code paths** beyond the PricingFeed's 300ms tick and the DealFeed's scenario player. Anything else (animations, expiry timers) lives in XState `after` transitions or React refs cleaned in `useEffect`.
- **All timers cancelled on `reset()`.** A demo operator clicking Reset should land in a clean state with no orphan callbacks.
- **Seedable random.** The price-walk RNG accepts an optional seed (default: random) for reproducible E2E tests. Playwright pins the seed via `window.__seedFeed = 42` injected before page load.
- **No floating-point sin.** Use `mid + bias * pipSize` arithmetic, then round to the pair's pip precision (4 or 2 decimals) for display.

## 8. Test surface

Unit tests on the feed:
- `pricingFeed.start()` emits ticks for every subscribed pair within 600ms.
- Seeded run produces deterministic price sequence.
- `dealFeed.inject('OFF_HOURS_INTERVENTION')` emits `NEW_SI_DEAL` synchronously, queues `CLIENT_ACCEPT` for after `SEND_STREAM`.
- `dealFeed.reset()` cancels pending events and stops new emissions.

E2E (per scenario): see `08-test-plan.md`.

## 9. Out of scope

- Multiple liquidity sources / hierarchical pricing.
- Volume-band-dependent pricing.
- Forward points and tenor curves.
- News-driven price spikes.
- Realistic stochastic models (GBM, jump-diffusion). The random walk is sufficient for a demo.
- Real bid/ask spread skew based on market depth.

## 10. Sourcing reference rates

Reference mids are bootstrapped at **build time**, not runtime. A `prebuild` script fetches the latest end-of-day mids from a free, central-bank-backed source and writes them to `src/services/feed/referenceMids.json`. The PricingFeed loads this JSON at startup and uses each entry as the anchor for that pair's random walk.

This approach has the right tradeoffs for a prototype:
- No runtime network dependency — demos work offline, no flaky API to break things mid-pitch.
- No API key, no signup, no rate limits to manage.
- Rates stay current as long as the build pipeline runs occasionally.
- The random walk simulates intraday movement — daily-resolution source data is sufficient.

### Primary source: Frankfurter

[Frankfurter](https://frankfurter.dev/) is a free, open-source FX API aggregating from the ECB and 82 central banks. No key, no signup. Daily rates updated around 16:00 CET each working day.

### Bootstrap script

`scripts/fetch-reference-mids.ts`:

```typescript
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const PAIRS = ['EUR', 'GBP', 'JPY', 'INR'] as const;
const OUT = resolve('src/services/feed/referenceMids.json');

// Hard-coded fallback in case Frankfurter is unreachable at build time.
// Refresh manually if this file is the only source for > 1 month.
const FALLBACK = {
  date: '2026-05-13',
  source: 'fallback',
  mids: { EURUSD: 1.1715, GBPUSD: 1.3510, USDJPY: 157.77, USDINR: 95.67 },
};

async function main() {
  try {
    const url = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=${PAIRS.join(',')}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { date: string; rates: Record<string, number> };

    const mids = {
      EURUSD: round(1 / data.rates.EUR, 4),
      GBPUSD: round(1 / data.rates.GBP, 4),
      USDJPY: round(data.rates.JPY, 2),
      USDINR: round(data.rates.INR, 2),
    };

    await writeFile(OUT, JSON.stringify({ date: data.date, source: 'frankfurter.dev', mids }, null, 2));
    console.log(`Reference mids written for ${data.date}:`, mids);
  } catch (err) {
    console.warn(`Frankfurter fetch failed (${(err as Error).message}); using fallback.`);
    await writeFile(OUT, JSON.stringify(FALLBACK, null, 2));
  }
}

const round = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;
main();
```

Wire into `package.json`:

```json
{
  "scripts": {
    "prebuild": "tsx scripts/fetch-reference-mids.ts",
    "predev":   "tsx scripts/fetch-reference-mids.ts",
    "build":    "vite build",
    "dev":      "vite"
  }
}
```

The script always writes a valid file — if the network fails it falls back to the hard-coded values, so a build never breaks because of a network blip.

### Alternative sources (if Frankfurter is ever unreachable)

- **ECB direct XML/CSV:** https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml — EUR-based, no key. Slightly more parsing.
- **exchangerate-api.com open access:** https://open.er-api.com/v6/latest/USD — daily, no key, requires attribution string in the UI.
- **Frankfurter self-hosted:** Frankfurter is OSS; can be run as a Docker container in CI if a hosted dependency is unacceptable.

### v2: live streaming

If a future version of the prototype needs **actual live ticks** instead of synthesized walk-around-mids, three options worth evaluating:

| Provider | Best for | Friction |
|---|---|---|
| **TraderMade** | FX-first, WebSocket, generous free tier (1000 req/mo) | API key, modest setup |
| **OANDA v20 practice API** | Highest fidelity for FX practice rates | Free demo account required |
| **Polygon.io FX** | If equities + FX in the same app later | Free tier is 15-min delayed |

For v1 this is explicitly out of scope — the bake-at-build approach gives 95% of the demo value at 5% of the integration cost.
