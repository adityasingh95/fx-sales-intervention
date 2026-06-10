---
last_updated: 2026-06-10
sources:
  - docs/phase-summaries/FXSW-042-followup-summary.md
  - docs/dev-log.md
status: in-progress
---

# Component — Blotter Resize Handle

A draggable separator between the [Active](../features/active-blotter.md) and [Historic](../features/historic-blotter.md) blotter sections that lets the operator re-weight how much vertical space each gets. **v2-only** — it renders only when the dev version is `v2` (URL `?dev=v2`, via `getDevVersion()` → `isV2`). At v1 / no-query the two sections keep their static `55% / 45%` flex-basis split and no handle appears.

File: `src/components/ResizeHandle.tsx`. Split math: `src/lib/resizeMath.ts`. Persisted split value: [settingsStore](deals-store.md) (`sessionStorage` key `si.blotterSplit`).

## Two paired contracts

The feature only works when **both** halves are correct, and the Phase 6.1 fix had to repair each one separately:

1. **Event contract** — the handle (this component) translates pointer drags into a new split percentage.
2. **Layout contract** — `App.tsx` turns that percentage into actual section heights via grow-weighted flex.

The first-pass implementation got the event contract right but the layout contract wrong, so the handle "worked" in unit tests yet never moved anything in the browser. Both are documented below because changing one without the other re-breaks the feature.

## Props

```typescript
interface Props {
  split: number;                          // current Active-section weight, 20–80
  onSplitChange: (next: number) => void;  // wired to settingsStore.setBlotterSplit
  containerRef: React.RefObject<HTMLElement>; // the <main> flex container (App.tsx mainRef)
}
```

`containerRef` — **not** a `containerHeight` number — is the load-bearing choice. The handle reads `containerRef.current?.clientHeight` **live, at move-time**, so there is no stale value to go wrong. The earlier `containerHeight` prop started at `0` because the `ResizeObserver`-driven effect that measured `<main>` runs after first paint; the operator's first drag fired `computeNewSplit` with height `0`, which the math treats as a no-op (returns the unchanged split). Reading the ref inside `onMove` removes the race entirely.

## Event model

On `pointerdown` (`handlePointerDown`):

- `event.preventDefault()` + record `{ initialSplit, initialClientY }` in a ref.
- `setPointerCapture(pointerId)` (wrapped in `try/catch` — jsdom and older browsers may not implement it).
- **Listeners are attached synchronously**, inside the handler, directly to `document` — not registered through a `useEffect`. That closes the one-frame gap between React committing a "dragging" state and the effect wiring the listeners up, which otherwise drops the first few `pointermove` events.
- `onMove` reads the live container height, bails if `height <= 0`, then calls `computeNewSplit(...)` and forwards the result through `onSplitChange`.
- `onUp` (bound to `pointerup` + `pointercancel`) clears the drag ref and removes all three listeners.

## Split math (`resizeMath.ts`)

```typescript
export const BLOTTER_SPLIT_MIN = 20;
export const BLOTTER_SPLIT_MAX = 80;

export function computeNewSplit(initialSplit, initialClientY, currentClientY, containerHeight) {
  if (containerHeight <= 0) return initialSplit;            // no-op guard
  const delta = currentClientY - initialClientY;
  const next = initialSplit + (delta / containerHeight) * 100;
  return Math.max(BLOTTER_SPLIT_MIN, Math.min(BLOTTER_SPLIT_MAX, next));
}
```

Drag distance is converted to a percentage of the container height and added to the starting split, clamped to the `20–80` band so neither blotter can be squeezed to nothing.

## Layout contract (`App.tsx`) — grow-weighted flex

The split percentage is applied to the two blotter `<section>`s as **grow-weighted flex**, not as a percentage `flex-basis`:

```tsx
// Active section
style={{ flex: `${blotterSplit} 1 0` }}
// Historic section
style={{ flex: `${100 - blotterSplit} 1 0` }}
```

Each section also carries `min-h-0 overflow-hidden`, and `<main>` is `flex flex-1 flex-col`.

**Why not `flex-basis: 55%`?** A percentage `flex-basis` on a column-flex child does **not** resolve when the parent's main-axis size is *stretched* (`<main>` gets its height from `flex: 1`, which is not a "definite" size) rather than explicitly set. In that case the browser falls back to sizing the child by its content — the sections collapsed to roughly content height (≈104px) instead of the intended fraction of the ≈742px main area, so updating `blotterSplit` changed nothing visible. Grow-weighted `flex: <weight> 1 0` sidesteps the rule: the two weights (`blotterSplit` and `100 - blotterSplit`) divide the available main-axis space by ratio with no dependence on a definite basis. This is the standard split-pane pattern. The constraint is documented inline in `App.tsx`; treat it as the *layout* half of the handle's contract.

## Test contract

```html
<div
  data-testid="blotter-resize-handle"
  data-dragging="true"                 // present only while a drag is in flight
  role="separator"
  aria-orientation="horizontal"
  aria-valuenow="55" aria-valuemin="20" aria-valuemax="80"
  aria-label="Resize blotter split"
></div>
```

Hit area is `h-2` (8px) with a centered 1px visible bar that brightens on hover and while dragging.

## Tests

`src/components/ResizeHandle.test.tsx` drives the new `containerRef` API — it provides a ref whose `clientHeight` is stubbed, dispatches synthetic `pointerdown` / `pointermove` / `pointerup`, and asserts `onSplitChange` receives the clamped split. Note the caveat surfaced in Phase 6.1: this unit test passed against the *first* implementation too, because it exercises only the event contract. The grow-weighted-flex layout fix was verified by live DOM inspection (section heights actually shifting on drag), not by a unit test. There is no e2e spec for the handle.

## Sources

- `docs/phase-summaries/FXSW-042-followup-summary.md` — Phase 6.1 items #6 (resize handle) and the layout-quirk write-up
- `docs/dev-log.md` Phase 6.1 — implementation notes + agent-directed `containerRef` / grow-weighted-flex decisions
- Commits `fc149cd` (first-pass handle + `min-h-0`), `0fc2d0d` (grow-weighted flex + `containerRef` live-read)
