# 11 — Production-Readiness Specification

This document defines the requirements to harden **FX Sales Workstation** from a
demonstrable prototype into a production-grade, **customer-facing** application. It
is the spec the Phase 12–19 backlog tickets (FXSW-093…118) reference by section.

It deliberately covers only the cross-cutting production concerns that live inside
the **current** codebase — resilience, observability, dev/prod separation, security
follow-through, accessibility, internationalization, test/quality gates, and
operability. It does **not** spec the backend/data work needed to run on real
flow; that is enumerated as a dependency list in §9 and left for separate
specification.

The prototype is already strong on the things that are expensive to retrofit:
TypeScript strict mode, a zero-warning lint gate, build-time CSP + SRI, a clean
XState/Zustand split with terminal-state guards, a centralized pricing-math
module, and a determinism gate (seed-42 golden + GA spot/mid + v3 forward + v4
NDF/swap goldens). Nothing here proposes re-architecting those. The work is the
hardening a prototype legitimately defers.

## 0. Scope, target, and principles

### 0.1 Target

General availability as a **customer-facing** workstation. This elevates two
concerns that an internal-only tool could defer: **internationalization** (§6) and
**full WCAG 2.1 AA accessibility** (§5). Both are first-class here.

### 0.2 Principles

1. **Graceful degradation.** No single component failure may blank the
   application. Every async or external surface has a defined failure state.
2. **Observable by default.** Errors, lifecycle transitions, and the deal funnel
   are observable in production through a single logging/telemetry seam — never
   ad-hoc `console`.
3. **No dev surfaces in production.** Scenario injection, the external-feed key
   entry, and test/replay hooks are excluded from — or provably inert in — the
   production artefact.
4. **Accessible and localizable.** AA accessibility and a message-catalog
   indirection are requirements, not enhancements.
5. **Preserve the contract.** All of the above land without changing canonical
   state names, the `*Sent` acknowledgement contract, the 5-second removal rule,
   the determinism goldens, or brand-neutrality (§10).

### 0.3 Non-goals (here)

Real pricing/deal data, authentication, multi-user, and persistence beyond
`sessionStorage` are out of scope for this spec — see §9.

## 1. Resilience & error handling

The prototype has **no error boundaries and no global error handlers**; a render
throw unmounts the whole app to a blank screen, and state-machine events are
dispatched with no failure path.

- **R1.1 — Error boundaries.** A top-level boundary wraps the application and
  renders a recoverable fallback (reset / reload) wired to the existing reset
  path. A second, narrower boundary wraps the ticket/overlay tree so a ticket
  crash degrades to a closable overlay without taking down the blotters.
- **R1.2 — Global handlers.** `window` `error` and `unhandledrejection` listeners
  route to the logging seam (§2.1). They never silently swallow.
- **R1.3 — Guarded dispatch.** State-machine event dispatch is funnelled through a
  single store-level helper that catches and logs an illegal/rejected transition
  instead of letting it throw into React render. Canonical state names and the
  `*Sent` contract are unchanged.
- **R1.4 — Boundary input validation.** Inputs crossing a trust boundary — the
  suggestion engine entry and the deal-ingestion boundary — are validated (finite
  numerics, positive notional, non-zero mid) so malformed data yields a defined
  safe state, never `NaN`/`Infinity` propagating into the UI. Validation uses a
  schema at the boundary; pure pricing math stays in `lib/pips.ts`.
- **R1.5 — Feed-disconnect UX.** A dropped or stale price feed surfaces a visible
  stale/disconnected indicator and a retry affordance instead of rendering an em
  dash indefinitely. The simulated feed's existing 3s stale flag is the model.

## 2. Observability

The prototype has effectively no observability (one `console.error` total).

- **R2.1 — Logging seam.** A single thin logging module (levels; no PII) replaces
  ad-hoc `console` usage. Lifecycle transitions, feed-status changes, and
  suggestion accept/reject/undo flow through it. It is a no-op in test.
- **R2.2 — Error tracking.** An error-tracking integration, **environment-gated**
  (off in dev/test), is fed by the boundaries (R1.1) and global handlers (R1.2).
  Its origin is reflected in the runtime CSP (§4.2).
- **R2.3 — Product analytics / RUM.** **Consent-gated** event hooks instrument the
  deal funnel (picked-up → quoted → confirmed/declined) and the AI-suggestion
  apply/undo rate. No telemetry fires before consent.

## 3. Dev/prod separation & bundle hygiene

Dev-only surfaces currently ship to users: `DevInjector` renders unconditionally
in `App.tsx`, and test/replay hooks (`__zeroAckDelay`, `__seedFeed`, `?seed=`)
exist at runtime.

- **R3.1 — Dev injector.** The scenario injector is gated out of the production
  build (env flag + lazy import so it tree-shakes). Because it is currently the
  only deal source, its removal is sequenced behind the real ingestion dependency
  (§9) — until then it remains, but behind an explicit flag.
- **R3.2 — Optional/dev panels.** The external-feed key-entry panel and live
  poller are provably absent or inert in the production artefact (consistent with
  the simulation-only production posture).
- **R3.3 — Test/replay hooks.** `__zeroAckDelay`, `__seedFeed`, and `?seed=` are
  stripped or inert in production.
- **R3.4 — Bundle budget.** CI enforces a bundle-size budget so dev code or heavy
  dependencies leaking into the artefact fail the build.

## 4. Security follow-through & runtime hardening

Build-time posture is already strong (CSP `<meta>` + SRI, Bearer-header key, opt-in
range-validated build fetch, `pnpm audit` at 0). The remaining work is one deferred
finding plus operationalizing for a real deployment.

- **R4.1 — Structural NDF inertness.** Close the deferred FXSW-089 F-2 item: the
  NDF spot-margin must be inert **structurally**, not only at the render boundary —
  one shared helper keyed off `instrumentOf(deal)`, so no keyboard/AI-Apply path
  can reintroduce a spot markup through raw `marginPair` state.
- **R4.2 — Runtime response headers.** CSP/SRI are build-time `<meta>` only. The
  production deployment sets real response headers (CSP, HSTS,
  `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`) at the hosting/
  CDN layer, documented in a deploy runbook. The runtime CSP `connect-src` lists
  exactly the telemetry/error-tracking origins (§2) — no wildcards.
- **R4.3 — CI security gates.** CI runs a production-dependency audit
  (`pnpm audit --prod` or equivalent) as a gate, secret scanning, and the existing
  brand-neutral `dist/` grep promoted to a hard gate.

## 5. Accessibility (WCAG 2.1 AA)

Baseline ARIA is good (roles, `aria-pressed`, `aria-live`, separator semantics).
The gaps are depth items required for an AA, customer-facing bar.

- **R5.1 — Modal focus management.** The ticket and historic-detail overlays trap
  focus while open, move focus in on open, and restore focus to the invoking
  control on close. Escape-to-close is preserved.
- **R5.2 — Labels & live regions.** Blotter cell content (amounts, status pills,
  reasons) and row controls carry screen-reader labels; price flashes and new-deal
  arrival are announced via a polite live region (today they are visual + audio
  only).
- **R5.3 — Keyboard & focus order.** Tab order through blotter rows and pricing
  controls is logical; roving focus where appropriate; the global `+`/`-` margin
  keys do not conflict with assistive technology.
- **R5.4 — Automated gate.** An automated accessibility check runs in the E2E
  suite and gates CI at zero serious/critical violations, complemented by a
  documented manual keyboard + screen-reader walkthrough of the
  blotter → ticket → quote path.

## 6. Internationalization & configuration

No i18n infrastructure exists; user-facing strings are hardcoded. Several
behavioural constants are inline magic numbers.

- **R6.1 — i18n infrastructure.** A message-catalog indirection (industry-standard
  React i18n library) replaces hardcoded user-visible strings. The product name
  stays `FX Sales Workstation` and all catalogs remain brand-neutral (§10).
- **R6.2 — Locale-aware formatting.** Numbers, dates, and value-date labels format
  through the existing `lib/format.ts` / `lib/time.ts` seam against the active
  locale. Pricing precision rules are unchanged.
- **R6.3 — Externalized configuration.** Suggestion thresholds (the size/volume
  cutoffs in `services/suggestion/engine.ts`) and timing constants (toast dismiss,
  recompute debounce, vol-shift threshold, removal delay) move into a single config
  surface, extending the existing `state/machines/timings.ts` pattern. The 5s
  removal value and determinism-affecting timings keep their current defaults.

## 7. Testing & quality gates

Scenario E2E and unit coverage of machines/lib/services are strong; visibility and
edge-case depth are the gaps.

- **R7.1 — Coverage reporting + thresholds.** A coverage provider is configured and
  CI enforces a floor on the high-value layers (`lib/`, `services/`, `state/`).
- **R7.2 — Edge-case & error-path suites.** Tests cover the security-sensitive
  invariants (NDF spot-margin zeroing across all render paths, one-sided swap
  suppression, swap-leg coercion rejected-vs-applied, pip rounding at boundaries)
  and the new error paths (boundary fallback, feed-disconnect UI, malformed-deal
  validation).
- **R7.3 — Cross-browser E2E.** Playwright runs Chromium plus Firefox and WebKit
  projects, appropriate to a customer-facing target.

## 8. Performance, scalability & operations

- **R8.1 — Historic store bound.** The historic deal array (render-capped at 100
  but never pruned) gains a max-size or TTL bound in `dealsStore`, so a long-lived
  session cannot grow it without limit.
- **R8.2 — Feed render performance.** Tick fan-out re-renders are bounded
  (memoization / row virtualization as needed); the external poller's sequential
  per-pair fetches are parallelized with per-request timeouts when it becomes a
  real dependency.
- **R8.3 — Deployment & ops.** Beyond the current Pages target: a staging
  environment, a release/rollback process, response-header configuration (R4.2),
  and an incident/runbook document.

## 9. Integration dependencies (out of scope — list only)

These are real backend/data items, intentionally **not** specified here. They are
prerequisites for some of the above (e.g. R3.1 dev-injector removal) and are listed
so the sequencing is explicit:

1. Real pricing / market-data feed replacing the simulated `pricingFeed`.
2. Real deal / RFS ingestion replacing `dealFeed` + the scenario injector.
3. Authentication, session management, RBAC/permissions, multi-user state.
4. Persistence beyond `sessionStorage` (deal history, audit trail, preferences).
5. Server-side trade execution / order routing and confirmation.
6. Real client/CRM data behind the suggestion engine's static `clientProfiles`.
7. A real (non-deterministic) margin model, if the deterministic engine is
   replaced.

## 10. Cross-cutting constraints

Every Phase 12–19 ticket inherits these — they are the standing `Done when` gates:

- **Brand-neutrality.** No vendor names in committed source, docs, package
  metadata, comments, UI strings, or build output. Library choices are named
  generically or as industry-standard, consistent with the ADRs.
- **Determinism goldens.** Seed-42 golden, GA spot + mid sequence, v3 forward
  goldens, and v4 NDF/swap goldens stay byte-stable for unaffected instruments.
- **Canonical contract.** State names, `data-*` test attributes, the `*Sent`
  acknowledgement states, and the 5-second removal rule are unchanged.
- **Simulation default.** The simulated feed remains the default and the only
  test/E2E path; `dist/` contains no source maps.
