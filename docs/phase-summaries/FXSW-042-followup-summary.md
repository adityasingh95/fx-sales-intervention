---
phase: 6.1
ticket_range: post-FXSW-042 UX feedback fixes (no new tickets)
date: 2026-06-10
branch: dev/v2
gate_counts:
  unit_tests: 379 pass / 0 todo (unchanged from end of Phase 6)
  e2e_tests: 6 pass (smoke + happy-path-esp + off-hours-intervention + credit-breach + size-limit-margin-tune + release-path)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  brand_grep: dist/ brand-neutral; `grep -ri caplin docs/ src/ tests/ scripts/` returns only test assertions of absence + the FXSW-042 summary's own check string
---

# Phase 6.1 Summary — UX feedback pass (v2 preview)

Polish slice on `dev/v2` addressing seven issues surfaced when the user previewed Phase 6 live on GitHub Pages. No new tickets, no spec amendments — all fixes layered in-place on top of the FXSW-035 → FXSW-042 commits. `main` still untouched; v1 contract preserved.

End state: `dev/v2` is feature-complete and the seven rough edges are smoothed.

## What shipped

Three commits on `dev/v2`:

- `fc149cd` — UX feedback pass: spinner suppression + dual-margin layout under price cells + always-on Refresh + CREDIT_BREACH random outcome + RELEASE_PATH rename + initial resize handle attempt + mobile dropdown + mobile footer compaction.
- `0fc2d0d` — Resize handle: switch to grow-weighted flex (`flex: <split> 1 0`) + live container-ref measurement (eliminate state-timing). Percentage `flex-basis` does not resolve under a stretched parent in column flex layouts — that was the layout root cause.
- `77c2f96` — Mobile dropdown: switch popover to `position: fixed` with viewport-coords from `getBoundingClientRect`, flip the header slot's overflow class so the dev slot doesn't clip the menu on mobile.

### Item-by-item

1. **Margin inputs aligned under their price cells** (`src/features/ticket/PricingPanel.tsx`). The old `DualMarginControls` was a vertical stack with Balance + Zero between the BID and ASK rows. New structure: a 3-column flex layout where the BID `MarginRow` sits inside the same column as the BID price cell, ASK row under ASK cell, MID column has no row underneath. Balance + Zero moved to a single centered row below both inputs. `MarginRow` lost its left-side `Bid`/`Ask` label span (the price cell already labels it) and shrunk slightly to fit two-column width.
2. **Native number-input spinner suppressed** (`src/styles/global.css`). Global rule: `input[type='number']::-webkit-inner-spin-button { -webkit-appearance: none }` + `-moz-appearance: textfield`. The dedicated +/− buttons remain the only adjustment surface.
3. **Refresh button always rendered** (`src/features/ticket/PricingPanel.tsx`). Removed the `pricingMode === 'fixed' &&` conditional gate so the button always reserves layout space. Added `disabled={pricingMode !== 'fixed'}` with `disabled:opacity-40 disabled:cursor-not-allowed`. Side-selection no longer causes vertical layout shift.
4. **CREDIT_BREACH terminates regardless of trader path** (`src/services/scenarios/definitions.ts`, `player.ts`, `src/types/scenario.ts`). Added a new `FollowUpEvent` value `CLIENT_ACCEPT_OR_REJECT` resolved at scheduling time via `Math.random() < 0.5` into a concrete `CLIENT_ACCEPT` or `CLIENT_REJECT` event. Trader Reject path (the dispatcher-recommended action) still works unchanged; trader Send-Quote path now also reaches a terminal state in ~1.5s via randomized client outcome.
5. **RELEASE_PATH renamed in injector + given a quote follow-up** (`src/features/dev-injector/DevInjector.tsx` LABEL map, `src/services/scenarios/definitions.ts`). The user found the button name "Release" confusing because the ticket footer also has a Release action. Renamed to `Hold/Release` to signal scenario-vs-action. Added a `CLIENT_ACCEPT` after-Quoted follow-up so the alternative-path (trader quotes instead of releases) reaches `TradeConfirmed` instead of hanging.
6. **Resize handle now actually moves blotters** (`src/components/ResizeHandle.tsx`, `src/lib/resizeMath.ts`, `src/App.tsx`, `src/state/stores/settingsStore.ts`). Two stacked root causes fixed:
   - **Layout**: percentage `flex-basis: X%` on column-flex children was not resolving because `<main>` derives its height from `flex: 1` (stretched, not "definite") — a known CSS quirk. Sections were sized to content (~104px instead of 55% of 742px), so even when `blotterSplit` state updated correctly, the visual layout never changed. Switched to grow-weighted flex: each section uses `style={{ flex: '<weight> 1 0' }}` where weights are `blotterSplit` and `100 - blotterSplit`. Sections now divide available main-axis space deterministically by ratio. Standard splitter pattern.
   - **Event handling**: the `containerHeight` prop started at `0` because the `ResizeObserver`-driven `useLayoutEffect` runs after first paint; the first drag interaction would call `computeNewSplit` with `containerHeight=0` which returns `initialSplit` unchanged (no-op). Replaced the prop with a `containerRef: RefObject<HTMLElement>` and read `containerRef.current?.clientHeight` live inside `onMove`. Plus moved listener attachment from a `useEffect` to synchronous registration inside `handlePointerDown` (eliminates the one-frame React-commit gap). Plus `setPointerCapture` + `preventDefault` for robustness. Plus hit-area widened from `h-1` (4px) to `h-2` (8px) with a centered 1px visible bar.
7. **Mobile DevInjector dropdown** (`src/features/dev-injector/DevInjector.tsx`, `src/App.tsx`). Below the `md` breakpoint, the injector collapses into a single `Dev ▾` button. Clicking opens a popover menu listing all scenario buttons + Reset stacked vertically; outside-click / Esc / button-press closes. Menu uses `position: fixed` with viewport coordinates computed from the toggle's `getBoundingClientRect()` — that way, no ancestor's `overflow: hidden/auto` can clip it (the header slot does have an overflow clip on mobile). Also flipped the slot wrapper's overflow class from `overflow-x-auto sm:overflow-visible` to `overflow-visible sm:overflow-x-auto` since mobile no longer needs scroll. The `useIsMobile` hook from FXSW-042 drives the v1/desktop vs. v2/mobile branch.
8. **Mobile footer button row stays on one line at 428px** (`src/features/ticket/TicketFooter.tsx`, `src/components/Button.tsx`). Footer padding `px-5` → `px-2 sm:px-5`, gap `gap-2` → `gap-1 sm:gap-2`. Button primitives (ActionButton + HoldButton) padding `px-4` → `px-2 sm:px-4` and text `text-sm` → `text-xs sm:text-sm`. "Return to Stream" label compacted to "Stream" on mobile via `<span class="hidden sm:inline">Return to </span>Stream`. Desktop appearance byte-for-byte preserved.

## What's rough or open

- **No new unit tests for the Phase 6.1 changes.** The existing 379 tests cover the underlying primitives (margin-pair state, scenario player follow-ups, resize math, useIsMobile, devInjector branching), and the changes here are layout / styling / scheduling-event additions rather than new logic surfaces. The `PricingPanel` FXSW-018 Refresh-visibility test was updated to match the always-rendered-disabled-in-streaming behavior. A future polish ticket could add: (a) random outcome reproducibility test for CREDIT_BREACH (seed `Math.random`), (b) mobile dropdown open/close test using `useIsMobile`'s mockable matchMedia, (c) ResizeHandle drag math test with the new containerRef API.
- **No e2e spec for the dropdown or the resize handle.** Both are interactive features that the existing six specs don't touch. Could add later if regression risk warrants it.
- **`CLIENT_ACCEPT_OR_REJECT` is resolved by `Math.random` directly in `player.ts:buildFollowUpEvent`.** No injection point for deterministic tests. If we need reproducible scenarios later, the player options should accept a `random?: () => number` callback.

## What surprised you

- **`flex-basis: 55%` on a column-flex child silently does nothing if the parent's height is "stretched" (`flex: 1`) rather than explicit.** The percentage doesn't resolve and the section collapses to content size. Verified via Playwright DOM inspection: `getComputedStyle(section).flexBasis === "55%"` but actual `clientHeight` was 104px against a 742px main. Took several iterations of adding `min-h-0`, `flex-shrink-0`, etc. before reading the spec — Chrome (and Firefox/Safari per WPT) require a "definite" basis or you fall back to grow-weighted layout. This is the standard pattern in every popular split-pane library and is well known to library authors, but easy to miss on a first hand-roll. Documented inline as a comment in App.tsx.
- **An absolutely-positioned popover gets clipped by a *horizontal* overflow ancestor.** `overflow-x: auto` creates a paint clip context that clips both axes, not just the named one. The mobile dropdown was invisible because its `absolute top-full left-0` placement bumped into the header slot's `overflow-x-auto`. Fix is `position: fixed` with viewport-coords, or removing the overflow on the relevant axis. Worth remembering for any future popover work.
- **The Phase 6 first-pass resize "worked" in tests but never in the browser.** ResizeHandle.test.tsx dispatched `MouseEvent('pointermove')` on `document` and asserted `onSplitChange` was called — which is exactly what the implementation did under the hood. The math + event-handling layer was correct; only the *consumer* layout was broken. A reminder that unit tests can pass while a feature is wholly non-functional if the integration points aren't covered. The fix in `0fc2d0d` is verified by Playwright DOM inspection (section heights actually shift on drag), not by a new unit test.

## Recommended next slice

1. **Wiki Agent ingest** (this session is the trigger). Pages to update:
   - `wiki/features/ticket.md` — dual margin layout description should now show side-by-side under price cells, not stacked with controls between.
   - `wiki/features/ai-margin-suggestion.md` — small note that the `?dev=v2` Refresh button is always visible, disabled in streaming.
   - `wiki/components/resize-handle.md` — replace the documented "containerHeight prop driven by ResizeObserver in App.tsx" with the new "containerRef live-read" model. Add a note on the grow-weighted flex pattern in App.tsx as the *layout* contract that pairs with the handle's *event* contract.
   - `wiki/components/dev-version.md` and/or a new `wiki/components/dev-injector.md` — document the mobile dropdown (popover sheet, fixed positioning, `useIsMobile` consumer).
   - `wiki/scenarios/credit-breach.md` — random outcome path. Note the new `CLIENT_ACCEPT_OR_REJECT` event class in `wiki/data-models/scenario.md`.
   - `wiki/scenarios/release-path.md` — clarify "Hold/Release" label + quote-path follow-up.
2. **Promotion decision.** After the wiki ingest passes, `dev/v2` is ready for review and merge to `main`. The squash-merge + v1-fallback-strip cleanup remains the next discrete phase.

## Brand-neutrality

`grep -ri caplin docs/ src/ tests/ scripts/` matches three lines: the `App.test.tsx` test that asserts the literal string isn't rendered, plus this and the FXSW-042 summary's grep-command quotes. `dist/` build is brand-neutral.

## Files changed in Phase 6.1

| File | Item(s) |
|---|---|
| `src/styles/global.css` | #2 spinner CSS |
| `src/features/ticket/PricingPanel.tsx` | #1 layout · #3 Refresh always-on |
| `src/features/ticket/PricingPanel.test.tsx` | #3 updated FXSW-018 visibility assertion |
| `src/services/scenarios/definitions.ts` | #4 CREDIT_BREACH + RELEASE_PATH follow-ups |
| `src/services/scenarios/player.ts` | #4 CLIENT_ACCEPT_OR_REJECT resolver |
| `src/types/scenario.ts` | #4 new FollowUpEvent value |
| `src/features/dev-injector/DevInjector.tsx` | #5 label rename · #7 mobile dropdown + fixed positioning |
| `src/App.tsx` | #6 grow-weighted flex, containerRef wiring · #7 mobile overflow flip |
| `src/components/ResizeHandle.tsx` | #6 live containerRef read, synchronous listeners, setPointerCapture, bigger hit area |
| `src/components/ResizeHandle.test.tsx` | #6 updated to use containerRef prop |
| `src/features/ticket/TicketFooter.tsx` | #8 footer padding + "Stream" label |
| `src/components/Button.tsx` | #8 button padding + text-size at mobile |
