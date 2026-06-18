# Production-Readiness Backlog (future enhancement)

A standalone hardening track that turns the prototype into a production-grade,
**customer-facing** application. It addresses the cross-cutting concerns deferred
during the prototype — resilience, observability, dev/prod separation, security
follow-through, accessibility, i18n, coverage, and operability — **without**
re-architecting the core or connecting real data. Real-data feeds and
auth/multi-user are dependencies only, not scoped here.

Spec: `production-readiness-spec.md` (this folder); sections referenced per ticket.
Every ticket inherits the standing cross-cutting gates (`prod-readiness-spec §10`):
determinism goldens byte-stable, canonical state names + `data-*` unchanged,
`*Sent` + 5s removal preserved, `dist/` brand-neutral with no source maps,
simulated feed the only test/E2E path. As with all phases since Phase 9, each
phase closes with an independent **Security Agent** review under `/security/`
plus `dev-log.md` entries and a `docs/phase-summaries/` summary (Critical rule
#14) — owned by the Security Agent, not enumerated as a build ticket.

> **Numbering is a placeholder.** Phase labels (`FE-Phase-A …`) and ticket labels
> (`FE-A-1 …`) are stand-ins, **not** real `FXSW-NNN` / `Phase-N` numbers. Actual
> ticket and phase numbers are assigned from the then-current high-water mark
> **when implementation of each phase begins**, so that any side-fix work done in
> the meantime can consume numbers freely without colliding with this track.
> References like `FXSW-089` / `FXSW-080` below point at **already-completed**
> historical tickets and are real.

The track maps to eight phases:

| Phase | Theme |
|---|---|
| FE-Phase-A | Resilience & error handling |
| FE-Phase-B | Observability |
| FE-Phase-C | Dev/prod separation & bundle hygiene |
| FE-Phase-D | Security follow-through & runtime hardening |
| FE-Phase-E | Accessibility (WCAG 2.1 AA) |
| FE-Phase-F | Internationalization & configuration |
| FE-Phase-G | Testing & quality gates |
| FE-Phase-H | Performance, scalability & operations |

### FE-Phase-A — Resilience & error handling

The largest prototype→prod gap: no error boundaries, no global error handlers, and
unguarded state-machine dispatch. Specs: `prod-readiness-spec §1`.

#### FE-A-1 — Error boundaries + recoverable fallback

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §1` (R1.1)

**AC:**
- New `src/components/ErrorBoundary.tsx` (class component; `getDerivedStateFromError`
  + `componentDidCatch`) renders a recoverable fallback (Reset / Reload) wired to
  the existing dev-injector reset path; the caught error is forwarded to the
  logging seam (FE-B-1) when present, else `console.error`.
- A top-level boundary wraps `App` in `src/main.tsx`; a second, narrower boundary
  wraps the ticket/overlay tree (`TicketPanel` + `HistoricDetailPanel`) in
  `App.tsx` so a ticket crash leaves the blotters live and the overlay closable.
- Fallback copy goes through no hardcoded vendor strings; `data-testid="error-boundary-fallback"`.

**TDD tests (write first):**
- A child that throws on render → app-level fallback renders; Reset clears it.
- A throwing ticket → overlay-level fallback renders; blotters still mounted.
- `onError` callback invoked with the error + component stack.

**Done when:** all gates green; no console errors in the happy path; goldens +
`data-*` unchanged.

#### FE-A-2 — Global error / unhandledrejection handlers

**Effort:** S · **TDD:** Alongside · **Depends on:** FE-A-1 · **Docs:** `prod-readiness-spec §1` (R1.2)

**AC:**
- `src/main.tsx` registers `window.addEventListener('error', …)` and
  `'unhandledrejection'` handlers that route to the logging seam (FE-B-1 once
  present; `console.error` until then) and never silently swallow.
- Handlers are idempotent (guarded against double-registration under StrictMode
  double-invoke) and are no-ops in the test environment.

**TDD tests (write first):**
- Dispatched `error` / `unhandledrejection` events reach the handler with the
  expected payload shape.
- Double registration under StrictMode adds a single effective listener.

**Done when:** all gates green.

#### FE-A-3 — Guarded state-machine dispatch

**Effort:** M · **TDD:** Strict · **Depends on:** — · **Docs:** `prod-readiness-spec §1` (R1.3)

**AC:**
- All deal-event dispatch funnels through one helper in `src/state/stores/dealsStore.ts`
  that wraps `forwardEvent`; a rejected/illegal transition is caught + logged and
  swallowed (no throw into React render).
- Caller sites (`TicketFooter`, `SuggestionPanel`, reason actions) route through the
  helper; no behavioural change for legal transitions.
- Canonical state names, the `*Sent` contract, and the 5s timing are untouched.

**TDD tests (write first):**
- A legal event still transitions exactly as today (regression on a representative
  scenario).
- An illegal event is logged + swallowed; store state unchanged; no exception
  surfaces.

**Done when:** all gates green; seed-42 golden + `data-*` byte-stable.

#### FE-A-4 — Boundary input validation

**Effort:** M · **TDD:** Strict · **Depends on:** — · **Docs:** `prod-readiness-spec §1` (R1.4)

**AC:**
- A schema validates inputs at the suggestion-engine entry (`suggestMargin`) and at
  the deal-ingestion boundary (`dealsBootstrap`/`addDeal`): finite numerics,
  positive notional, non-zero mid. Invalid input yields a defined safe state
  (rejected/neutral suggestion; ingestion no-op + log), never `NaN`/`Infinity` in
  the UI.
- `approxUsdNotional` gains an explicit zero-mid guard.
- Pure pricing math stays in `lib/pips.ts`; validation lives at the boundary only.

**TDD tests (write first):**
- Engine: `NaN`/`Infinity`/zero-mid/negative-notional inputs → safe state, no
  `NaN` in output.
- Ingestion: a malformed deal is rejected + logged, store unchanged.
- Valid inputs unchanged (regression against existing suggestion goldens).

**Done when:** all gates green; suggestion goldens byte-stable for valid inputs.

#### FE-A-5 — Feed-disconnect / stale indicator + retry

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §1` (R1.5)

**AC:**
- Rate-displaying components (`RateCell`, pricing cells) surface a visible
  stale/disconnected indicator (`data-feed-status`) when the feed stalls, reusing
  the existing 3s stale flag, instead of an indefinite em dash.
- A retry affordance is shown for the live (v3) poller path; the simulated feed
  path shows the stale state only (no real reconnect needed).
- No new RNG draws; the GA spot/mid sequence is unchanged.

**TDD tests (write first):**
- Stale flag → indicator rendered with the expected `data-feed-status`.
- Retry control invokes the poller restart on the live path; absent on the
  simulated path.

**Done when:** all gates green; spot/mid golden byte-stable.

### FE-Phase-B — Observability

Replace ad-hoc `console` with a single seam, add env-gated error tracking, and
add consent-gated funnel analytics. Specs: `prod-readiness-spec §2`.

#### FE-B-1 — Structured logging seam

**Effort:** S · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §2` (R2.1)

**AC:**
- New `src/lib/log.ts` exposes levelled logging (`debug/info/warn/error`) with no
  PII; a no-op sink in test; pluggable sink for FE-B-2.
- The lone `console.error` in `dealsStore.ts` and the handlers from FE-A-2 route
  through it; lifecycle transitions and feed-status changes emit `info`.

**TDD tests (write first):**
- Level filtering; test-env sink is a no-op; sink injection captures records.

**Done when:** all gates green; zero direct `console.*` in `src/` outside `log.ts`.

#### FE-B-2 — Error-tracking integration (env-gated)

**Effort:** M · **TDD:** Alongside · **Depends on:** FE-A-1, FE-B-1 · **Docs:** `prod-readiness-spec §2` (R2.2)

**AC:**
- An industry-standard error-tracking client is initialised in `main.tsx` behind an
  environment flag (off in dev/test); it is the `log.ts` error sink and receives
  boundary (FE-A-1) + global-handler (FE-A-2) errors.
- The provider origin is added to the runtime CSP `connect-src` (FE-D-2) — no
  wildcard. No vendor name appears in user-visible strings.

**TDD tests (write first):**
- Disabled in test/dev → client never initialised.
- Enabled (mocked) → boundary error forwarded once.

**Done when:** all gates green; `dist/` brand-neutral in user-visible strings.

#### FE-B-3 — Consent-gated product analytics / RUM

**Effort:** M · **TDD:** Alongside · **Depends on:** FE-B-1 · **Docs:** `prod-readiness-spec §2` (R2.3)

**AC:**
- Funnel event hooks (deal picked-up → quoted → confirmed/declined; AI-suggestion
  apply/undo) emit through `log.ts`/an analytics sink **only after consent**; no
  event fires pre-consent.
- A minimal consent gate persists its decision in `sessionStorage` (consistent with
  the existing settings pattern); default is no telemetry.

**TDD tests (write first):**
- Pre-consent → no events emitted.
- Post-consent → the funnel transitions emit the expected event names.

**Done when:** all gates green.

### FE-Phase-C — Dev/prod separation & bundle hygiene

Keep dev surfaces and test hooks out of the production artefact; add a bundle
budget. Specs: `prod-readiness-spec §3`.

#### FE-C-1 — Gate + lazy-load DevInjector out of prod

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §3` (R3.1)

**AC:**
- `DevInjector` (and its slot in `App.tsx`) renders only behind an explicit
  env/feature flag and is lazy-imported so it tree-shakes from the production
  bundle when off.
- **Sequencing note:** because the injector is currently the only deal source, the
  flag defaults on until real ingestion (dep §9 item 2) lands; this ticket
  delivers the gate + lazy boundary, not the removal.

**TDD tests (write first):**
- Flag off → injector not rendered, slot empty.
- Flag on → injector renders with all existing `data-testid`s (regression).

**Done when:** all gates green; production build with the flag off contains no
injector chunk.

#### FE-C-2 — External-feed panel + test hooks inert in prod

**Effort:** S · **TDD:** Alongside · **Depends on:** FE-C-1 · **Docs:** `prod-readiness-spec §3` (R3.2, R3.3)

**AC:**
- `ExternalFeedPanel` + the live poller are provably absent/inert in the production
  build (already dev-gated; confirm tree-shaking or guard).
- `__zeroAckDelay`, `__seedFeed`, and `?seed=` are stripped or inert in production
  (dev/test only).

**TDD tests (write first):**
- Production-mode guard: hooks are no-ops; panel does not mount.

**Done when:** all gates green; brand-neutral `dist/` grep clean (no provider host
in user-visible strings).

#### FE-C-3 — CI bundle-size budget gate

**Effort:** S · **TDD:** n/a · **Depends on:** FE-C-1 · **Docs:** `prod-readiness-spec §3` (R3.4)

**AC:**
- CI fails the build if the production bundle exceeds a documented budget; the
  budget is recorded in `prod-readiness-spec` / CI config.

**Done when:** CI gate active; current build passes within budget.

### FE-Phase-D — Security follow-through & runtime hardening

Close the one deferred finding and operationalize for a real deployment. Specs:
`prod-readiness-spec §4`.

#### FE-D-1 — Structural NDF spot-margin inertness

**Effort:** M · **TDD:** Strict · **Depends on:** — · **Docs:** `prod-readiness-spec §4` (R4.1) · **Source:** `security/FXSW-081-review.md` F-2 (deferred from FXSW-089)

**AC:**
- The NDF spot-margin is inert **structurally**, not only at render: one shared
  helper keyed off `instrumentOf(deal)` (extend `lib/pips.ts` `spotMarginFor`) is
  the single path, so the raw `marginPair` state cannot reintroduce a spot markup
  via the keyboard or AI-Apply paths.
- F-1/F-3/F-4 were already fixed in FXSW-080; this is the residual defense-in-depth.

**TDD tests (write first):**
- For NDF: any non-zero spot margin (set via every entry path) produces zero spot
  contribution; points margin still applies.
- Non-NDF instruments unchanged (regression).

**Done when:** all gates green; v4 NDF golden byte-stable.

#### FE-D-2 — Runtime response headers + deploy hardening runbook

**Effort:** M · **TDD:** n/a · **Depends on:** — · **Docs:** `prod-readiness-spec §4` (R4.2)

**AC:**
- The production deployment sets real response headers (CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) at the hosting/CDN
  layer; the runtime CSP `connect-src` lists exactly the telemetry/error-tracking
  origins (FE-B-2) with no wildcard.
- A deploy hardening runbook is added under `docs/` documenting header config and
  the build-time CSP/SRI relationship.

**Done when:** runbook present; headers verified on a deployed staging URL; no
vendor names in user-visible output.

#### FE-D-3 — CI security gates

**Effort:** S · **TDD:** n/a · **Depends on:** — · **Docs:** `prod-readiness-spec §4` (R4.3)

**AC:**
- CI runs `pnpm audit --prod` (or equivalent) as a gate, a secret-scanning step,
  and promotes the brand-neutral `dist/` grep to a hard failing gate.

**Done when:** gates active; current repo passes all three.

### FE-Phase-E — Accessibility (WCAG 2.1 AA)

Depth items for a customer-facing AA bar. Specs: `prod-readiness-spec §5`.

#### FE-E-1 — Modal focus management

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §5` (R5.1)

**AC:**
- `TicketPanel` and `HistoricDetailPanel` trap focus while open, move focus to a
  sensible first element on open, and restore focus to the invoking control on
  close; Escape-to-close is preserved. Uses a small focus-trap utility (industry-
  standard library or a local hook).

**TDD tests (write first):**
- Tab cycles within the open panel; focus does not escape.
- On close, focus returns to the row/control that opened it.

**Done when:** all gates green; `data-*` unchanged.

#### FE-E-2 — Blotter labels + live-region announcements

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §5` (R5.2)

**AC:**
- Blotter cell content (amounts, status pills, reasons) and row controls carry
  screen-reader labels; new-deal arrival and price flashes announce via a polite
  live region without disrupting the existing visual/audio cues.

**TDD tests (write first):**
- Row exposes an accessible name covering client/pair/side/amount/status.
- New-deal arrival writes a polite live-region message.

**Done when:** all gates green.

#### FE-E-3 — Keyboard/tab-order + automated a11y gate

**Effort:** M · **TDD:** Alongside · **Depends on:** FE-E-1, FE-E-2 · **Docs:** `prod-readiness-spec §5` (R5.3, R5.4)

**AC:**
- Logical tab order through blotter rows + pricing controls; the global `+`/`-`
  margin keys do not conflict with assistive tech (existing input-focus guard
  retained).
- An automated accessibility check (`@axe-core/playwright` or equivalent) runs in
  the E2E suite and gates CI at zero serious/critical violations; a manual
  keyboard + screen-reader walkthrough of blotter → ticket → quote is documented.

**TDD tests (write first):**
- `axe` pass on the main view + an open ticket = 0 serious/critical.

**Done when:** all gates green incl. the a11y gate.

### FE-Phase-F — Internationalization & configuration

Localizable strings + externalized constants for a customer-facing build. Specs:
`prod-readiness-spec §6`.

#### FE-F-1 — i18n infrastructure + catalog extraction

**Effort:** L · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §6` (R6.1)

**AC:**
- An industry-standard React i18n library provides a message-catalog indirection;
  user-visible strings (status labels, toasts, panel headers, button text) are
  extracted to a default-locale catalog. Product name stays `FX Sales Workstation`;
  catalogs are brand-neutral.

**TDD tests (write first):**
- A representative component renders from the catalog; a missing key falls back
  safely.
- Catalog contains no vendor strings (denylist tripwire test).

**Done when:** all gates green; `dist/` brand-neutral.

#### FE-F-2 — Locale-aware formatting

**Effort:** M · **TDD:** Alongside · **Depends on:** FE-F-1 · **Docs:** `prod-readiness-spec §6` (R6.2)

**AC:**
- Numbers, dates, and value-date labels format through `lib/format.ts` /
  `lib/time.ts` against the active locale; pricing precision rules unchanged.

**TDD tests (write first):**
- Formatting differs correctly across two locales; pip/rate precision unchanged.

**Done when:** all gates green; rate/pip goldens byte-stable.

#### FE-F-3 — Externalize thresholds + timings into config

**Effort:** S · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §6` (R6.3)

**AC:**
- Suggestion size/volume cutoffs (`services/suggestion/engine.ts`) and timing
  constants (toast dismiss, recompute debounce, vol-shift threshold, removal delay)
  move into a single config surface extending `state/machines/timings.ts`. Default
  values — including the 5s removal and determinism-affecting timings — are
  unchanged.

**TDD tests (write first):**
- Engine consumes config values; defaults reproduce current suggestion goldens.

**Done when:** all gates green; suggestion + determinism goldens byte-stable.

### FE-Phase-G — Testing & quality gates

Coverage visibility, edge-case/error-path depth, cross-browser. Specs: `prod-readiness-spec §7`.

#### FE-G-1 — Coverage reporting + thresholds

**Effort:** S · **TDD:** n/a · **Depends on:** — · **Docs:** `prod-readiness-spec §7` (R7.1)

**AC:**
- A coverage provider (`@vitest/coverage-v8`) is configured; CI enforces a floor on
  `lib/`, `services/`, and `state/`.

**Done when:** coverage gate active; current suite meets the floor.

#### FE-G-2 — Edge-case + error-path suites

**Effort:** M · **TDD:** Strict · **Depends on:** FE-A-1, FE-A-4, FE-D-1 · **Docs:** `prod-readiness-spec §7` (R7.2)

**AC:**
- Tests cover: NDF spot-margin zeroing across all render paths; one-sided swap
  suppression; swap-leg coercion (rejected vs applied tenor); pip rounding at
  boundaries; and the new error paths (boundary fallback, feed-disconnect UI,
  malformed-deal validation).

**Done when:** all gates green; new tests fail against the pre-fix behaviour.

#### FE-G-3 — Cross-browser E2E

**Effort:** M · **TDD:** Acceptance · **Depends on:** — · **Docs:** `prod-readiness-spec §7` (R7.3)

**AC:**
- `playwright.config.ts` adds Firefox + WebKit projects alongside Chromium; the
  existing scenarios pass on all three (or documented per-engine skips with
  rationale).

**Done when:** E2E green across the three engines in CI.

### FE-Phase-H — Performance, scalability & operations

Bound growth, smooth fan-out, and make it deployable/operable. Specs: `prod-readiness-spec §8`.

#### FE-H-1 — Historic-store bound

**Effort:** S · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §8` (R8.1)

**AC:**
- `dealsStore` historic array gains a documented max-size or TTL bound so a
  long-lived session cannot grow it unbounded; the render cap (100) and archival
  semantics are unchanged.

**TDD tests (write first):**
- Beyond the bound, oldest entries are pruned; ordering + archival unchanged.

**Done when:** all gates green.

#### FE-H-2 — Feed render perf + poller parallelization

**Effort:** M · **TDD:** Alongside · **Depends on:** — · **Docs:** `prod-readiness-spec §8` (R8.2)

**AC:**
- Tick fan-out re-renders are bounded (memoization / row virtualization as needed)
  with no behavioural change; the external poller's per-pair fetches are
  parallelized with per-request timeouts (live path only).

**TDD tests (write first):**
- Poller issues concurrent requests with independent timeouts; one slow pair does
  not stall the others.

**Done when:** all gates green; spot/mid golden byte-stable.

#### FE-H-3 — Deployment & ops

**Effort:** M · **TDD:** n/a · **Depends on:** FE-D-2 · **Docs:** `prod-readiness-spec §8` (R8.3)

**AC:**
- A staging environment, a release/rollback process, and an incident/runbook
  document are added under `docs/`/CI, building on the response-header config
  (FE-D-2).

**Done when:** staging deploy + rollback exercised; runbook present.
