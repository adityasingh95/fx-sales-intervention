# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales Workstation** prototype. This sanitized version preserves the implementation trail without retaining vendor-specific research references.

## Purpose

This document records:

- what was implemented,
- which decisions were user-directed,
- which decisions were agent-directed,
- which gates passed,
- which follow-ups were identified.

The prototype story is brand-neutral: a sales-trader workstation for FX manual pricing intervention, built as a single-page React + XState app with simulated feeds and no production backend.

---

## FXSW-046 · Per-surface visual rebalancing + Tailwind variable migration

- **Root-cause find via Playwright verification.** Initial first-run screenshot at `?theme=preview` showed `dataset.theme="light"` and `body { background: rgb(246,246,248) }` resolving correctly via `var(--color-bg-app)`, but the page rendered DARK. Cause: Tailwind utilities like `bg-bg-app`, `text-text`, `border-border` compile to literal hex values from `tailwind.config.ts` — the CSS variable cascade was effectively only reaching the `body` element. The light token block in `tokens.css` was being defined correctly, but no Tailwind-styled element ever read from it.
- **Migration to `rgb(var(--color-X) / <alpha-value>)`.** Converted all solid colour tokens in `tokens.css` from hex literals (`#0a0a0f`) to space-separated RGB triples (`10 10 15`), and rewrote `tailwind.config.ts` so each colour resolves via `rgb(var(--color-X) / <alpha-value>)`. Preserves Tailwind opacity modifiers (`bg-blue/85` still works). Alpha-baked tokens (`--color-bg-overlay`, `--color-bg-glass`, `--color-ai-bg`, `--color-ai-border`, `--color-row-flash`) keep their full `rgba(...)` form and Tailwind references them as direct `var()` since they're never opacity-modified.
- **Shadows moved into tokens.css.** `--shadow-panel` / `--shadow-ticket` / `--shadow-ai` were hard-coded in `tailwind.config.ts.boxShadow`. Now defined per-theme in `tokens.css` so the light theme's softer drop-shadows fire on `[data-theme='light']`. Tailwind references them as `var(--shadow-panel)` etc.
- **`global.css` body**: changed `background: var(--color-bg-app)` → `background: rgb(var(--color-bg-app))` to match the new triple format.
- **Row-flash keyframe** already references `var(--color-row-flash)` from FXSW-046's first commit; the variable now varies per theme (amber 30% on dark, amber 18% on light per `05-ui-ux-spec.md §13.2`).
- **Visual verification** via Playwright at 1440×900 across 14 visual states (5 base + 2 v2 scenarios × dark + light). Screenshots saved to `/tmp/light-mode-verify/` for the phase summary. Indigo AI accent preserved across themes; status pills (PICKED UP blue, INTERVENE amber, BUY/SELL green/red) readable on white; toast chrome reads cleanly; ticket overlay glass adapts.
- **Tests** updated: `tests/unit/tokens.test.ts` and `tests/unit/tailwind.config.test.ts` now expect the new RGB-triple / `rgb(var(...) / <alpha-value>)` formats; added 14 assertions covering the new `[data-theme='light']` block. All 6 Playwright e2e scenarios still pass byte-for-byte (dark default preserved when flag is absent).
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (422 pass — +14 vs FXSW-045) · test:e2e ✓ (6/6 in 35.5s) · build ✓ · brand-neutral grep ✓.

**User-directed decisions:**

- None — all decisions within doc-pack guidance.

**Agent-directed decisions:**

- **Full migration to `rgb(var(...) / <alpha-value>)` instead of partial fix.** Considered a smaller change — `'bg-app': 'var(--color-bg-app)'` direct reference — but that loses Tailwind opacity-modifier support (e.g. `bg-blue/85` in `Button.tsx`). The full migration is bigger but consistent; future colour tokens just slot in.
- **Space-separated RGB triples over comma-separated.** Tailwind 3.x's docs both work, but space-separated is the documented preferred form and reads cleaner.
- **Shadows moved out of `tailwind.config.ts` into `tokens.css`.** Could have written two boxShadow blocks (dark + light) inside the config, but tokens.css already has the `[data-theme='light']` override mechanism; consolidating there is one source of truth for "what changes per theme".
- **Updated the existing token + tailwind-config unit tests rather than deleting.** They were asserting structural contracts (spec §1 documents tokens) — those contracts are still valid, just expressed in the new format. Kept the test shape so future drift is caught.
- **Did not update spec `docs/05-ui-ux-spec.md` §1 in this commit.** That section still documents the dark palette as hex literals — true at a semantic level (the dark colours haven't changed), and the new RGB-triple format is an implementation detail of the migration. A follow-up could harmonise spec presentation if it confuses readers.
- **Bug found via Playwright, not via unit tests.** The original FXSW-044 acceptance criteria said "Tokens regression: each new `[data-theme='light']` selector matches the dark counterpart by token name (smoke test parses the CSS file)" — my test correctly asserted the CSS file content, but didn't simulate rendering. The visual bug only surfaced when actual Chromium painted the page. Reminder: file-content tests for design tokens are necessary but not sufficient; the rendering pipeline needs a separate gate (which is what FXSW-046's manual visual pass + the Playwright matrix provides).

---

## FXSW-045 · `ThemeToggle` header component

- New `src/features/notifications/ThemeToggle.tsx` — co-located with `MuteToggle` since both are header-level toggle widgets driven by Zustand stores.
- Reads from `useThemeStore`. Early-returns `null` when `getThemePreviewEnabled()` is false — the toggle never mounts on the public/main URL.
- Icon convention: the icon shown is the **target** mode (Sun when dark is active = "switch to light"; Moon when light is active = "switch to dark"). Matches GitHub / Linear / VS Code.
- `data-testid="theme-toggle"`, `data-theme-mode={mode}`, `aria-pressed={isLight}`, dynamic `aria-label`. Mirrors `MuteToggle`'s attribute set.
- Wired into `App.tsx` header just before `MuteToggle`. Returning null when flag is off keeps the header layout byte-for-byte unchanged on non-preview URLs.
- TDD alongside: 5 component tests covering null-render-when-off, both icon states, toggle round-trip, persistence.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (408 pass — +5 vs FXSW-044) · build ✓.

**User-directed decisions:**

- None — all decisions within doc-pack guidance.

**Agent-directed decisions:**

- **Place ThemeToggle BEFORE MuteToggle in header order** (not after). Reading left-to-right: theme is a higher-level preference than audio. Tested both visually in the test render — the order is asymmetric so the choice is forced; "theme first" reads more naturally.
- **Icon = target, not current.** Both conventions exist in the wild (GitHub uses target, macOS Settings uses current). Picking target because the button's affordance is "click me to get the other thing" — the icon labels the action, not the state. The `data-theme-mode` attribute carries the current state for tests and styling.
- **No fade transition between icons.** The CSS-only opacity cross-fade described in `05-ui-ux-spec.md §13.3` adds a transient overlap where both icons are partially visible. Skipped for now; the instant swap matches `MuteToggle`'s Bell ↔ BellOff behaviour. If users find it jarring, can layer it in via Tailwind `transition-opacity` later.
- **`useThemeStore` selector pattern (one subscription per field).** Matches the existing `MuteToggle` and Zustand best practice — minimises re-renders.

---

## FXSW-044 · `themeStore` + light token block

- New `src/state/stores/themeStore.ts` (Zustand). Mirrors `settingsStore` pattern from FXSW-029/036: pure read functions, try/catch around sessionStorage, default fallback.
- `mode: 'dark' | 'light'`, `setMode(mode)`, `toggle()`. Persistence key `si.theme` (third sibling alongside `si.muted` + `si.blotterSplit`).
- `resolveInitialMode()` runs at module init: when `getThemePreviewEnabled()` is `false`, force `'dark'` regardless of session or system; when `true`, sessionStorage wins, falling back to `window.matchMedia('(prefers-color-scheme: light)')`.
- `applyDomTheme()` writes `document.documentElement.dataset.theme = mode` at init and from every `setMode` / `toggle` call — so `[data-theme='light']` in `tokens.css` resolves immediately.
- Light token block appended to `src/styles/tokens.css` under `[data-theme='light']`. Status pills + tick colours darkened for white-surface legibility (e.g. amber `#fbbf24` → `#b45309`, green `#22c55e` → `#15803d`). AI indigo preserved across both modes — it's the "moment-of-delight" identifier. Light-mode `--shadow-ticket` swaps the dark-on-dark inset for a soft drop-shadow.
- Safari-private-mode tolerant: `setItem` is wrapped in try/catch, so a quota or security error in private mode degrades to in-memory-only (state still updates).
- TDD strict: 15 tests written first (red), then implementation. Coverage: first-visit defaults (5 cases incl. flag-on × stored × prefers-light matrix), `setMode` persistence + DOM, `toggle` symmetry, initial DOM side-effect, Safari fallback.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (403 pass — +15 vs FXSW-043).

**User-directed decisions:**

- None — all decisions within doc-pack guidance.

**Agent-directed decisions:**

- **Force-dark when flag is off, even with a stored value.** Could have remembered the user's last preview-session choice, but the `?theme=preview` gate exists precisely to keep dark-only behaviour pristine when the flag is absent. Reading sessionStorage in force-dark mode would partially leak the preview behaviour into `main`-equivalent URLs.
- **Module-init `resolveInitialMode()` + `applyDomTheme()`** — not a Zustand subscriber. The DOM side-effect needs to fire **before** React mounts so the first paint sees the right tokens. A subscribe call would race the first render. Init-time inline call + inline calls inside setters keep the contract explicit.
- **`?reload=N_M` test-import pattern with an underscore separator.** The existing `settingsStore.test.ts` uses `?reload=${Date.now()}`, which works because timestamp is a single integer. My first attempt appended `Math.random()` and vite/esbuild interpreted the decimal point as a file-loader extension (`Invalid loader value: "7126.71..."`). Switched to an integer counter joined with `_`.
- **`?theme=preview` checked at every `setMode` / `toggle` call**, not cached at init. The URL doesn't change at runtime in practice, but reading it live keeps the store self-consistent if a future ticket exposes a runtime toggle of the flag.
- **No middleware (zustand/persist).** The existing stores all roll their own try/catch persistence pattern. Bringing in middleware here would diverge from the codebase convention for one store.

---

## FXSW-043 · `themePreviewEnabled` parser + `?theme=preview` URL gate

- New file `src/lib/themeMode.ts` exports `parseThemePreviewEnabled(search)` + `getThemePreviewEnabled()`. Mirrors the `devVersion.ts` pattern from FXSW-035.
- `?theme=preview` → `true`; anything else (`?theme=light`, `?theme=dark`, `?theme`, `?theme=PREVIEW`, no query) → `false`. Case-sensitive, same convention as `devVersion`.
- `getThemePreviewEnabled()` guards `typeof window === 'undefined'` so SSR-style imports return `false` cleanly.
- Orthogonal to `?dev=v2`: a test asserts both flags can be on simultaneously without interference.
- TDD strict: 9 tests written first (red), implementation second (green).
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (388 pass — 9 new). E2E unchanged from FXSW-042 (no UI yet).

**User-directed decisions:**

- **URL flag spelling**: AskUserQuestion offered (`?theme=preview` / `?dev=v3` / `?light=1`). User chose **`?theme=preview`** — orthogonal to the existing `dev=v2` switch, generic enough to extend later.
- **First-visit default behavior**: AskUserQuestion offered (Follow `prefers-color-scheme` / Always start dark). User chose **Follow `prefers-color-scheme`** — matches platform expectations.

**Agent-directed decisions:**

- **Boolean export, not an enum.** The flag has two states (on/off). A `ThemePreviewFlag = boolean` typedef adds noise without value; `boolean` is self-documenting at every call site.
- **Mirror `devVersion.ts` filename + structure exactly.** New module sits next to it (`src/lib/themeMode.ts`); both pure-parser + `window`-guarded getter pattern. Keeps the URL-gate idiom uniform across the codebase.
- **No new `import` in `App.tsx` yet.** This ticket is wiring-only; the toggle component (FXSW-045) is the first consumer. Avoids a dead-import warning between tickets.

---

## Phase 6.1 · UX feedback pass on dev/v2

Polish slice after the user previewed Phase 6 live on GitHub Pages. Seven items, three commits (`fc149cd`, `0fc2d0d`, `77c2f96`). No new tickets, no spec amendments — fixes layered on top of FXSW-035 → FXSW-042. `main` untouched.

- **Margin inputs sit under their respective price cells.** `PricingPanel` restructured: BID `MarginRow` lives in the same column as the BID `Cell`, ASK under ASK; Balance + Zero on a single centered row below. `MarginRow` lost its left "Bid"/"Ask" label span (the cell already labels it).
- **Browser number-input spinner hidden globally** via `input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none }` + `-moz-appearance: textfield` in `src/styles/global.css`. The dedicated +/− buttons remain the only adjustment surface.
- **Refresh button always rendered**, disabled in streaming. Removed `pricingMode === 'fixed' &&` conditional gate; added `disabled` + `disabled:opacity-40 disabled:cursor-not-allowed`. No more layout shift on side-select.
- **CREDIT_BREACH terminates via either outcome.** New `FollowUpEvent` value `CLIENT_ACCEPT_OR_REJECT` resolved at scheduling time in `player.ts` via `Math.random() < 0.5`. Trader Reject path unchanged; trader Send-Quote path now reaches `TradeConfirmed` or `ClientRejected` in ~1.5s.
- **RELEASE_PATH renamed** to `Hold/Release` in the dev injector LABEL map (resolves naming conflict with the ticket-footer Release action). Added `CLIENT_ACCEPT` after-Quoted follow-up so the quote-path also terminates.
- **Resize handle now actually drags blotters.** Two stacked root causes:
  1. Percentage `flex-basis` on column-flex children doesn't resolve under a stretched parent (`flex: 1` on `<main>`). Sections collapsed to content (~104px instead of 55% of 742). Switched to grow-weighted flex: `style={{ flex: '<split> 1 0' }}` and `style={{ flex: '<100-split> 1 0' }}`. Standard splitter pattern.
  2. `containerHeight: 0` prop on first interaction (ResizeObserver effect fires after first paint), making `computeNewSplit` return `initialSplit` no-op. Replaced with `containerRef` and live `clientHeight` read inside `onMove`. Plus synchronous listener attachment in `handlePointerDown` (no React-commit gap), `setPointerCapture`, hit area widened to `h-2` with a centered 1px visible bar.
- **Mobile DevInjector dropdown.** Below `md` breakpoint, renders a single `Dev ▾` button; click opens a popover with all scenarios + Reset. Popover uses `position: fixed` with viewport coords from `getBoundingClientRect()` so the header slot's `overflow-x-auto` paint-clip can't truncate it. Outside-click / Esc / button-press closes. Slot wrapper's overflow class flipped from `overflow-x-auto sm:overflow-visible` to `overflow-visible sm:overflow-x-auto`.
- **Mobile footer buttons stay on one line at 428px.** Footer `px-5 gap-2` → `px-2 gap-1 sm:px-5 sm:gap-2`. Button primitives `px-4 text-sm` → `px-2 text-xs sm:px-4 sm:text-sm`. "Return to Stream" → "Stream" on mobile via inline `<span class="hidden sm:inline">Return to </span>`.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (379 pass / 0 todo) · test:e2e ✓ (6/6 in 35.3s) · build ✓ · brand grep ✓.

**User-directed decisions:**

- **CREDIT_BREACH outcome under trader-sent quote**: AskUserQuestion offered (Client accepts / Client rejects / Configurable). User chose **Configurable / both** → randomized via `CLIENT_ACCEPT_OR_REJECT`.
- **RELEASE_PATH outcome path**: AskUserQuestion offered (Accept / Reject / Match CREDIT_BREACH). User clarified that "release is an action along quoting not a price request" — the agent renamed the scenario label in the injector and added a `CLIENT_ACCEPT` follow-up so the quote-path also terminates.
- **Balance/Zero placement**: AskUserQuestion offered (Centered below / Above inputs / Sidebar). User chose **Centered below both inputs**.
- **Mobile DevInjector pattern**: AskUserQuestion offered (Dropdown popover / Bottom sheet / Hidden by default). User chose **Dropdown / popover menu**.

**Agent-directed decisions:**

- **Grow-weighted flex over pixel-computed heights for the splitter.** Considered measuring main's `clientHeight` and setting `style={{ height: '${px}px' }}` on each section, but that creates a JS-driven layout loop on every resize observer event. `flex: <weight> 1 0` is the canonical browser-native pattern, zero JS-driven sizing, fully responsive to container changes.
- **`containerRef` over `containerHeight` prop.** The prop-based approach had a first-paint race condition (ResizeObserver effect runs after React commits, leaving `0` in state during the user's first drag). A ref is read live in `onMove` — no state, no closure capture, no race.
- **Popover `position: fixed` over absolute-with-portal.** Both work; fixed is simpler — no `createPortal`, no synchronization of mount/unmount with backdrop, no extra DOM node under `<body>`. The button rect is read once on toggle-open and the menu is positioned via inline `top` / `left` style.
- **`CLIENT_ACCEPT_OR_REJECT` as a `FollowUpEvent` union member, not a new trigger kind.** The trigger already supports `after-si-state` + `delay`; this is just a different *outcome event*. Resolution happens at scheduling time in `buildFollowUpEvent` via `Math.random()`. Keeps the scenario-definition syntax declarative.
- **No deterministic-random injection point for tests.** `Math.random()` is called directly in `player.ts:buildFollowUpEvent`. A future ticket could thread `random?: () => number` through `PlayerOptions` if reproducibility becomes important; not worth it for this slice.
- **Mobile-only label compression via `<span class="hidden sm:inline">Return to </span>Stream`** rather than two parallel button components. Tailwind's `hidden sm:inline` toggles the prefix at the `sm` breakpoint without JS or component duplication. Desktop appearance is byte-for-byte unchanged.
- **`MarginRow` lost its left label span.** In the new under-cell layout, the BID/ASK price cell directly above already labels the column; the spans were redundant and pushed the row narrower.
- **No new unit tests for Phase 6.1.** Existing 379 cover the underlying primitives. Layout changes are visually verified via Playwright DOM inspection (recorded in the phase summary). A future polish ticket can backfill if needed; not blocking the v2 promotion decision.

## FXSW-042 · Mobile card-stack blotters (v2)

- New hook `src/lib/useIsMobile.ts` — `matchMedia('(max-width: 767px)')` listener with SSR-safe defaults.
- `ActiveBlotter` + `HistoricBlotter` branch on `getDevVersion() === 'v2' && isMobile`. When true, render a card-stack layout instead of the `min-w-[1100px]` / `min-w-[920px]` table.
- New `ActiveCard` sub-component: row 1 [status pill | amount + ccy | pair], row 2 [client | side | reasons]. Tap opens the ticket via the existing `openTicket(dealId)`.
- New `HistoricCard` sub-component: row 1 [time | amount + ccy | pair], row 2 [client | outcome].
- `data-testid="active-blotter-body"` + `data-testid="historic-blotter-body"` + `data-deal-id` preserved on the card-body containers, so existing tests + e2es keep passing.
- v1 (no-query / `?dev=1`) at any viewport renders the original horizontal-scroll table — byte-for-byte unchanged.
- v2 at md+ also renders the table; only at < md does the card layout activate.
- Tests:
  - `useIsMobile` covers matchMedia true/false/missing.
  - ActiveBlotter v2-mobile + v1-mobile assertions added (5 new tests across both files).
- Visual verification at 375×812: v2 shows two stacked cards (Off-Hours + Both-Sided) with all key fields visible, no horizontal scroll; v1 retains the cropped-table behaviour as required by the v1 contract.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (379 pass / 0 todo, +5 new) · test:e2e ✓ (6/6 in 36.2s).

**User-directed decisions:**

- None — within FXSW-042 plan AC.

**Agent-directed decisions:**

- **JS-driven branching via `useIsMobile` instead of Tailwind `md:hidden`.** Two reasons: (1) jsdom doesn't apply CSS media queries, so test assertions wouldn't be meaningful with CSS-only approach; (2) only one body element renders, so the existing `screen.getByTestId('active-blotter-body')` lookups stay unambiguous (no double-find).
- **`useIsMobile` lives in `src/lib/` alongside `devVersion.ts`.** General-purpose hook, not blotter-specific. Cheap to reuse for any future mobile-only UI.
- **Card outcome text aligned right via `ml-auto`.** Mirrors the desktop table's right-aligned outcome column visually.
- **No new e2e spec.** Mobile rendering is a CSS + JS-detection feature; the unit tests assert the JS branch + DOM structure; manual verification (screenshotted in dev-log) covers the live behaviour.

## FXSW-041 · Direction-aware P/L display

- `ClientSummaryPanel` new optional `quoteSide?: QuoteSide` prop.
  - `BID` → single P/L line, `data-testid="pnl-bid"`, uses `marginPair.bid` only.
  - `ASK` → single P/L line, `data-testid="pnl-ask"`, uses `marginPair.ask` only.
  - `BOTH` → both P/L values in a single cell, `data-testid="pnl-both"`, side prefixes ("Bid $X · Ask $Y").
  - Undefined (v1) → falls back to the blended-average single line with the existing `data-testid="estimated-profit"` testid. v1 visual unchanged.
- `TicketPanel` passes `quoteSide={quoteSideFor(deal.side, deal.dealtCcy)}` when `isV2`, else `undefined`.
- 3 new ClientSummaryPanel tests for the BID / ASK / BOTH branches; 1 updated v1 fallback test verifies the existing testid is still present and the v2 testids are not.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (374 pass / 0 todo, +3 new) · test:e2e ✓ (6/6 in 35.8s).

**User-directed decisions:**

- None — within FXSW-041 plan AC.

**Agent-directed decisions:**

- **`pnl-both` is a single testid containing both side values** (not separate `pnl-both-bid` + `pnl-both-ask`). The spec sketch reads as one composite cell — easier to assert with `toHaveTextContent`. Future tests can scope into the cell if needed.
- **Heading label changes from "Est. profit" to "Est. P/L" in v2.** Slightly more trader-natural; v1 keeps the original label for byte-for-byte regression.
- **Inline `renderProfit()` helper inside the component.** Keeps the four branches readable inline; not worth extracting to a sibling sub-component.

## FXSW-040 · Dual margin UI (Balance + Zero)

- `PricingPanel` props extended with `marginPair?: MarginPair` + `onMarginPairChange?: (next) => void`. When both are provided, renders the v2 dual UI; otherwise renders the v1 single input.
- New `DualMarginControls` sub-component with two `[label][−][input][+]` rows (Bid above, Ask below) and Balance + Zero shortcut buttons centered between them.
- New testids: `margin-input-bid`, `margin-input-ask`, `margin-plus-bid` / `-ask`, `margin-minus-bid` / `-ask`, `margin-balance`, `margin-zero`.
- `Balance` button: `Math.round((bid + ask) / 2)`, both sides set to that. Odd sums round to nearest integer.
- `Zero` button: both sides → 0.
- Per-side keyboard `+`/`-` (on focused input): adjusts only that side. Document-level keyboard handler still active in streaming mode for global +/-, but now only fires when no input has focus (existing `e.target instanceof HTMLInputElement` guard).
- `TicketPanel` passes `marginPair` + `setMarginPair` to PricingPanel only when `isV2`; v1 wiring unchanged.
- v1 input continues to render at no-query / `?dev=1` (single field). v2 input renders the dual UI.
- Manual visual verification: BID 7 / ASK 2 produces Client Bid 157.69 + Client Ask 157.79 + blended P/L $1,426; Balance equalizes to 5/5; Zero clears both.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (371 pass / 0 todo, +7 new — dual UI render, +/- per side, Balance even + odd-rounding, Zero, independent edit, focused-input keyboard) · test:e2e ✓ (6/6 in 36.2s).

**User-directed decisions:**

- None — within FXSW-040 plan AC.

**Agent-directed decisions:**

- **`DualMarginControls` + `MarginRow` extracted as sibling sub-components, not inlined.** Keeps `PricingPanel` readable; mirrors the existing `Cell` sub-component pattern.
- **Discriminator is presence of both `marginPair` + `onMarginPairChange`.** Not a `devVersion` import inside PricingPanel — keeps the panel pure of routing concerns and testable in isolation.
- **Per-input keyboard handler on `<input onKeyDown>`, not document-level.** When a v2 user is typing in either bid or ask input, only that side adjusts; the document-level handler skips because target is an `HTMLInputElement`. Keeps the v1 panel-focused keyboard shortcut working when no input has focus.
- **Minimum margin on dual UI is 0, not 1.** Zero button needs to be effective. The single-input v1 keeps `MIN_MARGIN=1` for backwards compat. Each side's `−` button disables at 0.
- **Balance + Zero buttons sit on a centered single row between the two side rows.** Visually mirrors "this affects both sides equally".

## FXSW-039 · Dual margin state model

- New type `MarginPair = { bid: number; ask: number }` exported from `@/types/deal`.
- `TicketPanel` migrates from `margin: number` to `marginPair: MarginPair`. Both sides default to `deal.defaultMarginPips`. A new `savedPairForUndo: MarginPair | null` state captures the pre-apply pair for lossless AI undo.
- `SuggestionPanel` API extended with optional `onUndo?: () => void`. When provided, Undo delegates restoration to the parent (lossless pair restore); when omitted, falls back to the v1 single-value `onApply(appliedFrom)` path. v1 callers don't need to pass it.
- `TicketPanel` `onApply` handler: `setSavedPairForUndo(marginPair); setMarginPair({ bid: pips, ask: pips })`. `onUndo` handler restores from `savedPairForUndo`.
- `ClientSummaryPanel` accepts `marginPair` instead of `margin`. Computes `clientBid = traderBid - marginPair.bid`, `clientAsk = traderAsk + marginPair.ask`. P/L uses the blended average margin as a placeholder until FXSW-041 splits the display by direction.
- `PricingPanel` API unchanged — TicketPanel synthesizes `margin = marginPair.bid` and translates `setMargin(n)` into `setMarginPair({ bid: n, ask: n })`. Keeps the single-input v1 UI working untouched.
- v1 behaviour byte-for-byte preserved: single-input writes both sides equal, AI suggestion still works, Undo still restores correctly (because at apply time bid === ask in v1).
- v2 behaviour: parent owns the pair, dual UI in FXSW-040 will let the trader diverge.
- 5 ClientSummaryPanel test fixtures migrated from `margin={n}` to `marginPair={{ bid: n, ask: n }}`. 2 new cases assert divergent bid/ask renders correctly and P/L uses the blended average.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (364 pass / 0 todo, +2 new) · test:e2e ✓ (6/6 in 35.3s).

**User-directed decisions:**

- None — within FXSW-039 plan AC.

**Agent-directed decisions:**

- **`MarginPair` lives on `Deal` types module.** Closest semantic home; consumed by TicketPanel + ClientSummaryPanel. Not on suggestion types since the engine still returns a single number.
- **PricingPanel API unchanged in this ticket.** Single-input v1 UI is still the rendered control; FXSW-040 will swap it for the v2 dual-input. Keeping the API stable here means FXSW-040 can do the API extension in one focused commit.
- **`onUndo` is optional, not required.** v1 callers (no Undo path in existing tests' Harness) don't have to be touched. The v1 fallback `onApply(appliedFrom)` is preserved as a graceful degradation path.
- **P/L uses blended average pips.** In v1 (bid === ask) the value is identical to v1's single-margin P/L. In v2 (bid ≠ ask) it represents the "spread" P/L until FXSW-041 splits the display per direction. Avoids leaving a wrong number on screen.
- **`savedPairForUndo` lives on TicketPanel, not the store.** Per-ticket state, resets on deal-open like every other ticket field. No global persistence needed.

## FXSW-038 · PricingPanel side-selection UX (v2)

- `PricingPanel.Cell` gains `dimmed` + `disabled` props, surfaced as `data-dimmed="true"` and `data-disabled="true"`. Dimmed = opacity 50; disabled = opacity 35 + `cursor-not-allowed` + no click handler.
- `PricingPanel` accepts two new optional props: `onExitFixed?: () => void` (re-click toggle target) and `quoteSide?: QuoteSide` (default `'BOTH'` = v1 behaviour).
- New `handleCellClick(side)` rule:
  1. If `quoteSide` restricts that side (`ASK` ⇒ BID blocked, `BID` ⇒ ASK blocked), no-op.
  2. Else if already in fixed mode for that side AND `onExitFixed` provided, exit.
  3. Else enter fixed for that side.
- `TicketPanel` wires the v2 path: `isV2 = getDevVersion() === 'v2'`. When v2, passes `quoteSide={quoteSideFor(deal.side, deal.dealtCcy)}` + an `onExitFixed` that resets pricing mode to streaming. v1 omits both — identical to prior behaviour.
- Visual verification at `?dev=v2`: OFF_HOURS (SELL USD USDJPY) → dim is striking, easy to scan. QUOTE_DEALT (SELL JPY USDJPY) → BID disabled at ~35% opacity, only ASK clickable.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (362 pass / 0 todo, +7 new PricingPanel cases for dim/disabled/re-click/v1-regression/quoteSide=BID/ASK) · test:e2e ✓ (6/6 in 36.5s).

**User-directed decisions:**

- None — all decisions within FXSW-038 plan AC.

**Agent-directed decisions:**

- **`quoteSide` as an optional prop with default `'BOTH'`.** Lets v1 callers pass no prop and get the v1 "any side clickable" behaviour for free. v2's TicketPanel passes the computed `quoteSideFor` result.
- **`onExitFixed?: () => void` is optional.** v1 callers don't pass it; the re-click-to-streaming behaviour is opt-in for v2 only. v1's re-click-same-side path falls through to `onEnterFixed` (parent's setter is idempotent — no visible effect).
- **Disabled cells render the live tick value, not em-dash.** The trader still wants to see the other side of the market even when they can't quote on it.
- **No new test harness.** Existing PricingPanel.test.tsx had the Harness pattern; new v2 cases inline the props (smaller test surface).
- **`Cell.onClick = disabled ? undefined : onClick`.** Cleaner than a no-op handler. Combined with `aria-disabled` + cursor-not-allowed for affordance.

## FXSW-037 · Side BOTH + dealtCcy + quoteSideFor + new scenarios (v2)

- `Side` extended from `'BUY' | 'SELL'` to `'BUY' | 'SELL' | 'BOTH'`.
- `Deal` gains a required `dealtCcy: 'BASE' | 'QUOTE'` field. All 5 v1 scenarios add `dealtCcy: 'BASE'` (unchanged behaviour); 2 new v2 scenarios added.
- New `src/lib/quoteSide.ts` exports `quoteSideFor(side, dealtCcy): 'BID' | 'ASK' | 'BOTH'` — the canonical BUY/SELL × base/quote → bid/ask truth table.
- New `src/lib/format.ts` helper `dealtCcyCode(pair, dealtCcy)` returning the 3-letter dealt code. `formatAmount` extended with optional `dealtCcy` param (defaults to `'BASE'` — v1-compatible).
- New scenarios in `definitions.ts`:
  - `BOTH_SIDED_INQUIRY` — Acme Corp · EURUSD · BOTH · BASE · 8M EUR · `SIZE_LIMIT`.
  - `QUOTE_DEALT_INQUIRY` — Northwind FX · USDJPY · SELL · QUOTE · 1B JPY · `OFF_HOURS`.
- `ScenarioId` splits into `V1_SCENARIO_IDS` + `V2_SCENARIO_IDS`; `SCENARIO_IDS` remains the full list.
- `DevInjector` branches on `devVersion`: v2 surfaces both new buttons, v1 stays as before.
- `dispatcher.buildMessage`: BUY → "buy", SELL → "sell", BOTH → "trade"; amount uses dealt currency, so quote-dealt scenarios read "wants to sell 1,000,000,000 JPY USDJPY".
- Blotter color theming: BOTH renders in neutral `text-text-dim` (not red/green).
- `ActiveBlotter` + `HistoricBlotter` pass `dealtCcy` through to `AmountCell` / use `dealtCcyCode` for the historic in-row inline render.
- `SummaryPanel` rewords the sentence for BOTH: "wants two-sided prices on N CCY vs Other"; v1 case "wants to BUY N CCY" preserved.
- `DealSummaryPanel` uses `dealtCcyCode` for both the Direction strip and the Notional formatting.
- `SuggestionInput.side` widened to `'BUY' | 'SELL' | 'BOTH'` so TicketPanel can pass through any side; engine ignores side internally so no logic change.
- 9 component test fixtures updated to include `dealtCcy: 'BASE'`.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (355 pass / 0 todo, +14 across quoteSide + dispatcher + DevInjector + scenarios + buildMessage) · test:e2e ✓ (6/6 in 36.6s).

**User-directed decisions:**

- None — all decisions within Phase 6 plan guidance (BACKLOG FXSW-037 AC + the user-confirmed AskUserQuestion answers).

**Agent-directed decisions:**

- **`dealtCcy` required on `Deal`, not optional.** Adding it as optional would have left every reader doing `?? 'BASE'`. Required + adding it to existing fixtures kept the type clean and forced explicit thinking at every Deal construction site.
- **Widen `SuggestionInput.side` rather than coerce.** Engine.ts and rationale.ts don't read `side`, so widening to `'BUY' | 'SELL' | 'BOTH'` is byte-for-byte equivalent to the prior contract while admitting BOTH at the call site.
- **`SummaryPanel` sentence rewrite for BOTH.** "wants to BOTH 8,000,000 EUR" reads poorly; "wants two-sided prices on 8,000,000 EUR vs USD" reads like a trader. V1 case unchanged.
- **Conditional cross-leg display ("vs" leg).** When base-dealt, "vs" reads the quote code. When quote-dealt, "vs" reads the base. Mirrors how a trader would describe the trade.
- **Single `dealtCcyCode` helper, not five inlined `slice` calls.** One source of truth, importable from `@/lib/format`.
- **Split `SCENARIO_IDS` into V1 + V2.** Keeps `SCENARIOS` index complete (for round-trip tests and persistence) while letting the DevInjector pick its own subset per devVersion.

## FXSW-036 · Resizable blotter divider + sessionStorage persistence (v2)

- New `src/components/ResizeHandle.tsx` — 4px horizontal handle with `cursor-row-resize`, `data-testid="blotter-resize-handle"`, `data-dragging="true"` during active drag, `role="separator"` + aria-valuenow/min/max.
- New `src/lib/resizeMath.ts` — pure `computeNewSplit(initialSplit, initialClientY, currentClientY, containerHeight)` with `BLOTTER_SPLIT_MIN=20` / `BLOTTER_SPLIT_MAX=80`. Extracted from the component file so react-refresh stays happy.
- `settingsStore.ts` extended with `blotterSplit: number` (default 55) + `setBlotterSplit(n)`; persists under `si.blotterSplit` in sessionStorage; malformed stored values fall back to default.
- `App.tsx` branches on `devVersion`: v1 keeps static `flexBasis: 55%`/`45%`; v2 reads `useSettingsStore.blotterSplit`, uses `ResizeObserver` to track main container height, renders `<ResizeHandle>` between the two sections.
- jsdom polyfill: no-op `ResizeObserver` in `src/test-setup.ts` so component tests don't crash.
- Manual visual verification at `?dev=v2` on `pnpm dev` — drag works, clamps engage at 20%/80%, sessionStorage persists across reload. v1 (`?dev=1`) byte-for-byte unchanged per e2e suite (6/6 in 36.3s).
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (341 pass / 0 todo, +16 new across resize math + handle component + settings store + App) · test:e2e ✓ (6/6 in 36.3s).

**User-directed decisions:**

- None — within Phase 6 plan guidance (`05-ui-ux-spec.md §11.1` + BACKLOG FXSW-036 AC).

**Agent-directed decisions:**

- **Update store on every `pointermove` rather than commit on `pointerup`.** The plan said "Drag updates split on pointermove, persists on pointerup". Simpler implementation: writing to sessionStorage on every move is ~60Hz which is cheap, and avoids needing local component state to track the in-progress drag. Visual feedback is live, and a sudden tab close still preserves the latest position.
- **`ResizeObserver` over `window.resize` listener.** More accurate (catches main-element resize from ticket-open opacity transitions, future flex changes) and is the modern idiomatic API. Polyfilled as a no-op for jsdom.
- **MouseEvent dispatch + `act` wrapper in tests instead of `fireEvent.pointerDown`.** jsdom's `PointerEvent` constructor drops `clientY` from the init dict. Tests dispatch `new MouseEvent('pointerdown', { clientY, bubbles })` which jsdom honours.
- **Constants + pure fn live in `src/lib/resizeMath.ts`, not `ResizeHandle.tsx`.** react-refresh ESLint rule requires component files export only components. Moving the math out also makes it directly importable by future consumers (e.g. a horizontal blotter splitter in v3 etc.).
- **No `border-b border-border` on the Active section in v2.** The 4px resize handle is the visual divider; a double border would look chunky.

## FXSW-035 · `devVersion` parser + `?dev=v2` URL gate

- New module `src/lib/devVersion.ts` with `type DevVersion = 'v1' | 'v2'`, pure `parseDevVersion(search)`, and SSR-safe `getDevVersion()` wrapper.
- Parses `?dev=v2` → `'v2'`; everything else (`?dev`, `?dev=1`, `?dev=v3`, `?dev=V2`, no query, other params) → `'v1'`.
- Wiring-only ticket — no UI consumer yet; FXSW-036 onwards branch on it.
- Existing `isDevMode()` in `App.tsx` continues to gate the Dev Injector via `.has('dev')`, so `?dev=v2` already shows the injector as a superset of `?dev=1`. Locked with a new App test.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (325 pass / 0 todo, +9 new) · test:e2e ✓ (6/6 in 35.7s).

**User-directed decisions:**

- None — all decisions within Phase 6 plan guidance (`/root/.claude/plans/spicy-bouncing-pillow.md` §"Versioning gate" + BACKLOG FXSW-035 AC).

**Agent-directed decisions:**

- **Export `parseDevVersion(search: string)` instead of a module-load `const devVersion`.** Plan suggested `export const devVersion`, but a const is evaluated once at module import — awkward to vary `window.location.search` per test. A pure parser fn is trivial to test; `getDevVersion()` wraps it for the single live call-site (no `window` SSR guard needed in jsdom but cheap to add).
- **Case-sensitive match.** `?dev=V2` resolves to v1, not v2. The URL is the contract; users typing the gate get the casing right. Lock in a test so we don't accidentally widen later.
- **No App.tsx code change.** `isDevMode()` already uses `.has('dev')` which is true for `?dev=v2`. The new App test asserts that — locks the superset behaviour without code churn.

## Post-Phase 5 cleanup

- Removed unused placeholder files and unused dependencies.
- Confirmed blotters use a plain flex layout rather than the originally planned grid library.
- Reworded stale comments that made completed work sound pending.
- Kept the current-stack docs aligned with implementation reality.
- All implementation gates were green at the time of cleanup.

## FXSW-033 · README + demo recording

- README was rewritten for the shipped state.
- Added CI/deploy badges, scenario overview, CI notes, demo placeholder, and full docs index.
- Demo recording remained a manual artifact.
- README was checked for brand-neutrality.

## FXSW-032 · CI workflow

- Added CI workflow for typecheck, lint, unit tests, E2E tests, and build.
- Added Playwright trace upload on failure.
- Later fixes pinned runner, built before E2E, and forced IPv4 preview binding.

## FXSW-031 · RELEASE_PATH E2E

- Added E2E coverage for Release path.
- Release closes ticket and returns deal to available state.
- Confirmed the row stays in Active because the path is non-terminal.

## FXSW-030 · Visual polish pass

- Lifted shared button primitives.
- Added polish for ticket overlay, header, AI panel, animations, hover states, and focus rings.
- Preserved existing behavioural tests.

## FXSW-029 · Notification sound + mute

- Added WebAudio chime.
- Added browser audio-unlock handling.
- Added mute toggle with session-level persistence.

## FXSW-028 · Toast and title notifications

- Added toast stack for new manual-pricing requests.
- Added title flash.
- Added row flash for new SI deals.
- Ensured notifications fire once per new eligible deal.

## FXSW-027 · Credit decline guardrail

- AI suggestion panel recommends decline for credit-limit cases.
- Apply is not offered where the correct path is rejection.

## FXSW-026 · Suggestion panel apply/undo

- Added AI Margin Suggestion panel states: ready, applied, undo, computing, and decline.
- Margin can be applied into ticket state and undone.

## FXSW-025 · Suggestion rationale builder

- Added concise rationale generation for deterministic suggestion output.
- Kept rationale short enough for dense trading UI.

## FXSW-024 · Suggestion engine

- Added deterministic suggestion logic.
- Inputs include client profile, rejection reason, notional, pair, and market context.
- Output includes suggested margin, recommendation type, and rationale factors.

## FXSW-023 · Client profiles

- Added seed client profiles for demo scenarios.
- Profiles support tier, sensitivity, risk posture, and relationship context.

## FXSW-022 · Phase 4 wiring

- Wired AI suggestion service into the ticket workflow.
- Preserved deterministic behaviour for tests.

## FXSW-021 · OFF_HOURS E2E

- Added E2E coverage for off-hours manual pricing.
- Flow opens ticket, sends stream, receives client acceptance, and archives to Historic.

## FXSW-020 · Ticket footer and action flow

- Added footer actions for Reject, Release, Send Stream, Send Quote, Withdraw, and Return to Stream.
- Added acknowledgement states for user actions.

## FXSW-019 · Client summary and pips library

- Added client bid/ask preview and estimated profit.
- Added pip-size and client-price helpers.

## FXSW-018 · Pricing panel fixed mode and margin controls

- Added fixed-price selection and refresh.
- Added +/- and numeric margin controls.
- Client price updates from margin changes.

## FXSW-017 · Pricing panel streaming mode

- Added live streaming price cells driven by the simulated feed.
- Added stale-feed handling and value-change animation.

## FXSW-016 · Summary and deal summary panels

- Added natural-language ticket summary.
- Added deal-summary fields and settlement-date formatting.

## FXSW-015 · Reasons panel

- Added risk/rejection reason chips and explanations.
- Ticket renders reason details for manual-pricing cases.

## FXSW-014 · Ticket shell and overlay

- Added right-side ticket overlay.
- Added Esc/backdrop close.
- Opening an eligible row picks up the deal.

## FXSW-013 · Dev Injector and Happy Path ESP E2E

- Added Dev Injector visible behind `?dev=1`.
- Added scenario buttons and Reset.
- Added E2E for Happy Path ESP.

## FXSW-012 · Active and Historic blotters

- Wired Active and Historic blotters to the store.
- Added derived status, terminal dimming, and 5-second archive behaviour.
- Implemented rows using a plain flex layout.

## FXSW-011 · Status derivation

- Added `derivedStatus` mapping across RFS state, SI state, and dealability.
- Covered mapping with unit tests.

## FXSW-010 · Parent deal machine coordination

- Implemented cross-model coordination between RFS and SI machines.
- Added terminal handling and removal transition.

## FXSW-009 · Deals store and machine spawning

- Added Zustand deals store.
- Each deal spawns a parent machine with RFS and SI child machines.
- Store caches child state for React selectors.

## FXSW-008 · DealFeed and scenario player

- Added scenario-driven deal feed.
- Added timed and state-gated follow-ups.
- Added reset handling for tests and demos.

## FXSW-007 · PricingFeed

- Added deterministic simulated pricing feed.
- Added subscriptions and latest-tick access.

## FXSW-001 to FXSW-006 · Phase 1 baseline

- Added Vite + React + TypeScript scaffold.
- Added Tailwind design tokens.
- Added state-machine skeletons.
- Added first application shell and initial blotter row.
- Added GitHub Pages deployment workflow.

## Notes

This file is intentionally summarized after the vendor-reference cleanup. Detailed historical references remain recoverable from Git history, but current documentation is kept brand-neutral.
