# 11 — Optimization Report (Performance, Size, Maintainability)

> Status: **Report only.** No code changes have been made. Every item below is
> scoped to be executed independently in a later pass.
>
> Date: 2026-06-19 · Branch of record: `claude/quirky-goodall-dd9fma`

## Context

The FX Sales Workstation is a healthy, well-organized React 18 + Vite 5 prototype:
~14.3k LOC under `src/`, 9 runtime dependencies, no heavy static assets, strict
TypeScript, and zero dead code / TODO markers. **It is not in a degraded state** —
there is no single "fix this or it's broken" item. This report catalogs every
worthwhile optimization avenue across three axes, ranked by value vs. risk so they
can be picked off one at a time.

Primary focus, per direction: **runtime performance**, then bundle/code size, then
maintainability.

**Non-negotiable constraints honored throughout:**

- No behavior or UX change.
- Canonical state names and `data-*` test attributes stay stable (CLAUDE.md rule 7).
- Simulated feed remains the default and only test/E2E path (rule 3).
- Build output stays brand-neutral (rule 2).
- All transitions continue to flow through XState (no direct state sets, rule 8/9).
- Tests stay green (`lint`, `typecheck`, `test:run`, `test:e2e`).

### Verified baseline facts

These were confirmed by reading the source, and ground every recommendation:

| Fact | Evidence |
|------|----------|
| Pricing feed ticks every **300ms** for **all 4 pairs unconditionally** | `src/services/feed/pricingFeed.ts:77-100,127` |
| `useActiveDeals` returns `[...state.deals.values()]` — a **fresh array on every store update** under default `Object.is` equality | `src/state/stores/dealsStore.ts:336,340` |
| **No `React.memo` anywhere**; one `useCallback`, zero `useMemo` in feature code | `TicketPanel.tsx:70` is the lone `useCallback` |
| Vite has **no `manualChunks`, no chunk-size budget, no analyzer, no code-splitting** | `vite.config.ts` |
| Largest production files exceed the 300-line guideline | TicketPanel 435, dealsStore 345, SuggestionPanel 329 |
| Custom build-only **CSP + SRI** Vite plugins post-process emitted assets | `vite.config.ts:32-86` |
| Per-deal removal is **XState `after:` driven (5s)**, not JS timers | `siMachine.ts`, `rfsMachine.ts`, `timings.ts:10` |
| Estimated bundle ~150–170 KB gzipped (unmeasured — no analyzer) | dependency footprint |

---

## Part 1 — Runtime Performance (PRIORITY)

### P1 — Isolate price-tick re-renders from structural re-renders ⭐ highest leverage

- **Where:** `src/features/blotter/RateCell.tsx`, `src/features/blotter/ActiveBlotter.tsx`, `src/services/feed/usePrice.ts`
- **Now:** Every blotter Row renders a `RateCell` that subscribes to the 300ms feed via local `setTick`. Rows are **not** `React.memo`'d, and `ActiveBlotter` re-renders the entire list on any deal mutation. Both the structural parent and each cell churn ~3×/sec.
- **Do:** Keep tick updates scoped to the leaf `RateCell` (they largely are, via `usePrice`), then wrap `RateCell` and each Row in `React.memo`. A tick then repaints only the rate text node; a single deal's state change repaints only that one row, not the list.
- **Risk:** Low — pure render-scoping, no visual or behavioral change.
- **Verify:** React DevTools Profiler before/after; existing blotter tests; inline handlers (`ActiveBlotter.tsx:66,199`) must be stabilized (`useCallback`) or memo won't engage.

### P2 — Fix `useActiveDeals` selector identity

- **Where:** `src/state/stores/dealsStore.ts:336,340`
- **Now:** `selectActiveDeals = (s) => [...s.deals.values()]` allocates a new array on every store update; with Zustand v4 default equality this re-renders `ActiveBlotter` (and its full row tree) even for unrelated changes.
- **Do:** Use `useShallow` for the array selector (or expose a reference that changes only when Map contents change). With P1's memoized rows, an unrelated single-deal patch no longer repaints the table.
- **Risk:** Low–Medium. Requires `DealEntry` references to stay stable across unrelated updates — `replaceEntry` (`:107-117`) already clones only the touched entry, so this holds.
- **Verify:** `dealsStore.test.ts`, `ActiveBlotter.test.tsx`.

### P3 — Tick only subscribed pairs

- **Where:** `src/services/feed/pricingFeed.ts:77-100`
- **Now:** `tick()` recomputes Brownian motion for all 4 pairs every 300ms regardless of subscriptions.
- **Do:** Skip pairs with an empty subscriber set.
- **Risk / caveat:** ⚠️ **Must preserve the seeded-RNG draw order** (CLAUDE.md golden/E2E replay via `?seed=N` / `window.__seedFeed`). Skipping a pair's `normal()` draw would shift the sequence and break goldens. **Safer variant:** keep the full math (preserving RNG draws) but skip only the subscriber **fan-out and `PriceTick` allocation** for unsubscribed pairs. Decide based on whether goldens depend on per-pair draw order.
- **Verify:** `pricingFeed.test.ts`; replay a seeded session and confirm goldens unchanged.

### P5 — Memoize per-tick pricing math in ticket panels

- **Where:** `src/features/ticket/pricing/PricingPanel.tsx`, `SwapPanel.tsx` (recomputes `effectiveSwapMargin()` + `clientSwapNetPoints()` each render), `ForwardPointsPanel.tsx`
- **Now:** These re-render on every 300ms tick and recompute all derived values inline.
- **Do:** `useMemo` the derived figures keyed on `[tick, margins, mode]`; `useCallback` the margin-change handlers passed to `MarginControls`. Keep the math itself in `lib/pips.ts` (CLAUDE.md) — memoize only the call sites.
- **Risk:** Low — values identical.

### P4 — (Optional) Coalesce feed notifications to one flush per frame

- **Where:** `pricingFeed.ts` fan-out; consumers `RateCell`, `PricingPanel`, `SwapPanel`
- **Now:** Each tick synchronously fires every subscriber, each doing its own `setState`. React 18 auto-batches event handlers but **not** `setInterval` callbacks.
- **Do:** Optional `requestAnimationFrame`/microtask coalescing so same-frame ticks flush together. Minor at 300ms; only pursue if P1 proves insufficient.
- **Risk:** Low–Medium — keep latency imperceptible; do not reorder ticks.

### P6 — Audit long-lived subscriptions / listeners

- **Where:** `src/features/notifications/dispatcher.ts:50-57` (store sub), `src/services/feed/external/wireExternalFeed.ts:8-24`, `src/features/notifications/useNotificationSound.ts:77-86` (click/keydown unlock listeners)
- **Now:** Created once, effectively never torn down (`unwireNotifications` never called in prod). Not a leak in a normal single-mount SPA, but the audio-unlock listeners persist for app lifetime.
- **Do:** Confirm single registration; optionally self-remove the unlock listeners after the first successful gesture. Low urgency.
- **Risk:** Low.

### P7 — Blotter virtualization (watch-only, do NOT implement now)

- **Where:** `ActiveBlotter.tsx` (uncapped), `HistoricBlotter.tsx` (capped at 100, `:11,137`)
- **Now:** No windowing. Fine at the realistic ~50–150 rows; rows are lightweight buttons.
- **Do:** **Do not add a virtualization dependency** — it adds bundle weight and complexity against the size goal. Document a revisit threshold (e.g. >200 active rows). With P1+P2, per-tick cost is already bounded to visible rate cells.

---

## Part 2 — Bundle / Code Size

### B1 — Add a bundle analyzer + size budget (do first)

- **Where:** `vite.config.ts`, CI
- **Do:** Add `rollup-plugin-visualizer` (devDependency, dev-only) and set `build.chunkSizeWarningLimit`. Optionally a `size-limit` CI check. Turns the "~150–170 KB gz" estimate into measured numbers and guards regressions.
- **Risk:** Very low (dev tooling only). Brand-neutrality: analyzer output must not be committed or shipped.

### B2 — Code-split dev-only and rarely-used surfaces (biggest size win)

- **Where:** `src/features/dev-injector/DevInjector.tsx` (321), `src/features/ticket/HistoricDetailPanel.tsx` (296), the v3-gated external feed `src/services/feed/external/*`, and `SuggestionPanel` if heavy
- **Do:** `React.lazy` + dynamic `import()` for the dev-injector and v3 external-feed adapter so they leave the default production bundle (already gated behind `?dev=*` / `import.meta.env.DEV`). Aligns with the existing dev-gating model.
- **Risk:** Low–Medium. Ensure dev/E2E paths still load them; suspense fallbacks must be invisible to normal UX.

### B3 — Subset fonts to weights actually used

- **Where:** `@fontsource/geist-sans`, `@fontsource/geist-mono` via `src/styles/global.css`; Tailwind references sans 400/500/600 and mono 400/500
- **Now:** `@fontsource` ships full-range woff2 per weight; unused weights/charsets are dead weight in the self-hosted (`font-src 'self'`) setup.
- **Do:** Import only the specific weights/subsets used (`@fontsource/geist-sans/400.css` etc.) rather than the package index. Likely a real KB win.
- **Risk:** Low — verify no referenced weight is dropped (visual diff against design tokens).

### B4 — Confirm `lucide-react` stays tree-shaken

- **Where:** 13 named icon imports
- **Do:** Keep named imports (already correct). If B1's analyzer shows the full icon set landing, switch to `lucide-react/icons/<Icon>` deep imports.
- **Risk:** Very low.

### B5 — Explicit `manualChunks` for vendor splitting

- **Where:** `vite.config.ts` → `build.rollupOptions.output.manualChunks`
- **Do:** Split `react`/`react-dom`, `xstate`/`@xstate/react`, and app code into stable vendor chunks for better long-term caching.
- **Risk:** ⚠️ Medium — interacts with the custom **SRI plugin**, which hashes emitted chunks post-build (`vite.config.ts:62-83`). New chunk names must still receive `integrity` attributes. Test the `preview` build + full E2E suite (E2E runs against `preview` under CSP/SRI).

---

## Part 3 — Maintainability

### M1 — Decompose `dealsStore.ts` (345 lines; most complex module)

- **Where:** `src/state/stores/dealsStore.ts` — the 162-line `addDeal` mixes actor wiring, two near-identical SI/RFS subscriber closures (`:192-254`), lifecycle-event logging, and the `archive` closure
- **Do:** Extract (a) a shared subscriber factory parameterized by channel — the SI and RFS subscribers differ only by `phaseChannel` and which state key they patch; (b) `archive` into a module function; (c) the lifecycle-event append into a helper. Pure refactor; transitions still flow through XState.
- **Risk:** Medium — heavily tested (`dealsStore.test.ts`); lean on those tests.

### M2 — Split `TicketPanel.tsx` (435) and `SuggestionPanel.tsx` (329)

- **Where:** `src/features/ticket/TicketPanel.tsx`, `SuggestionPanel.tsx`
- **Do:** TicketPanel is a true god-component orchestrating 8 sub-panels — extract instrument routing (spot/forward/swap) and the action bar into children. SuggestionPanel — split the debounced-recompute / vol-shift watcher hook out of the view. (CLAUDE.md permits a documented >300-line exception for orchestrators, but TicketPanel warrants splitting.)
- **Risk:** Medium — large test surface (`PricingPanel.test.tsx` 530, `SuggestionPanel.test.tsx` 300); keep prop contracts stable.

### M3 — De-duplicate blotter column definitions + v3/v4 gating

- **Where:** `ActiveBlotter.tsx:21-35` vs `HistoricBlotter.tsx:19-32` (near-identical column arrays with repeated `isV3()/isV4()` conditionals)
- **Do:** Extract a single shared column-config module consumed by both blotters. Removes the main DRY violation and centralizes v3/v4 column gating.
- **Risk:** Low — config/data, not logic.

### M4 — Consolidate `devVersion` gating call sites

- **Where:** `src/lib/devVersion.ts` + ~30 invocations across 8 files; inline render-body checks at `TicketPanel.tsx:125,187`, `HistoricDetailPanel.tsx:203`, `App.tsx:60,97`
- **Do:** Hoist inline render-body `isV3()/isV4()` checks to module/const scope (as the blotters already do: `const v3 = isV3()`); let M3 absorb the blotter column gating. Not a hot-spot.
- **Risk:** Low.

### M5 — Reduce SwapPanel state sprawl (10 `useState`)

- **Where:** `src/features/ticket/pricing/SwapPanel.tsx`
- **Do:** Consolidate mode + tri-component margins + undo stacks into a single `useReducer` (or a typed state object). Pairs naturally with P5's memoization.
- **Risk:** Medium — tested via `PricingPanel.test.tsx`; keep behavior identical.

---

## Recommended sequencing

1. **B1** — analyzer/budget first, so every later change is measured.
2. **P1 + P2** — the core runtime win (memoized rows + selector identity).
3. **P3, P5** — feed/ticket render cost, guarding RNG/golden stability.
4. **B2, B3** — biggest size wins (lazy dev/v3 surfaces, font subsetting).
5. **M3, M4** — low-risk maintainability cleanups.
6. **M1, M2, M5, B5, P4** — larger refactors / higher-coordination changes last.

## Cross-cutting guardrails

- **Seeded-RNG / golden stability** (P3): preserve `normal()` draw order; replay with `?seed=N` / `window.__seedFeed` and diff goldens.
- **CSP/SRI build plugins** (B5): any change to emitted chunk names must keep SRI `integrity` attrs intact; validate the `preview` build + E2E.
- **Canonical names**: never rename state values or `data-*` attributes during refactors.

## Per-change verification checklist

- `pnpm typecheck && pnpm lint` — zero warnings (Definition of Done).
- `pnpm test:run` — unit/component, especially `dealsStore.test.ts`, `*Blotter.test.tsx`, `PricingPanel.test.tsx`, `engine.test.ts`.
- `pnpm test:e2e` against `preview` — confirms CSP/SRI build + canonical `data-*` attrs.
- Runtime items: React DevTools Profiler before/after to confirm fewer renders per tick; no console errors/warnings in `pnpm dev`.
- Size items: `pnpm build` + analyzer diff; confirm output stays brand-neutral.
- Feed items: seeded replay confirms goldens unchanged.

## Appendix — what is already good (leave alone)

- Lean dependency set; Zustand for UI state + XState for lifecycle is appropriate, not redundant.
- No context providers → no render waterfalls.
- Immutable state updates throughout; `replaceEntry` clones only the touched entry.
- 5-second removal is XState-`after:` driven, not per-row JS timers.
- External poller uses `setTimeout` with exponential backoff (safer than `setInterval`), OFF by default.
- Per-toast and per-effect timers are cleaned up correctly.
- Historic blotter is hard-capped at 100 rows.
- Zero dead code, zero TODO/FIXME markers.
