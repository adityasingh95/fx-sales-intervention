---
last_updated: 2026-06-10
sources:
  - docs/02-functional-spec.md
  - docs/07-scenario-pack.md
  - docs/phase-summaries/FXSW-042-followup-summary.md
status: stable
ticket: FXSW-013
---

# Feature — Dev Injector

Hidden control panel that lets the demo operator inject pre-canned scenarios on demand. Visible only when the URL includes a `dev` query param. Replaces the right side of the header with a row of buttons.

> **Dev versions + mobile:** `?dev=1` shows the five v1 scenarios below; `?dev=v2` additionally surfaces the v2 scenarios (`BOTH_SIDED_INQUIRY`, `QUOTE_DEALT_INQUIRY`). Below the `md` breakpoint the row collapses into a `Dev ▾` popover. Component internals — the dev-version gating, the compact button labels (the `RELEASE_PATH` button now reads **`Hold/Release`**), and the mobile dropdown — are documented in [components/dev-injector.md](../components/dev-injector.md).

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

The injector is a demo/dev tool, not a trader-facing feature. Hiding it behind `?dev=1` means the production-look URL is the trader experience while the injector remains one query-param away for screenshares and async sharing.

## Test contract

```html
<header>
  <!-- Slot in App.tsx, gated by ?dev=1 -->
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
