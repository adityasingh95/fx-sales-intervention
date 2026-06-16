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

## FXSW-067 · v3 feedback-fix docs

- Documented the v3 feedback fixes across the spec pack and this log (see entries
  below). No new canonical states; all changes remain behind `?dev=v3`.
- Gates: typecheck ✓ · lint ✓ · `test:run` ✓ (457) · build ✓ · `test:e2e` ✓ (8/8);
  brand-neutral build output (provider name confined to the adapter endpoint).

---

## FXSW-071 · Forward-points unit label

- The bare forward-points figure now carries a `pips` suffix (e.g. `−120.1 pips`)
  so it reads as a quoted quantity rather than a stray number. The `fwd-points`
  testid still wraps the value only.
- Agent-directed clarity fix from live v3 feedback (item 5). The value itself
  (e.g. EURUSD 1Y ≈ −120) is the simulated forward discount and was already
  correct.

---

## FXSW-070 · Auto-priced timeline phase

- ESP (auto-priced) deals previously mapped RFS `Executable → PRICE_BACK`, so the
  detail timeline read "Priced back" for a deal no trader ever priced. Added a
  distinct `AUTO_PRICE` phase (`src/types/lifecycle.ts`), remapped
  `lifecyclePhase.ts`, and labelled it **"Auto-priced"** in `TimelinePanel`.
- `HistoricDetailPanel` now shows an "Auto-priced — streamed within tolerance,
  no manual markup applied" note for these deals instead of "No price was sent".
- User-directed (item 3). Timeline is v3-only-visible; no GA behaviour changes.

---

## FXSW-069 · Read-only view for happy auto-priced deals

- Opening a happy auto-priced (ESP / `AUTO`) deal under v3 no longer fires
  `PickUp`; it opens a **read-only** ticket (`data-readonly`, `auto-priced-note`)
  with the deal terms + streamed client price, and no pricing panel or footer.
  An already auto-priced deal is no longer pulled into manual handling.
- Latched once per open (`autoView`) so it stays stable after the deal
  auto-confirms while SI remains `Initial`. Gated by `isV3()`; GA still picks up.
- User-directed (item 2; "open read-only view").

---

## FXSW-068 · One-sided requests lock the off-side markup

- For a one-sided request only the quotable side can be priced, so the
  non-quotable side's margin stepper is now disabled and the two-sided
  Balance/Zero shortcuts are hidden — in both the spot (`PricingPanel`) and
  forward (`ForwardPointsPanel`) markup blocks. `MarginRow` gained a `disabled`
  prop; the restriction is driven by `quoteSide` + a `restrictMarginSides` flag.
- Gated by `isV3()` (GA keeps both sides editable); the price *cells* were
  already side-gated. User-directed (item 1).

---

## FXSW-066 · Request ID / Trade ID / Value date in blotters

- **Synthetic display identifiers**: new `src/lib/ids.ts` (`makeRequestId` →
  `REQ-XXXXXX`, `makeTradeId` → `TRD-XXXXXX`). `requestId` is minted in
  `dealsStore.addDeal` for every deal; `tradeId` only in the archive closure when
  `outcome === 'Executed'`. Stored on `DealEntry` / `HistoricEntry`, not on `Deal`.
- **Blotters** (v3-gated, GA layout untouched): Active gains Request ID + Value
  date columns; Historic gains Request ID + Trade ID + Value date. Wrapper
  `min-w` widened under v3; mobile cards get a compact line. Value date reuses
  `valueDateForTenor` + `formatSettlementDate` (`src/lib/time.ts`).
- **Detail overlay** surfaces Request ID + Trade ID (`detail-request-id` /
  `detail-trade-id`).
- User-directed: synthetic IDs + new columns.

---

## FXSW-065 · Withdrawn quote as a separate lifecycle event

- Added `WITHDRAWN` to `LifecyclePhase`; mapped SI `WithdrawSent → WITHDRAWN` in
  `lifecyclePhase.ts` (previously unmapped, so a take-back left no timeline
  trace). `TimelinePanel` renders it as "Quote withdrawn". RFS withdraw bounces
  straight to `PickedUp` (auto path), so SI-only mapping suffices.

---

## FXSW-064 · Forward all-in figures reflect markup + forward Balance/Zero

- The forward panel's All-in bid/ask were spot + points only and ignored the
  markup, so Balance/Zero and per-side forward points never moved them (user
  items 2 + 4). They now use `clientBidFromForward` / `clientAskFromForward`
  (`src/lib/pips.ts`) — spot + points + spot margin + forward-points margin per
  side — matching `ClientSummaryPanel`. The mid stays the un-marked outright.
- `BalanceZeroRow` reused for the forward-points component row (`idPrefix="fwd-"`,
  `minMargin={0}` so Zero/Balance can reach 0); spot testids preserved verbatim.
- User-directed: reflect full markup.

---

## FXSW-063 · Fix markup-mode toggle flicker

- `ToggleButton` was declared inside `ForwardPointsPanel`, giving it a new
  identity on every ~300ms tick re-render → unmount/remount → hover flicker and
  intermittently dropped clicks. Hoisted to module scope (pure, props-driven).

---

## FXSW-062 · External feed endpoint → Massive

- The adapter targeted the retired `api.polygon.io` host (Polygon.io rebranded to
  Massive, 2025-10), causing `ERR_NAME_NOT_RESOLVED` in the browser. Switched
  `BASE_URL` to `https://api.massive.com/v2/aggs/ticker`; the `C:{PAIR}` ticker
  convention and `apiKey` query param are unchanged. Provider name permitted in
  adapter code only (rule #2 exception); UI strings stay generic.
- Follow-up flagged: the call runs in the browser, so it needs CORS support from
  Massive; static Pages has no proxy fallback.

---

## FXSW-061 · v3 spec docs + CLAUDE.md exceptions + phase summary

- **Appended v3 sections** to the spec pack mirroring the v2 precedent: `02` §10 (functional: ingestion / forwards / forward injection / historical detail), `03` §9 (lifecycle-log note — no new canonical states), `04` §8 (external feed seam + forward points), `05` §15–16 (`?dev=v3` gate + v3 visuals), `07` §12 (forward injection), `09` §16 (per-component forward suggestion).
- **CLAUDE.md** scoped rule #2 (brand-neutrality: adapter may name the provider; UI strings stay generic) and rule #3 (simulated by default; opt-in `?dev=v3` runtime poller), plus convention notes (PricingPanel is a folder; devVersion reinstated).
- **New `docs/phase-summaries/phase-08-v3-summary.md`** — scope, ticket list (FXSW-048…061), decisions, gate results.
- **E2E:** added `v3-forwards.spec.ts` (forward injection → forward-points panel, all-in rates, component-markup toggle, off-by-default feed status) and `v3-historic-detail.spec.ts` (drive a deal to Executed → click the Historic row → timeline overlay with all five phases). Both at `?dev=v3`; the 6 existing scenario specs (bare URL) stay green.
- Gates: typecheck ✓ · lint ✓ · `test:run` ✓ (455) · build ✓ · `test:e2e` ✓ (8/8).

---

## FXSW-060 · Historical trade detail view + markup-reason capture

- **`uiStore`** gains `openHistoricId` + `openHistoric`/`closeHistoric`; opening either overlay closes the other.
- **`HistoricBlotter`** rows/cards become `<button>`s under `isV3()` (GA stays `<div>`s), preserving `data-deal-id`/`data-outcome`, and open the detail overlay.
- **New `TimelinePanel`** — renders the captured lifecycle events as a timestamped list (request → pickup → released → priced back → response) with the Clock icon; `data-testid="timeline-panel"`, `data-phase` per row.
- **New `HistoricDetailPanel`** — read-only overlay reusing the TicketPanel shell (slide-in, Esc + backdrop close, no footer/machine). Shows outcome pill + archived time, reuses `ReasonsPanel`/`SummaryPanel`/`DealSummaryPanel`, a **markup-reason** block (applied margin, AI-suggested vs manual, rationale — spot or forward component shape), and the timeline. Mounted in `App` under `isV3()`.
- **Markup-reason capture** wired via the new `useQuoteContextCapture` hook (extracted to keep TicketPanel at 289 lines): on the QuoteSent transition it merges the applied margin + AI flag + rationale into the PRICE_BACK lifecycle event; resets on return to PickedUp so a re-quote re-records. `TicketPanel` tracks `aiApplied`/`appliedRationale` set on Apply and cleared on Undo.
- Gates: typecheck ✓ · lint ✓ · full suite ✓ (455; +3 HistoricDetailPanel).

---

## FXSW-059 · Dev Injector forward toggle + parameterized injection

- **`ScenarioOverrides` ({ tenor? })** added to `types/scenario.ts`; `player.inject(id, overrides?)` and `buildDeal` apply a tenor override over the scenario's deal; `dealFeed.inject` + the `DealFeed` interface thread it through. Defaults preserve SPOT, so the 7 scenarios are reused, not duplicated.
- **`DevInjector`** (v3 only, via `isV3()`) gains a `TenorSelect` (`forward-tenor-select`) in both the desktop bar and the mobile menu. Inject buttons call `injectScenario(id)`, which passes `{ tenor }` only when non-SPOT. On the bare GA URL the select is hidden and injection is unchanged.
- Gates: typecheck ✓ · lint ✓ · player (4) + dealFeed (4) + injector (1) tests ✓.

---

## FXSW-058 · AI per-component forward suggestion

- **`SuggestionInput.deal.tenor`** (optional, defaults to SPOT) and **`ReadySuggestion.fwdPointsPips`** (optional) added to `types.ts` — backward-compatible, so all existing engine/rationale/profile tests pass untouched.
- **New `forwardEngine.ts`** — `suggestForwardPointsMargin(tenor, input)` returns a forward-points margin that widens with tenor (and with thin liquidity) plus a `Forward tenor` factor. Kept separate so the spot rule chain in `engine.ts` is unchanged.
- **`engine.ts`** — after computing the spot component, non-SPOT deals append the forward-points margin + factor and surface `fwdPointsPips`. The spot `suggestedPips` is independent of tenor.
- **`SuggestionPanel`** — `onApply(next, fwdPips?)`; forward suggestions show "spot pips · +N fwd pips" and the applied row reflects both; Apply passes both components.
- **`TicketPanel`** — Apply writes both the spot margin and (for forwards) the forward-points margin, switches to component mode, and saves both for a lossless Undo; reset clears the new saved-fwd state.
- Gates: typecheck ✓ · lint ✓ · full suite ✓ (450; +4 forward engine tests).

---

## FXSW-057 · Forward UI — ForwardPointsPanel, LegTabs, summary + client changes

- **New `pricing/ForwardPointsPanel.tsx`** (renders for non-SPOT deals) — forward points, all-in outright bid/mid/ask, and a markup-mode toggle. In **component** mode it shows an independent forward-points margin row (reusing `MarginRow` with a `fwd-` id prefix → `margin-input-fwd-bid/ask`); in **all-in** mode the spot Trader Rate margin applies to the whole outright and the forward row is hidden. New testids: `forward-points-panel`, `fwd-points`, `all-in-bid/mid/ask`, `markup-mode-toggle`.
- **New `pricing/LegTabs.tsx`** — swap seam; renders nothing for a single (NEAR) leg, one tab per leg for a future swap.
- **`MarginRow`** gained optional `idPrefix`/`labelPrefix` so forward-margin inputs get distinct ids without colliding with the spot row (defaults preserve every existing spot testid).
- **`ClientSummaryPanel`** — optional `fwdPoints`/`fwdMarginPair`; for forwards client bid/ask are all-in outright rates (`clientBidFromForward`/`clientAskFromForward`) and P/L uses the summed spot + forward margin off the all-in mid. Spot path unchanged.
- **`SummaryPanel` + `DealSummaryPanel`** now derive the value date via `valueDateForTenor` (T+2 for SPOT, unchanged); DealSummary labels it "Value date" and adds a Tenor field for forwards.
- **`TicketPanel`** wires forward state (`fwdMarginPair`, `markupMode`) and renders the forward section for forward deals. To stay under the 300-line limit, the AI-suggestion lifecycle was extracted to **`useSuggestionState.ts`** (TicketPanel 256 lines).
- Gates: typecheck ✓ · lint ✓ · full suite ✓ (446; +4 ForwardPointsPanel; existing ticket tests unchanged).

---

## FXSW-056 · PricingPanel split (pure refactor)

- **Decomposed the 432-line `PricingPanel.tsx`** (over the 300-line limit) into `src/features/ticket/pricing/`: `types.ts` (constants + `FlashDir`/`PricingMode`/`Side`), `Cell.tsx` (bid/ask price cell), and `MarginControls.tsx` (`SingleMarginControl` v1 + `MarginRow` + `BalanceZeroRow`). The orchestrator is now 217 lines and keeps the flash/stale/glow/keyboard state.
- **Behaviour-preserving for the spot path:** every `data-testid` and `data-*` attribute is unchanged on its original element, so `PricingPanel.test.tsx` (23) and `SuggestionPanel.test.tsx` (14) pass without edits — the regression gate for this refactor.
- This split is the prerequisite for adding the forward sub-panels (FXSW-057) without re-breaching the line limit.
- Gates: typecheck ✓ · lint ✓ · 37 tests ✓.

---

## FXSW-055 · Seeded forward-points feed

- **Extracted `makeRng` (+ added `hashSeed`) to `src/services/feed/rng.ts`** and imported it back into `pricingFeed.ts`. The Mulberry32 implementation is identical, so the seed-42 golden sequence is unchanged (verified).
- **New `src/services/feed/forwardPoints.ts`** — `forwardPointsFeed.get(pair, tenor)` returns deterministic points (in pips), seeded *independently* of the spot RNG via `hashSeed('{pair}:{tenor}') ^ FWD_SEED`, so it never perturbs the spot stream. Magnitude scales with tenor (rate-differential shape), sign is per-pair, SPOT = 0, with a small (±0.3 pip) deterministic jitter. Exposed behind a tiny `ForwardPointsFeed` interface so a real forward curve can replace it later.
- Gates: typecheck ✓ · lint ✓ · `forwardPoints.test.ts` (4) + `pricingFeed.test.ts` (9, golden unchanged) ✓.

---

## FXSW-054 · Forward types + pip math + value dates

- **`types/deal.ts`** — widened `Tenor` to `SPOT | 1W | 2W | 1M | 2M | 3M | 6M | 9M | 1Y`, added `TENORS`/`FORWARD_TENORS`/`isForwardTenor`, and the swap seam: `LegKind` (`NEAR | FAR`), `DealLeg`, and an optional `Deal.legs`. The widening is pure — SPOT deals, scenarios, and machines are unaffected; v3 derives the single near leg from `tenor`, so `legs` stays optional/unused for now.
- **`lib/pips.ts`** (single source of truth) — `allInRate(spot, fwdPoints, pair)` (forward outright = spot + points×pip), `sumMargins` (component totals per side), and `clientBidFromForward`/`clientAskFromForward` which compose the existing spot client-rate semantics over the all-in rate with the summed spot+forward margins. No new rounding logic — reuses the private `roundTo`/`DECIMALS`.
- **`lib/time.ts`** — `valueDateForTenor(tradeDate, tenor)`: spot (T+2) shifted by the tenor period (week tenors add calendar days; month/year tenors add months) then rolled forward to a business day. The `rollForward` seam is where a real holiday calendar could later slot in.
- Gates: typecheck ✓ · lint ✓ · `pips.test.ts` (13) + `time.test.ts` (11) ✓.

---

## FXSW-053 · External feed status indicator + settings popover

- **New `src/features/settings/ExternalFeedPanel.tsx`** — a header control (gear icon + status `Pill`) rendered only under `isV3()` (gated in `App.tsx`, placed before `ThemeToggle`). The popover holds a password-style API-key input (bound to `settingsStore.externalFeedKey`) and an enable checkbox (disabled until a key is present). Status is read live via `externalFeed.subscribeStatus`.
- **Generic labels only:** status maps `off/connecting/live/error/rate-limited` → grey/blue/green/red/amber pills with plain English; no vendor name appears in any user-visible string (`data-testid="external-feed-status"`, `data-feed-status`). A test asserts the absence of provider names in the pill.
- Gates: typecheck ✓ · lint ✓ · full unit suite ✓ (429 tests; +3 panel tests, `App.test.tsx` unchanged since the panel is v3-gated).

---

## FXSW-052 · External feed settings (GUI key) + main.tsx wiring

- **`settingsStore`** gains `externalFeedKey: string | null` and `externalFeedEnabled: boolean`, both session-only (`si.externalFeedKey` / `si.externalFeedEnabled`) and **default OFF**, following the store's existing read/write/try-catch pattern. Setting an empty key clears it.
- **New `wireExternalFeed.ts`** bridges the store to `externalFeed.enable/disable`, kept outside the store to avoid a store→service import cycle. It applies the current state on mount and on every change (enable only when a key *and* the toggle are present; disable otherwise), deduping redundant calls.
- **`main.tsx`** calls `wireExternalFeed()` only under `isV3()`, after `pricingFeed.start()`. On the bare GA URL the bridge is never mounted, so the simulated feed is untouched.
- Gates: typecheck ✓ · lint ✓ · `settingsStore.test.ts` (13) + `wireExternalFeed.test.ts` (3) ✓.

---

## FXSW-051 · External market-data adapter + poller

- **New `src/services/feed/external/`** — `provider.ts` (fetches the previous-close forex aggregate `C:{PAIR}/prev`; the close is already in our pair convention so no inversion is needed, unlike the build-time Frankfurter script; `ProviderError` carries a `rateLimited` flag; `fetchImpl` is injectable so no real network call runs under Vitest), `poller.ts` (pure self-rescheduling controller: immediate first poll, 5-min cadence, exponential backoff capped at 30 min, distinct `rate-limited` vs `error` status), `externalFeed.ts` (module singleton bridging successful polls into `pricingFeed.setReferences`, broadcasting a coarse `ExternalFeedStatus`), and `types.ts`.
- **Brand-neutrality exception applied per plan:** the provider is named only in `provider.ts` adapter code; status values are generic (`off/connecting/live/error/rate-limited`) and carry no vendor name.
- **OFF by default** — nothing here runs until `enable(apiKey)` is called (wired in the next ticket), so tests/E2E keep the simulated deterministic feed.
- Gates: typecheck ✓ · lint ✓ · `provider.test.ts` + `poller.test.ts` ✓ (10 tests).

**Agent-directed decisions:**

- **Previous-close aggregate endpoint** over real-time last-quote: it's on the provider's free tier and refreshes slowly enough for a 5-min anchor poll, matching the user's stated rate constraint. Real-time can swap in behind the same `fetchMids` seam later.
- **setTimeout self-reschedule** rather than `setInterval`, so error backoff is expressed by simply scheduling the next run later — no separate interval-cancel dance.

---

## FXSW-050 · PricingFeed `setReferences` / `clearReferences` seam

- **Extended the `PricingFeed` interface** (`src/services/feed/types.ts`) with `setReferences(Partial<Record<Pair, number>>)` and `clearReferences()`. The implementation merges finite values into the existing module-level `references` map that `tick()` already reads first, so the mean-reversion target moves on the next tick while mids/RNG state are untouched. `clearReferences()` reverts to the baked mids (re-seeding anchors if the feed is running, else leaving the map empty for the baked-file fallback).
- **`tick()` is unchanged** — this is the whole point: when the external adapter never calls `setReferences` (the default/simulated path), the seeded sequence is byte-identical. The seed-42 golden test still returns `[1.1715, 1.1714, …]`.
- Tests: `setReferences` drifts the mid toward a new anchor; non-finite values and untouched pairs are ignored; `clearReferences` reverts toward the baked mid.
- Gates: typecheck ✓ · `pricingFeed.test.ts` ✓ (9 tests; +3 new, golden unchanged).

---

## FXSW-049 · Per-deal lifecycle event log (v3 foundation)

- **New `src/types/lifecycle.ts`** — `LifecyclePhase` (REQUEST → PICKUP → RELEASE → PRICE_BACK → RESPONSE), `DealLifecycleEvent`, `AppliedMargin` (spot single-pair / forward two-component), and `QuoteContext`. These are display-only phases derived by *observing* the existing SI/RFS transitions; **no new canonical machine states** (per `03-trade-state-model.md` v3 note).
- **New `src/state/stores/lifecyclePhase.ts`** — pure `lifecyclePhaseFor(channel, toState)` mapper, kept out of the store for isolated testing and to stay under the 300-line limit. Maps only trader-meaningful waypoints; ack-only `*Sent` and steady states return null.
- **`dealsStore` instrumented** — `DealEntry` and `HistoricEntry` gain `events: DealLifecycleEvent[]`. The existing SI/RFS subscribers append a mapped event immutably (`replaceEntry`); a `REQUEST` event is seeded at deal creation. A per-deal `phaseChannel` (RFS for ESP auto-priced deals, SI otherwise) selects a single source so the shared PRICE_BACK/RESPONSE transitions the parent fans into both children aren't double-logged. `events` is copied into the `HistoricEntry` in the archive closure.
- **New `recordQuoteContext(dealId, ctx)` store action** — merges the markup reason (applied margin / AI-suggested / rationale) into the most recent PRICE_BACK event; defensive fallback appends one if none exists yet. UI callers wired in a later ticket.
- **New `useHistoricDealById` selector** for the upcoming detail view.
- Gates: typecheck ✓ · lint ✓ · `dealsStore.test.ts` + `lifecyclePhase.test.ts` + `HistoricBlotter.test.tsx` ✓ (22 tests; +3 new).

**Agent-directed decisions:**

- **Single phase-source per deal (`phaseChannel`).** Logging from both SI and RFS would double-count the PRICE_BACK/RESPONSE transitions the parent machine fans into both children. Picking RFS for ESP (where SI never leaves `Initial`) and SI otherwise yields a clean, dedup-free timeline without a separate dedup pass.
- **`snap.event?.type` guarded.** XState fires some transitions (initial/delayed `after`) without a typed triggering event at runtime; the trigger field is optional, so an absent event is recorded as `undefined` rather than throwing.

---

## FXSW-048 · Reinstate the `?dev=v3` gate (Phase 8 / v3 foundation)

- **Re-added `src/lib/devVersion.ts`** — the path FXSW-047 deleted — following the URL-flag pattern documented in `05-ui-ux-spec.md` §12/§14. Exports `devVersion: 'v1' | 'v3'` (parsed once from `?dev=v3`) and `isV3()`. Components and services branch on `isV3()`; no version prop is threaded through the tree. The legacy `?dev=1` flag and any other `dev` value resolve to `v1`, so the bare-URL GA tree is unchanged.
- **`isV3()` is a function** (not just a const) so `devVersion.test.ts` can re-import the module with a `?reload=` cache-buster after stubbing `window.location.search`, mirroring `themeStore.test.ts`'s `freshImport` pattern.
- This is the gate every subsequent v3 ticket (external feed, forwards, historical detail) hangs off; with no flag set, none of that code executes.
- Gates: typecheck (pending full run) · `devVersion.test.ts` ✓ (5 tests).

**Agent-directed decisions:**

- **Version label `v1 | v3`, skipping `v2`.** v2 is now GA (FXSW-047), so the live distinction is GA-vs-next. Reusing the literal `v3` matches the `?dev=v3` flag the user chose and avoids a confusing `v2` alias.

---

## FXSW-047 · Strip `?dev=v2` / `?theme=preview` gates — single-URL GA

- **Promote Phase 6 + 7 to GA.** Removed the URL flags that previously gated v2 features (`?dev=v2`) and the light-theme toggle (`?theme=preview`). The bare URL `/` now renders the full app: resizable blotter, dual-margin UI, BOTH-side support, mobile card-stack, ThemeToggle in header. No more flag composition required for the demo.
- **Files deleted (4):** `src/lib/devVersion.ts`, `src/lib/devVersion.test.ts`, `src/lib/themeMode.ts`, `src/lib/themeMode.test.ts`. The URL-parser pattern is documented in `05-ui-ux-spec.md` §14 for future re-introduction if a new preview gate is needed; no live consumer remains.
- **Source call-sites updated (7):** `src/App.tsx` (drop `isDevMode`, `isV2`, static basis constants — always grow-weighted flex + always-mounted `<ResizeHandle>` + always-mounted DevInjector slot); `src/features/blotter/ActiveBlotter.tsx` + `HistoricBlotter.tsx` (drop `isV2`, `useCards = isMobile`); `src/features/ticket/TicketPanel.tsx` (drop `isV2`, always pass `onExitFixed` / `quoteSide` / `marginPair` / `onMarginPairChange` to `PricingPanel` and `ClientSummaryPanel`); `src/features/dev-injector/DevInjector.tsx` (always `SCENARIO_IDS`, no version split); `src/state/stores/themeStore.ts` (drop the `getThemePreviewEnabled` checks — always honor `prefers-color-scheme` on first visit, always persist to sessionStorage); `src/features/notifications/ThemeToggle.tsx` (drop the early-return null branch).
- **Type cleanup:** `src/types/scenario.ts` collapses `V1_SCENARIO_IDS` + `V2_SCENARIO_IDS` into the single `SCENARIO_IDS` constant. `src/types/deal.ts` strips the stale `?dev=v2` comment from `DealtCcy`.
- **Test cleanup:** `App.test.tsx` collapsed from 6 tests (with-dev=1 / without-dev=1 / with-dev=v2 / v1-no-resize / v2-resize / branding) to 4 (one each for DevInjector + ResizeHandle always-visible); `DevInjector.test.tsx` collapsed from 3 tests (v1 set / no-v2-at-no-query / v2-superset-at-dev=v2) to 1 ("surfaces every scenario"); `ActiveBlotter.test.tsx` collapsed the v1-mobile-keeps-table + v2-mobile-card-stack pair into a single mobile-card-stack assertion (v1 mobile contract no longer exists); `themeStore.test.ts` dropped 4 "flag-off" tests (forces-dark-when-absent, ignores-sessionStorage-when-off, does-not-persist-when-off, writes-dataset-theme-dark-when-off); `ThemeToggle.test.tsx` dropped the "null when flag off" test.
- **E2E specs:** all 5 scenario specs updated from `page.goto('/?dev=1')` → `page.goto('/')`; the `margin-input` testid (v1 single-input UI) updated to `margin-input-bid` (v2 dual-input UI) in `size-limit-margin-tune.spec.ts` and `off-hours-intervention.spec.ts` since the v2 dual-margin UI is always rendered now.
- **PricingPanel v1 branch preserved.** Even though `TicketPanel` now always passes `marginPair`, the `PricingPanel.tsx` v1 single-input fallback (`useDualMargin === false`) remains in source — it's dead in production but still exercised by `PricingPanel.test.tsx` and `SuggestionPanel.test.tsx`. A future cleanup ticket can remove it; not in scope here since the intent of FXSW-047 is URL-gate removal, not component pruning.
- Gates: typecheck ✓ · lint ✓ · test:run ✓ (395 pass — −27 vs FXSW-046; 422 − [9 themeMode parser] − [8 devVersion parser] − [4 themeStore flag-off] − [1 ThemeToggle null-when-off] − [3 App dev-flag] − [1 ActiveBlotter v1-mobile] − [2 DevInjector v1/v2 split] = 394, +1 reconciliation for new "renders DevInjector on bare URL" test) · test:e2e ✓ (6/6 in 35.4s) · build ✓ · brand-neutral grep ✓.

**User-directed decisions:**

- **Bare-URL scope: strip all three gates** (`?dev=v2`, `?theme=preview`, **and** `?dev=1` for DevInjector visibility). Asked via `AskUserQuestion` whether to keep `?dev=1` as a separate dev-mode toggle; user chose "strip all three, keep the URL-flag pattern available for future enhancements" — i.e. document the pattern but don't gate anything with it right now.

**Agent-directed decisions:**

- **Branch name `cleanup/strip-preview-gates` over `dev/fxsw-047` or `feat/single-url-ga`.** This is a cleanup, not a feature; the previous Phase 6/7 branches used `dev/...` for opt-in features. A short, descriptive cleanup prefix differentiates the intent.
- **Keep PricingPanel v1 branch in source.** Could have aggressively pruned `PricingPanel.tsx` lines 232–275 (the single-input UI under `useDualMargin === false`) plus its 30 unit tests and `SuggestionPanel.test.tsx`'s v1 wrapping. Decided against: (a) the unit tests still pass and document the component contract; (b) the dead branch ships zero behavior since the parent always passes `marginPair`; (c) pruning it expands the diff by ~150 LoC for no production change. Filing as a follow-up for the next cleanup pass.
- **E2E flag stripping.** Changed `/?dev=1` → `/` in all 5 scenario specs even though `?dev=1` is now a no-op flag and `/?dev=1` would still load the app correctly. Consistency: every E2E test now uses the canonical demo URL, matching what a user types into the address bar.
- **Bare URL renders DevInjector.** The user's answer to the clarifying question explicitly named "strip all three gates" — including the `?dev=anything` gate that previously hid DevInjector. The result is a "one-URL demo": anyone visiting `/` sees the full app including the scenario injector. If a future deploy needs to hide the injector from public visitors, a new gate can be added in front of it (the URL-flag pattern is described in `05-ui-ux-spec.md` §14 for that purpose).
- **`SCENARIO_IDS` exported, `V1_/V2_` removed.** Could have kept both constants for backward compat with any external consumers, but there are none (verified via grep). Single source of truth.
- **`isDevMode()` helper deleted entirely.** No remaining caller, so leaving the function around would be dead code. The URL-flag pattern (1-line `URLSearchParams.has('dev')` check) is trivially re-implementable when a future enhancement needs it; no need to retain skeleton code.

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

## Phase 9–11 planning · v4 instruments + Security Agent

- Authored specs for the next arc (no implementation yet): a new `?dev=v4` gate
  (superset of v3; v3/GA frozen), two-sided bid/ask forward points, NDF, and
  forward-forward swaps; plus an independent **Security Agent** (5th agent) that
  reviews the build cold at the end of each phase and files findings under
  `security/`.
- User-directed decisions: phasing Points → NDF → Swaps with the Security Agent
  stood up first; swaps allow forward-forward; **bid/ask forward points apply to
  v3 outright forwards** (not v4-only), while NDF/swaps sit behind a new `?dev=v4`
  gate; findings to `/security/` with fixes as FXSW backlog tickets.
- Consequence of the v3 decision: v3 outright-forward goldens/snapshots are
  re-baselined (the spread is derived from `mid` with no extra RNG draws, so the
  GA spot golden and mid sequence are unchanged).
- Agent-directed: keeping the `?dev=v4` gate itself as Phase 9 scaffolding (first
  consumed by NDF in Phase 10); instruments modelled as a `Deal.instrumentType`
  discriminator with swaps reusing the existing `Deal.legs` seam (no new states).
- Touched: `docs/02` §12–13, `docs/03` §10, `docs/04` §9, `docs/05` §18,
  `docs/10-security-agent-spec.md` (new), `security/CLAUDE.md` + `security/TEMPLATE.md`
  (new), `docs/BACKLOG.md` (Phase 9–11, FXSW-072…087), `CLAUDE.md`.
- Gates: docs/specs only; no code changed.

## FXSW-072 · `?dev=v4` gate scaffolding

- `src/lib/devVersion.ts`: widened `DevVersion` to `'v1' | 'v3' | 'v4'` and added
  `isV4()`. v4 is a superset of v3 — `isV3()` now returns true for both `'v3'` and
  `'v4'`, so every existing v3 call site lights up under `?dev=v4` with no call-site
  changes. First v4 consumer is NDF (Phase 10); nothing v4-gated ships here.
- Decision (agent-directed): make `isV3()` cover v4 rather than thread a new flag
  through the tree, matching the existing single-gate pattern.
- Tests: `devVersion.test.ts` — added v3-not-v4, v4-superset, and no-flag-neither
  cases (8 total).
- Gates: typecheck ✓ · lint ✓ · `test:run` ✓ (464) · build ✓ · `test:e2e` ✓ (10/10).
  GA and `?dev=v3` unchanged.

## Notes

This file is intentionally summarized after the vendor-reference cleanup. Detailed historical references remain recoverable from Git history, but current documentation is kept brand-neutral.
