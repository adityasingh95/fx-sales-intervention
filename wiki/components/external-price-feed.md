---
last_updated: 2026-06-16
sources:
  - docs/02-functional-spec.md
  - docs/04-dummy-feed-spec.md
  - docs/05-ui-ux-spec.md
  - docs/phase-summaries/phase-08-v3-summary.md
  - docs/dev-log.md
status: in-progress
ticket: FXSW-050..FXSW-053
---

# Component — External Price Feed

An **opt-in runtime market-data adapter** (v3, behind `?dev=v3`) that periodically fetches reference rates from an **external market-data provider** and uses them to re-anchor the simulated [pricing feed](pricing-feed.md). It is **OFF by default**; nothing reaches the network until the operator enters an API key in the GUI and enables it. The deterministic simulation remains the only path used by tests and the six Playwright scenario specs — none of them turn this on.

> **Brand-neutrality:** the provider is referred to only as "an external market-data provider." No vendor name, product name, or endpoint host appears in this page, in any user-visible string, or in the status pill — per [ADR-0010](../decisions/ADR-0010-brand-neutral-product.md) and `wiki/CLAUDE.md` §1. (The adapter *code* under `src/services/feed/external/` carries a single provider URL behind a build-layer exception; that exception does not extend to the wiki.)

## Module layout

All under `src/services/feed/external/`:

| File | Role |
|---|---|
| `externalFeed.ts` | Singleton orchestrator. `enable(apiKey)` / `disable()` / `getStatus()` / `subscribeStatus(cb)`. Bridges successful polls into `pricingFeed.setReferences(mids)`. |
| `poller.ts` | Pure scheduling controller — self-rescheduling `setTimeout` loop, immediate first poll, exponential backoff on error capped at 30 min, `stopped` guard against races. |
| `provider.ts` | The adapter that actually calls the external provider and normalises the response to a `MidMap`. Per-pair rounding (4dp majors, 2dp JPY/INR). Surfaces a `ProviderError` with a `rateLimited` flag on HTTP 429. `fetchImpl` is injectable for tests. |
| `wireExternalFeed.ts` | Store→service bridge. Subscribes to the settings store and calls `externalFeed.enable/disable` when the key or enabled-flag changes. Mounted from `main.tsx` under `isV3()`. |
| `types.ts` | `ExternalFeedStatus`, `MidMap` (`Partial<Record<Pair, number>>`). |

## Pricing-feed seam (FXSW-050)

The simulator gained two methods so the external anchor can be injected without touching the random-walk logic:

- `pricingFeed.setReferences(mids: MidMap)` — replaces the reference-mid anchor for the given pairs.
- `pricingFeed.clearReferences()` — reverts to the baked reference mids.

Between polls the existing seeded randomizer keeps ticking (~300ms), **mean-reverting toward the new anchor**, so prices stay live and smooth rather than jumping only every 5 minutes. See [pricing-feed.md](pricing-feed.md) for the random-walk model.

## Poll cycle

1. Operator enters an API key and ticks "Use live external prices" (see settings UI below).
2. `wireExternalFeed` calls `externalFeed.enable(key)`; the poller fires an **immediate** first poll, then every **5 minutes** (`DEFAULT_POLL_MS`).
3. On success the provider returns current mids → `setReferences(mids)` → status `live`.
4. On failure the poller backs off exponentially (cap 30 min) and reports `error` or `rate-limited`.
5. `disable()` stops the loop and leaves the last anchor in place until the next enable or a `clearReferences()`.

The adapter targets a free-tier-friendly **previous-close aggregate** endpoint (an agent-directed choice so a no-cost key works); the close already arrives in pair convention, so no inversion is needed.

## Status states + settings UI

`ExternalFeedStatus = 'off' | 'connecting' | 'live' | 'error' | 'rate-limited'`.

`src/features/settings/ExternalFeedPanel.tsx` renders a header status pill plus a gear-button popover (v3-only). All labels are generic:

| Status | Pill label | Colour |
|---|---|---|
| `off` | Off | grey |
| `connecting` | Connecting | blue |
| `live` | Live | green |
| `error` | Error | red |
| `rate-limited` | Rate limited | amber |

Popover (`role="dialog"`, "Market data feed"): a password-type **API key** input + a **"Use live external prices"** checkbox (disabled until a key is present) + the note *"Polls every 5 minutes and seeds the price engine. Key is kept for this session only."*

### Key storage

The API key lives in the settings store (`externalFeedKey`) and persists to **`sessionStorage`** only (key `si.externalFeedKey`), alongside `externalFeedEnabled`. It is never bundled and never leaves the session — consistent with the prototype's persistence rule (small UI prefs in `sessionStorage`).

## Test contract

```html
<span data-testid="external-feed-status" data-feed-status="off">…Off…</span>
<button data-testid="external-feed-toggle" aria-label="Market data settings">⚙</button>
<!-- popover open: -->
<input data-testid="external-feed-key-input" type="password" />
<input data-testid="external-feed-enable" type="checkbox" />
```

`data-feed-status` mirrors the live status enum; the pill text is one of the generic labels above. A unit test asserts the pill text contains **no** provider name.

## Tests

`provider.test.ts` (injected `fetchImpl`, rounding, 429→`rateLimited`), `poller.test.ts` (immediate first poll, 5-min reschedule, backoff cap, stop guard), `wireExternalFeed.test.ts` (enable/disable dedup on store changes), and `ExternalFeedPanel.test.tsx` (status labels + the vendor-name-absence assertion). All run against the simulation/mock — no real network call in any test.

## Sources

- `docs/02-functional-spec.md` §10 (external price ingestion), §11 (v3 feedback)
- `docs/04-dummy-feed-spec.md` — external endpoint behaviour (read for behaviour only; host stays in the build layer)
- `docs/05-ui-ux-spec.md` §17 — external-feed settings panel
- `docs/phase-summaries/phase-08-v3-summary.md` — FXSW-050..FXSW-053
- `docs/dev-log.md` FXSW-050..FXSW-053
- Commit `1631e0a` (Phase 8)
