# Security review — Phase 11 — Swaps (forward-forward) (FXSW-087)

## Review metadata

- **Phase:** Phase 11 — FX swaps, two-leg forward-forward (FXSW-082 data model + injection, FXSW-083 swap-points feed, FXSW-084 swap pricing math, FXSW-085 swap pricing UI, FXSW-086 swap blotter + historic detail). The phase also follows the FXSW-088/089 security-remediation commit that closed most carried-over Phase 9/10 technical findings.
- **Commit reviewed:** `69adcb3821379dd8f5ad09df9fcfeb110375ea6d`
- **Branch:** `claude/pricing-trades-phase-plan-h70vy7`
- **Date:** 2026-06-17
- **Tooling run:** `pnpm audit`; inspected the existing `dist/` (`index.html` + `assets/index-*.js`: CSP, SRI, source maps, vendor literals, `apiKey=`/`Bearer`); static read of the changed `/src` files, `package.json`, `pnpm-lock.yaml` overrides, the build-time mids script, and the runtime poller; `git log` of the Phase 11 tickets. Read-only only; no live exploits, no third-party endpoint scans.

## Summary

Phase 11 adds two-leg forward-forward swaps end to end: a `tenorRank`/`buildSwapLegs` leg model, a `swapPointsFeed` that composes the existing forward-points feed (net = far − near per side, no new RNG draws), instrument-aware net-points pricing math in `lib/pips.ts`, a two-leg `SwapPanel` with a markup-mode toggle and a read-only historic `SwapLegDetail`, and an `AppliedMargin` swap variant carried through quote-context capture. Reviewed cold, the **functional/price-integrity posture of the swap work is good**: the one-sided lock is enforced **in the pricing math** (`gateMarginToSide` in `lib/pips.ts`), not just in the UI — directly addressing the single-point-enforcement weakness flagged in earlier phases — and margins are floored at zero, net-points rounding is centralised, and the captured execution margin reconciles with the rendered "net used for execution". The notable functional gaps are softer: the off-side **raw** net is still rendered (only dimmed) on a one-sided swap, and `buildSwapLegs` **silently coerces** an out-of-order or missing far leg rather than surfacing the correction, which can mislead an operator about what tenor pair is actually being priced. On the technical track this phase is a clear improvement: the FXSW-088/089 remediation **landed** — a restrictive CSP now ships, the external-feed API key moved to an `Authorization: Bearer` header, the build-time live fetch is opt-in and range-validated, and the toolchain was bumped (audit down from 24 advisories to **5: 2 high, 3 moderate**, all dev-tooling). The residual technical items are the two remaining **high** dev-tooling advisories (`vite`/`esbuild` still on the 5.x line whose fixes are only on 6.x) and an internal inconsistency where the new CSP `connect-src 'self'` would block the opt-in live poller's call to the external host. **7 findings: 0 Critical, 1 High, 2 Medium, 2 Low, 2 Info.**

| ID | Track | Severity | Title |
|----|-------|----------|-------|
| F-1 | Functional | Medium | `buildSwapLegs` silently coerces a missing / out-of-order (far ≤ near) far leg instead of surfacing it |
| F-2 | Functional | Low | One-sided swap still renders the off-side **raw** net points (dimmed, not suppressed) |
| F-3 | Functional | Low | Swap markup-mode reset on deal switch is the only enforcement that a re-opened deal starts un-marked |
| F-4 | Functional | Info | Swap pricing math, one-sided gating and capture reconciliation are sound (positive finding) |
| T-1 | Technical | High | Two high dev-tooling advisories remain: `vite`/`esbuild` pinned on the 5.x line (fixes only on 6.x) |
| T-2 | Technical | Medium | New CSP `connect-src 'self'` omits the external provider origin — the opt-in live poller is blocked by the shipped policy |
| T-3 | Technical | Info | External provider endpoint host literal present in `dist/` (documented v3 exception); CSP/SRI/secret-handling remediation otherwise landed |

## Findings

### F-1 — `buildSwapLegs` silently coerces a missing / out-of-order (far ≤ near) far leg instead of surfacing it

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/types/deal.ts:57-66` — when `far` is absent or `tenorRank(far) <= tenorRank(near)`, `farRank` is set to `nearRank + 1` (the shortest valid far); and when near is the last tenor, `nearRank` is silently stepped back one (`:59`). The coercion is the only handling — `buildDeal` (`src/services/scenarios/player.ts:95-104`) calls it and stores the coerced legs with no flag, no warning, and no record of the requested-vs-applied tenors. The injector offers the **full ladder** for the far selector with the same silent coercion (`src/features/dev-injector/DevInjector.tsx:156-173`, comment at `:156-157`). `SwapPanel`/`SwapLegDetail` then read `deal.legs` and price/render whatever was coerced (`SwapPanel.tsx:91-94`, `SwapLegDetail.tsx:21-24`).
- **Description:** A forward-forward swap's economics are entirely defined by *which two tenors* form the near/far pair. If an operator (or an upstream caller) requests, e.g., near = 3M / far = 1M, the system does not reject or warn — it quietly prices near = 3M / far = 6M (the "shortest valid far"), or near = 9M when 1Y was the requested near. The client is then quoted a net differential for a tenor pair the desk did not ask for, and nothing in the deal record preserves the original intent. Reviewed cold this is a "priced a different instrument than requested, silently" hazard: the safest behaviour for a mispriced/inverted request is to refuse it, not to invent a plausible one. Severity is Medium rather than High because in the current build the only entry point is the dev injector (a controlled surface) and `Deal.tenor` is kept coherent with the near leg, so single-leg consumers are not corrupted — but the coercion is in the shared data-model helper, so any future non-injector caller inherits the silent-fix behaviour.
- **Suggested resolution:** Make the invalid case explicit rather than self-correcting. Preferred: reject a far ≤ near request at the boundary (return an error / refuse the injection) so the operator must choose a valid far. If a default must be produced for ergonomics, record both the requested and the applied far on the deal (or emit a visible "far adjusted to X" note in `SwapPanel`/`SwapLegDetail`) so the coercion is auditable. Must not change the legs produced for already-valid requests (keeps the swap goldens stable).

### F-2 — One-sided swap still renders the off-side **raw** net points (dimmed, not suppressed)

- **Track:** Functional
- **Severity:** Low
- **Evidence:** `src/features/ticket/pricing/SwapPanel.tsx:110` computes `clientNet = clientSwapNetPoints(swap.net, effMargin)` for **both** sides; the off-side margin is correctly zeroed by `gateMarginToSide` (`lib/pips.ts:151-154`), so the off-side client net equals the **raw, un-marked** net rather than being blanked. The lock dims it via `className={clsx(bidLocked && 'opacity-40')}` / `askLocked && 'opacity-40'` (`SwapPanel.tsx:242,251`) but the value, P/L (`swap-pnl-bid/ask`) and the `client-net-bid`/`client-net-ask` test nodes still carry a real number on the non-quotable side.
- **Description:** For a one-sided request (e.g. ASK only, `quoteSide === 'BID'` locks the ask) the panel shows a populated, un-marked bid net that is not a price the desk can stream. It is visually de-emphasised and the off-side earns zero P/L (margin gated to zero, so this is *not* a mispricing of the quotable side), but a number that reads like a client price on a side that cannot be quoted is a readability/again-cold-review hazard — an operator could read it as a live two-way. Low because the quotable side is correct and the off-side margin/P/L is genuinely zero.
- **Suggested resolution:** On a locked side, render a dash / "—" (or suppress the client-net and P/L values) instead of the raw net, matching the intent of the one-sided lock. Must not alter the quotable-side values or the `data-testid` contract for the active side.

### F-3 — Swap markup-mode + leg margins reset on deal switch is the only thing that un-marks a re-opened deal

- **Track:** Functional
- **Severity:** Low
- **Evidence:** `src/features/ticket/pricing/SwapPanel.tsx:84-89` resets `mode`/`nearMargin`/`farMargin`/`totalMargin` to defaults inside a `useEffect` keyed on `deal.dealId`; `TicketPanel.tsx:100` separately clears `swapPricing` on open. The captured execution margin is taken from the live `swapPricing` state at the `QuoteSent` transition (`useQuoteContextCapture.ts:35-49`), and the "Net used for execution" detail row recomputes from that captured net (`SwapLegDetail.tsx:26`).
- **Description:** Correctness of the swap markup audit depends on these resets firing before a different deal's margins can leak into a new deal's capture. The reset is keyed on `deal.dealId` (component) and `openDealId` (TicketPanel), which is the right key, so no concrete cross-deal contamination was found — this is recorded as a defensive Low so the dependency is explicit: if the `SwapPanel` instance were ever reused across deals without a key change, a previously entered margin could be captured against the wrong deal. The capture hook's `recorded` guard (`useQuoteContextCapture.ts:25,31-35`) correctly re-arms only on `PickedUp`, which is sound for the swap path too.
- **Suggested resolution:** Keep the reset behaviour; add a swap-specific assertion to the e2e (`tests/e2e/v4-swap.spec.ts`) that injects two swaps in sequence, marks up the first, and asserts the second opens with zero leg/net margin and PER_COMPONENT mode — so the reset invariant is regression-guarded rather than relied on implicitly.

### F-4 — Swap pricing math, one-sided gating and capture reconciliation are sound (positive finding)

- **Track:** Functional
- **Severity:** Info
- **Evidence:** Net differential is `far − near` per side with shared `round1` rounding (`src/services/feed/swapPoints.ts:32-37`); the feed adds no RNG draws so the seed-42 stream is untouched (`swapPoints.ts:5-11`). `clientSwapNetPoints` widens the dealer side correctly (bid − margin, ask + margin; `lib/pips.ts:170-176`). The one-sided lock is enforced **in the math** via `gateMarginToSide` inside `effectiveSwapMargin` (`lib/pips.ts:151-166`), not only in the UI lock flags — closing the single-point-enforcement gap raised in prior phases. Margins are floored non-negative at every stepper (`Math.max(0, Math.floor(n))`, `SwapPanel.tsx:209,222`, `SwapLegBlock.tsx:93,104`). The captured `appliedMargin` is the **effective gated** net (`useQuoteContextCapture.ts:38-42` via `TicketPanel.tsx:152-156`), and the historic detail recomputes the executed net from that same value (`SwapLegDetail.tsx:26`), so the audit record reconciles with the price that was sent. Auto-priced (ESP) swaps render `SwapPanel` `readOnly` with zero margins (`TicketPanel.tsx:248-255`) and never fire PickUp.
- **Description:** No sign error, no rounding asymmetry, no leg mix-up, and no lock-bypass was found in the swap pricing path. The net is consistently built far − near at the single feed boundary, and the NEAR/FAR ordering flows from `legs[0]`/`legs[1]` consistently across panel, detail and value-date label (`SwapPanel.tsx:92-93`, `SwapLegDetail.tsx:22-23`, `lib/time.ts:77-82`). Recorded as Info so the positive result is on the record; the residual functional risk is concentrated in F-1 (leg coercion) and F-2 (off-side display), not in the arithmetic.
- **Suggested resolution:** None required for the math. Keep the gating in `lib/pips.ts` as the canonical enforcement point and route any future swap consumer through `effectiveSwapMargin` rather than re-implementing the side gate.

### T-1 — Two high dev-tooling advisories remain: `vite`/`esbuild` pinned on the 5.x line (fixes only on 6.x)

- **Track:** Technical
- **Severity:** High
- **Evidence:** `pnpm audit` summary: **5 vulnerabilities — 3 moderate | 2 high**. The two highs are `esbuild` "Missing binary integrity verification … RCE via NPM_CONFIG_REGISTRY" (vulnerable `>=0.17.0 <0.28.1`, patched `>=0.28.1`) and `vite` "`server.fs.deny` bypass on Windows alternate paths". Installed `vite@5.4.21` (`package.json` devDependencies), which still matches the `vite` advisories whose patched lines are `>=6.4.2` / `>=6.4.3`, and pulls a vulnerable transitive `esbuild` (`.>vite>esbuild`). The three moderates are also `vite`/`esbuild`/`launch-editor` dev-server issues.
- **Description:** These are dev-server / build-time / bundler issues, not flaws in the shipped static bundle, so end-user exposure is limited; but they affect every developer and CI machine (the esbuild RCE requires a malicious registry env, the vite `fs.deny` bypass affects the dev server). This is a substantial improvement over Phase 10 (24 → 5 advisories, criticals cleared), but the remaining two highs persist because the `vite` major line was held at 5.x while the fixes are on 6.x. State assumption: severity is reported at the advisory's rating; if the team accepts that the dev server is never exposed to untrusted input, the *practical* risk is lower — but per the operating prompt a documented intention does not lower the finding.
- **Suggested resolution:** Move `vite` to a patched `>=6.4.3` line (which also clears the matched `esbuild` via the transitive bump) or pin `esbuild >=0.28.1` via `pnpm.overrides`; re-run `pnpm audit` to confirm zero high+. A `vite` 5→6 major bump must be validated against the golden/E2E suite for byte-stable output. If the bump is deferred, record it explicitly as accepted dev-only risk with an owner and date.

### T-2 — New CSP `connect-src 'self'` omits the external provider origin — the opt-in live poller is blocked by the shipped policy

- **Track:** Technical
- **Severity:** Medium
- **Evidence:** `dist/index.html` ships `Content-Security-Policy: … connect-src 'self'; …` (no provider origin). The runtime reference-mid poller fetches the external host: `src/services/feed/external/provider.ts:24,59-63` (`https://api.massive.com/...`), driven by `src/services/feed/external/poller.ts`, keyed on a `sessionStorage` API key (`src/state/stores/settingsStore.ts:56-84`) and enabled via the settings panel. With `connect-src 'self'` the browser will block that cross-origin `fetch`.
- **Description:** Two-sided observation. Defensively this is *good* — the shipped policy now constrains the connect surface to same-origin, which is exactly the hardening the prior reviews asked for. But it is internally inconsistent with the still-present opt-in live feed: if a user enters a key and enables the external feed, the CSP will silently block every poll, so the feature is dead-on-arrival in the built artefact while the secret key still sits in `sessionStorage`. The security risk is therefore not "data leaves the box" (it cannot, under this CSP) but "a secret is collected and stored for a code path the policy forbids", plus a latent correctness trap if the CSP is later relaxed to re-enable the feed without re-reviewing the connect origin. Medium because it touches both the secret-handling surface and a documented runtime feature.
- **Suggested resolution:** Reconcile the policy with the feature intent. Either (a) keep `connect-src 'self'` and remove/disable the runtime poller + the API-key entry in the shipped build (simulation-only ships, secret never collected), or (b) if the opt-in live feed is intended to work in the build, add **only** the single provider origin to `connect-src` and document it as the v3 exception. Do not widen `connect-src` to a wildcard. Must not change the simulated-feed default path.

### T-3 — External provider endpoint host literal present in `dist/`; CSP/SRI/secret-handling remediation otherwise landed (carried context)

- **Track:** Technical
- **Severity:** Info
- **Evidence:** `dist/assets/index-*.js` contains the external market-data provider's endpoint host literal and a single `Bearer` token (auth construction), confirmed by grep on the built bundle. No source maps are emitted and there is no `sourceMappingURL` in the bundle (verified — only font/CSS/JS assets in `dist/assets/`). Positive deltas this phase: `dist/index.html` now ships a restrictive CSP (`default-src 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; …`); the API key is sent via `Authorization: Bearer` rather than a URL query (`src/services/feed/external/provider.ts:20-23,59-63`), so the prior `apiKey=` query construction is gone from the bundle; the build-time mids fetch is opt-in (`FETCH_LIVE_MIDS`) and range-validated before use (`scripts/fetch-reference-mids.ts:40-87`).
- **Description:** The runtime poller endpoint host is a literal in the production bundle. Per the project's own v3 brand-neutrality exception, the external-feed adapter may name the provider and its endpoint, so this is anticipated and no **user-visible** vendor string leaks into UI text; recorded for completeness because, reviewed cold, a hard-coded third-party host in shipped code is worth noting. The earlier carried-over technical findings (key-in-URL, live unauthenticated build fetch, no CSP/no SRI) have been materially remediated by FXSW-088/089. SRI (`integrity=` on the emitted `<script>`/`<link>`) is still **absent** (the tags carry `crossorigin` only) — a residual defence-in-depth gap, but lower priority now that script-src is locked to `'self'`.
- **Suggested resolution:** None required for brand-neutrality. Optionally add build-time SRI for the emitted same-origin assets to complete the hardening; otherwise no action.

## Accepted risk (out of scope this phase)

- **External provider host literal in the bundle** — covered by the documented v3 brand-neutrality exception (adapter code may name the provider/endpoint; user-visible strings stay generic). Recorded as T-3 Info, not actioned for brand-neutrality.
- **Synthetic client data treated as non-PII** — scenario definitions use fictional names/accounts; no real PII. Decision recorded so it stays explicit if real data is ever introduced.
- **No backend / in-memory state** — by design; the reason several technical items carry residual rather than Critical severity.
- **Dev-injector as the only swap entry point** — F-1's silent leg coercion is reachable today only via the controlled dev injector; the helper lives in the shared data model, so the finding is raised against the helper, not deferred, but the *exploitability* today is limited to that surface.
- **`*Sent` simulated-acknowledgement states** — the swap path reuses the existing SI machine and `QuoteSent` capture; no swap-specific skip of the `*Sent` UX contract was observed. Not re-audited line-by-line in the machines this phase; no swap-related machine change was made (the feed/pricing/UI are tenor-agnostic over the existing transitions).

## Proposed resolution work-item

```
FXSW-090 — Phase 11 security remediation (swap leg-validation + one-sided display + toolchain + CSP/feed reconciliation)
Effort: M

Acceptance criteria:
- buildSwapLegs no longer silently invents a valid far for a missing/out-of-order
  (far <= near) request: the invalid case is either refused at the injection
  boundary, or the requested-vs-applied tenors are recorded on the deal AND shown
  as a visible "far adjusted" note in SwapPanel + SwapLegDetail. Valid requests
  produce identical legs to today. (F-1)
- A one-sided swap (quoteSide BID or ASK) renders a dash / suppresses the
  non-quotable side's client-net and P/L instead of showing the raw un-marked
  net; the quotable side and its data-testids are unchanged. (F-2)
- A new v4-swap e2e asserts: (a) two sequential swap injections do not leak the
  first deal's leg/net margin into the second's captured execution margin, and
  the second opens PER_COMPONENT with zero margins; (b) the historic "Net used
  for execution" reconciles with the marked-up net actually sent. (F-3, F-4 guard)
- Toolchain: vite moved to a patched line (>=6.4.3) or esbuild pinned >=0.28.1 via
  pnpm.overrides; pnpm audit reports zero high+ advisories; goldens/E2E byte-stable. (T-1)
- The shipped CSP and the opt-in live feed are reconciled: either the runtime
  poller + API-key entry are removed/disabled in the built artefact (simulation
  only; secret never collected), OR connect-src lists exactly the single provider
  origin (no wildcard) under the documented v3 exception. (T-2)
- (Optional) SRI integrity attributes added for emitted same-origin assets. (T-3)

Done when:
- pnpm lint, typecheck, test:run, and test:e2e all pass, including the new
  swap leg-validation + one-sided-display + sequential-injection e2e assertions.
- The seed-42 golden, the GA spot + mid sequence, the v3 forward goldens, and the
  v4 NDF + swap goldens are byte-stable.
- Canonical state names and data-* test attributes are unchanged.
- dist/ remains brand-neutral in user-visible strings, contains no source maps,
  and ships the reconciled CSP.
- The simulated feed remains the default and the only test/E2E path.
```
