---
last_updated: 2026-06-17
sources:
  - docs/02-functional-spec.md
  - docs/07-scenario-pack.md
  - docs/phase-summaries/FXSW-042-followup-summary.md
  - docs/phase-summaries/phase-10-ndf-summary.md
  - docs/phase-summaries/phase-11-swaps-summary.md
status: stable
ticket: FXSW-013, FXSW-078, FXSW-082
---

# Feature — Dev Injector

Hidden control panel that lets the demo operator inject pre-canned scenarios on demand. Visible only when the URL includes a `dev` query param. Replaces the right side of the header with a row of buttons.

> **Dev versions (current model).** `?dev=v3` enables the v3 [forward-pricing](forward-pricing.md) surface; **`?dev=v4` is a strict superset** adding the v4 instruments. The old `?dev=v2` / `?theme=preview` flags were promoted to GA and removed in FXSW-047, and the old `?dev=1` value now resolves to the v1 baseline — any value other than `v3` / `v4` is treated as v1. Gating is via `isV3()` / `isV4()` ([ADR-0012](../decisions/ADR-0012-dev-v4-instrument-gate.md)). Below the `md` breakpoint the row collapses into a `Dev ▾` popover. Component internals — dev-version gating, compact labels (the `RELEASE_PATH` button reads **`Hold/Release`**), the v4 instrument + far-tenor selectors, and the mobile dropdown — are in [components/dev-injector.md](../components/dev-injector.md).

## v4 instrument + tenor selectors

Under `?dev=v4` the injector adds, before the scenario buttons:

- a **tenor selector** (`data-testid="forward-tenor-select"`) — present from v3; injects the chosen scenario at that tenor. For a swap this is the **NEAR** leg.
- an **instrument selector** (`data-testid="inject-instrument"`, v4-only) — `Auto` / `NDF` / `Swap`. `Auto` keeps the v3 behaviour (SPOT/OUTRIGHT derived from the tenor); `NDF` forces a forward tenor; `Swap` reveals the far-tenor control.
- a **far-tenor selector** (`data-testid="inject-far-tenor"`, v4 + `Swap` only) — the **FAR** leg; an out-of-order (`far ≤ near`) choice is coerced to the shortest valid far in `buildSwapLegs` and surfaced via the "legs adjusted" note (see [features/swaps.md](swaps.md)).

## Buttons

One button per scenario plus a Reset session button:

| Button | Scenario ID | What it does |
|---|---|---|
| Inject: Happy Path ESP | `HAPPY_PATH_ESP` | Auto-priced EURUSD flows through Active → 5s pause → Historic, no SI interaction. |
| Inject: Off-Hours Intervention | `OFF_HOURS_INTERVENTION` | New SI deal with `OFF_HOURS` reason; client accepts ~1.5s after `Send Stream`. |
| Inject: Credit Breach | `CREDIT_BREACH` | New SI deal with `CREDIT_LIMIT` reason; trader rejects. |
| Inject: Size Limit + Margin Tune | `SIZE_LIMIT_MARGIN_TUNE` | New SI deal with `SIZE_LIMIT` reason; expects trader to widen margin first. |
| Inject: Release Path | `RELEASE_PATH` | New SI deal; trader picks up, then releases back to the desk. |
| Reset session | — | Calls `dealFeed.reset()`, stops every live actor, wipes both `deals` and `historic` in the store. |

Each inject button invokes `dealFeed.inject(scenarioId)`. The scenario player then drives the resulting `DealEvent`s into the deal feed — see [components/deal-feed.md](../components/deal-feed.md) and [components/scenario-player.md](../components/scenario-player.md).

Reset has a distinct red border to signal destructiveness.

## Why hidden by default

The injector is a demo/dev tool, not a trader-facing feature. Hiding it behind a `dev` query param means the bare-URL GA experience is the trader view while the injector remains one query-param away (`?dev=v3` / `?dev=v4`) for screenshares and async sharing.

## Test contract

```html
<header>
  <!-- Slot in App.tsx, gated by the presence of a `dev` query param -->
  <div data-testid="dev-injector-slot">
    <div data-testid="dev-injector">
      <button data-testid="inject-HAPPY_PATH_ESP">…</button>
      <button data-testid="inject-OFF_HOURS_INTERVENTION">…</button>
      <button data-testid="inject-CREDIT_BREACH">…</button>
      <button data-testid="inject-SIZE_LIMIT_MARGIN_TUNE">…</button>
      <button data-testid="inject-RELEASE_PATH">…</button>
      <button data-testid="inject-RESET">…</button>
    </div>
  </div>
</header>
```

- `data-testid="dev-injector-slot"` is the header slot wrapper in `App.tsx`; its presence/absence is how `App.test.tsx` asserts `?dev=1` gating.
- `data-testid="dev-injector"` is the inject-button row.
- Per-scenario buttons use `data-testid={\`inject-${id}\`}` (template literal) where `id` is the `ScenarioId` value.
- **Reset uses `data-testid="inject-RESET"`** (same `inject-*` prefix as the scenario buttons, since the same `<button>` shape is reused — Reset is structurally just another inject-slot rather than a separate testid family).

Each E2E scenario spec drives the first click via the corresponding `data-testid`. See the [Scenarios section of the index](../index.md#scenarios).

## Tests

`src/App.test.tsx` — **4 cases**. App renders without error; contains text "FX Sales Workstation"; **does NOT contain the banned vendor name** (vendor-neutrality assertion per the build-agent rule and [ADR-0010](../decisions/ADR-0010-brand-neutral-product.md)); `dev-injector-slot` visible with `?dev=1` + hidden without (via `window.history.replaceState`).

End-to-end coverage is per-scenario: [scenarios/happy-path-esp.md](../scenarios/happy-path-esp.md) drives the `inject-HAPPY_PATH_ESP` button + asserts the resulting blotter row; the four pending scenarios follow the same shape.

## Sources

- `docs/02-functional-spec.md` §6 — button enumeration, `?dev=1` gating
- `docs/07-scenario-pack.md` — scenario IDs and definitions
- `docs/BACKLOG.md` FXSW-013 — implementation ticket
