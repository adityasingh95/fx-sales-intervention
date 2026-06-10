---
last_updated: 2026-06-10
sources:
  - docs/02-functional-spec.md
  - docs/phase-summaries/FXSW-042-followup-summary.md
  - docs/dev-log.md
status: in-progress
---

# Component — Dev Injector

Implementation notes for the dev injector control. For the product-level description (what each scenario button does, why it's hidden, the v1 test contract) see the [Dev Injector feature page](../features/dev-injector.md); this page covers the component internals, the dev-version scenario gating, and the **v2 mobile dropdown**.

File: `src/features/dev-injector/DevInjector.tsx`. Hooks: `getDevVersion()` (`src/lib/devVersion.ts`) and [`useIsMobile()`](../components/test-patterns.md) (`src/lib/useIsMobile.ts`).

## Dev-version scenario gating

The visible scenario set depends on the dev version parsed from the URL:

- **`?dev=1` (or any `dev` query)** → v1 set: `HAPPY_PATH_ESP`, `OFF_HOURS_INTERVENTION`, `CREDIT_BREACH`, `SIZE_LIMIT_MARGIN_TUNE`, `RELEASE_PATH`.
- **`?dev=v2`** → v1 set **plus** the v2 additions `BOTH_SIDED_INQUIRY`, `QUOTE_DEALT_INQUIRY`.

```typescript
const visibleScenarios =
  devVersion === 'v2' ? [...V1_SCENARIO_IDS, ...V2_SCENARIO_IDS] : V1_SCENARIO_IDS;
```

`V1_SCENARIO_IDS` / `V2_SCENARIO_IDS` / `SCENARIO_IDS` are defined in `src/types/scenario.ts`. Each visible scenario renders a button; clicking it calls `dealFeed.inject(id)`.

## Button labels

Compact labels live in a `LABEL: Record<ScenarioId, string>` map (header buttons are space-constrained):

| Scenario ID | Label |
|---|---|
| `HAPPY_PATH_ESP` | `Happy ESP` |
| `OFF_HOURS_INTERVENTION` | `Off Hours` |
| `CREDIT_BREACH` | `Credit Breach` |
| `SIZE_LIMIT_MARGIN_TUNE` | `Size + AI` |
| `RELEASE_PATH` | `Hold/Release` |
| `BOTH_SIDED_INQUIRY` | `Both-Sided` |
| `QUOTE_DEALT_INQUIRY` | `Quote-Dealt` |

`RELEASE_PATH` reads **`Hold/Release`** (Phase 6.1 rename). The previous "Release" label collided with the ticket footer's own Release action; the slash form signals "this is a scenario, distinct from the footer button." See [scenarios/release-path.md](../scenarios/release-path.md).

## Desktop layout (≥ md)

A single inline row inside `data-testid="dev-injector"`: a muted `Dev` caption, one `inject-${id}` button per visible scenario, then an `inject-RESET` button with a red border to flag its destructiveness.

## Mobile layout (< md) — `MobileDevInjector`

Below Tailwind's `md` breakpoint (`useIsMobile()` → `true`), the inline row would overflow the narrow header, so the component renders a collapsed `MobileDevInjector` instead: a single `Dev ▾` toggle button (`data-testid="dev-injector-toggle"`) that opens a popover menu listing every scenario button plus Reset, stacked vertically.

**Popover positioning — `position: fixed` with viewport coords.** When the toggle opens, the component reads the button's `getBoundingClientRect()` once and stores `{ top: rect.bottom + 4, left: rect.left }`; the menu (`data-testid="dev-injector-menu"`) renders with `position: fixed` at those coordinates. Fixed-with-viewport-coords is deliberate over `position: absolute`: the header's injector slot carries `overflow-x-auto` on mobile, and a horizontal-overflow ancestor creates a paint clip on **both** axes — an absolutely-positioned popover anchored inside it gets chopped off. A fixed element is positioned against the viewport, so no ancestor's overflow context can clip it. This was preferred over an absolute-plus-`createPortal` approach for simplicity (no portal node, no mount/unmount sync with the backdrop).

To pair with this, `App.tsx`'s injector-slot wrapper flips its overflow class from `overflow-x-auto sm:overflow-visible` to `overflow-visible sm:overflow-x-auto` — mobile no longer needs horizontal scroll (it's just one button + popover), and removing the clip is belt-and-braces with the fixed positioning.

**Open / close.** Toggle button opens; a full-viewport `dev-injector-backdrop` (`fixed inset-0`) closes on outside click; an `Escape` keydown listener closes; and picking any scenario or Reset closes after firing. `aria-haspopup="menu"` + `aria-expanded` on the toggle, `role="menu"` on the popover.

## Reset behaviour

`Reset` (both layouts) calls `dealFeed.reset()`, stops every live deal actor (`entry.actor.stop()`), then clears the store (`deals: new Map(), historic: []`) and closes any open ticket (`openDealId: null`). Same semantics as the [feature page](../features/dev-injector.md) documents.

## Test contract

```html
<!-- desktop -->
<div data-testid="dev-injector">
  <button data-testid="inject-HAPPY_PATH_ESP">…</button>
  …
  <button data-testid="inject-RESET">…</button>
</div>

<!-- mobile -->
<div data-testid="dev-injector">
  <button data-testid="dev-injector-toggle" aria-haspopup="menu" aria-expanded="…">Dev ▾</button>
  <!-- when open: -->
  <div data-testid="dev-injector-backdrop"></div>
  <div data-testid="dev-injector-menu" role="menu" style="position:fixed; top:…; left:…">
    <button data-testid="inject-HAPPY_PATH_ESP">…</button>
    …
    <button data-testid="inject-RESET">…</button>
  </div>
</div>
```

Both layouts keep the **same `inject-${id}` / `inject-RESET` testids**, so existing per-scenario E2Es work at desktop widths unchanged. The `dev-injector-toggle` / `dev-injector-menu` / `dev-injector-backdrop` testids are mobile-only. `useIsMobile()` is mockable via `matchMedia` for tests — see [test-patterns.md](../components/test-patterns.md).

## Sources

- `docs/02-functional-spec.md` §6 — button enumeration, dev gating
- `docs/phase-summaries/FXSW-042-followup-summary.md` — Phase 6.1 items #5 (label rename) and #7 (mobile dropdown)
- `docs/dev-log.md` Phase 6.1 — mobile-dropdown decision (popover over bottom sheet), fixed-vs-portal rationale
- Commits `fc149cd` (mobile dropdown + label rename), `77c2f96` (unclip via fixed positioning + slot overflow flip)
