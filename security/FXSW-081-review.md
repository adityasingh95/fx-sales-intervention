# Security review — Phase 10 — NDF (Non-Deliverable Forward) (FXSW-081)

## Review metadata

- **Phase:** Phase 10 — NDF (FXSW-078 instrumentType discriminator + injector selector, FXSW-079 NDF points-only pricing, FXSW-080 NDF blotter/detail surfaces)
- **Commit reviewed:** `440f4a68afa2159c6f16694affcb714caf1d4c99`
- **Branch:** `claude/pricing-trades-phase-plan-h70vy7`
- **Date:** 2026-06-16
- **Tooling run:** `pnpm audit`; `pnpm build` (rebuilt `dist/`, then inspected `dist/index.html` + `dist/assets/*.js`); static read of `/src`, `package.json`, lockfile; `git diff` of the three Phase 10 tickets. Read-only only; no live exploits, no third-party endpoint scans.

## Summary

Phase 10 adds an `instrumentType` discriminator (`SPOT|OUTRIGHT|NDF|SWAP`), an `instrumentOf()` resolver, an injector instrument selector, NDF points-only ticket pricing, and an instrument column in the blotters/detail. The resolver is used consistently at every read site, the SPOT→forward-tenor coercion in `buildDeal` is correct, and the pricing math (`lib/pips.ts`) is instrument-agnostic — there is no sign/rounding regression. The central NDF risk, however, is that "spot markup is inert for an NDF" is enforced **only** in one render path of one component (`TicketPanel`'s manual-intervention branch, by substituting a zeroed margin before calling the pricing helpers); the invariant is not carried in the deal/state layer or the pricing math. As a result, **the auto-priced (ESP) NDF view does not zero the spot margin** and shows the client an outright that includes a 3-pip spot markup, directly contradicting the points-only contract; and the quote-context audit record stores the raw (non-zeroed) spot margin, so an NDF's "Markup reason" in the historic detail can claim a spot markup that never affected the price. On the technical track the toolchain has regressed sharply since Phase 9: `pnpm audit` now reports **24 advisories (2 critical, 5 high, 14 moderate, 3 low)**, with `vite` still pinned at the vulnerable `5.2.10`. All Phase 9 external-call-surface and hardening findings (API key in URL, live build-time third-party fetch, no CSP/SRI) remain **unaddressed** — the proposed remediation ticket from the prior review was not implemented. **9 findings: 0 Critical, 2 High, 4 Medium, 2 Low, 1 Info.**

| ID | Track | Severity | Title |
|----|-------|----------|-------|
| F-1 | Functional | High | Auto-priced (ESP) NDF applies a spot markup — points-only contract violated on the read-only path |
| F-2 | Functional | Medium | NDF "inertness" enforced only in one render path; not in the state layer or pricing math |
| F-3 | Functional | Medium | Quote-context audit record stores a spot markup for an NDF that never affected price |
| F-4 | Functional | Low | Auto-priced NDF still renders the all-in/per-component markup toggle |
| T-1 | Technical | High | Toolchain advisories regressed: 24 total (2 critical, 5 high); `vite` still 5.2.10 |
| T-2 | Technical | Medium | API key still sent as a URL query string to the external provider (carried over, unfixed) |
| T-3 | Technical | Medium | Production build still makes an unauthenticated live third-party fetch, response baked in unvalidated (carried over, unfixed) |
| T-4 | Technical | Low | Still no Content-Security-Policy or Subresource-Integrity on the shipped site (carried over, unfixed) |
| T-5 | Technical | Info | External provider endpoint + `apiKey=` query construction present in `dist/` (documented exception) |

## Findings

### F-1 — Auto-priced (ESP) NDF applies a spot markup; points-only contract violated on the read-only path

- **Track:** Functional
- **Severity:** High
- **Evidence:** `src/features/ticket/TicketPanel.tsx:217-249` (the `autoView` branch) passes `marginPair={marginPair}` to `ForwardPointsPanel` (`:235`) and to `ClientSummaryPanel` (`:242`) — the **raw** spot margin, not the NDF-zeroed `effectiveSpotMargin` defined at `:166`. The zeroing (`effectiveSpotMargin = isNdf ? {bid:0,ask:0} : marginPair`) is applied only in the manual branch (`:337`, `:347`). The auto-priced spot margin is the deal default, `DEFAULT_MARGIN_PIPS = 3` (`src/services/scenarios/definitions.ts:3`), and the all-in client rate folds the spot margin in via `clientForwardPair` → `clientBidFromForward`/`clientAskFromForward` (`src/lib/pips.ts:79-95,120-129`). An NDF can reach this branch: inject `HAPPY_PATH_ESP` (the one `channel: 'ESP'` scenario, `definitions.ts:5-7`) with the injector instrument set to `NDF`; `buildDeal` coerces the SPOT request to a forward tenor (`src/services/scenarios/player.ts:93-96`) and the ESP deal auto-prices (`src/state/stores/dealsStore.ts:251-253`), opening the read-only `autoView` (`TicketPanel.tsx:119`).
- **Description:** For an NDF the documented invariant (FXSW-079; `docs/02` §12) is that the spot-level markup contributes nothing to the client price — markup is taken on the forward points only. That invariant holds on the manual ticket but is broken on the auto-priced view: the Client Summary and the all-in outright shown for an auto-priced NDF include a 3-pip spot widening that should not exist. Reviewed cold, this is a "price shown to the client the desk did not intend" — the read-only surface tells the operator the client is being streamed an outright marked up on a component that the instrument forbids. The Phase 10 e2e (`tests/e2e/v4-ndf.spec.ts`) exercises only the SI-channel NDF, so this path is untested.
- **Suggested resolution:** In the `autoView` branch, derive and pass the same `effectiveSpotMargin` (zeroed for NDF) to both `ForwardPointsPanel` and `ClientSummaryPanel`, exactly as the manual branch does. Better, make inertness structural (see F-2) so no individual render path can reintroduce the markup. Must not change the GA/auto-priced spot or outright golden for non-NDF instruments.

### F-2 — NDF "inertness" enforced only in one render path; not in the state layer or pricing math

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** The pricing helpers in `src/lib/pips.ts` take a `spotMargin` argument and never branch on instrument; the NDF zero is applied by the caller substituting `effectiveSpotMargin` (`src/features/ticket/TicketPanel.tsx:166,337,347`). No guard exists in `dealsStore`/machines, and `instrumentOf()` (`src/types/deal.ts:74-75`) is consulted only by view code. F-1 is the direct consequence of this single-point enforcement; the keyboard `+`/`-` handler (`src/features/ticket/PricingPanel.tsx:122-135`) and the AI-suggestion Apply path (`TicketPanel.tsx:257-268`) both still mutate the spot `marginPair` for an NDF (the spot margin row is merely hidden via `showSpotMargin={!isNdf}` at `:312`), so a non-zero spot margin genuinely exists on an NDF deal in component state.
- **Description:** The same structural weakness flagged for the one-sided side-lock in the Phase 9 review (F-1 there) recurs for NDF: a price-integrity invariant lives in a UI render decision rather than in the data/logic layer. Today only the manual TicketPanel branch zeroes it; any other consumer of the spot margin (the auto-priced branch — see F-1; the quote-context capture — see F-3; any future leg/swap view that reuses `marginPair`) silently reintroduces the markup. The defence is one substitution away from being bypassed at each call site.
- **Suggested resolution:** Centralise the rule so it cannot be forgotten: either (a) clamp the spot margin to zero for NDF at the single boundary where the pricing inputs are assembled (a helper that takes `instrumentOf(deal)` and returns the effective spot/fwd margins), and have every consumer — manual, auto, capture — go through it; or (b) have the pricing helpers themselves take the instrument and ignore the spot margin for NDF. Must preserve the seed-42 golden and the v3 forward goldens (non-NDF behaviour unchanged).

### F-3 — Quote-context audit record stores a spot markup for an NDF that never affected price

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/features/ticket/useQuoteContextCapture.ts:34-41` builds `appliedMargin` from the raw `marginPair` (`{ kind: 'forward', spot: marginPair, fwd }`), not from the NDF-zeroed `effectiveSpotMargin`. TicketPanel passes the raw `marginPair` into the hook (`TicketPanel.tsx:127-133`). The captured value is rendered verbatim in the historic detail as `Spot {bid}/{ask} · Fwd {bid}/{ask} pips` (`src/features/ticket/HistoricDetailPanel.tsx:28-31,144-146`). Because the spot margin can be non-zero on an NDF via the keyboard or AI-Apply paths (see F-2), the recorded `spot` component can be non-zero.
- **Description:** The "Markup reason" panel is the audit/explanation surface for a sent quote. For an NDF it can state a spot markup of, e.g., `Spot 5/5` that contributed nothing to the price the client actually received. This is an audit-trail integrity defect: the recorded rationale misrepresents what was applied. It does not change the live price (the price is computed from the zeroed margin), so it is Medium rather than High, but in a trading context a markup record that disagrees with the executed price is a real reconciliation hazard.
- **Suggested resolution:** Capture the *effective* margins — zero the spot component for NDF before recording (or record `{ kind: 'forward', spot: {0,0}, fwd }` for an NDF). Ideally route capture through the same centralised effective-margin helper proposed in F-2 so the record and the price are guaranteed consistent. Must not alter the recorded shape for non-NDF deals (keeps the existing detail goldens stable).

### F-4 — Auto-priced NDF still renders the all-in/per-component markup toggle

- **Track:** Functional
- **Severity:** Low
- **Evidence:** `src/features/ticket/TicketPanel.tsx:227-239` — the `autoView` `ForwardPointsPanel` is rendered without `showMarkupToggle={!isNdf}` (the manual branch sets it at `:336`), so the toggle (`src/features/ticket/pricing/ForwardPointsPanel.tsx:116-131`) shows for an auto-priced NDF.
- **Description:** Cosmetic/contract inconsistency: NDF has no all-in/per-component choice (FXSW-079), yet the auto-priced NDF view still offers the toggle. The view is read-only so it cannot change a sent price, but it presents a control the instrument does not support and is inconsistent with the manual NDF view. Low severity (read-only, no price effect).
- **Suggested resolution:** Pass `showMarkupToggle={!isNdf}` (and the NDF note) in the `autoView` branch too, matching the manual branch.

### T-1 — Toolchain advisories regressed: 24 total (2 critical, 5 high); `vite` still 5.2.10

- **Track:** Technical
- **Severity:** High
- **Evidence:** `pnpm audit` summary: `24 vulnerabilities found — 3 low | 14 moderate | 5 high | 2 critical`. Notable: two **critical** `vitest` advisories (`<1.6.1` GHSA-9crc-q9x8-hgqq RCE via malicious site while the API server listens; `<3.2.6` GHSA-5xrq-8626-4rwp arbitrary file read/exec via the UI server) — installed `vitest@1.6.0` (`package.json`); **high** `vite` `launch-editor` command injection (`<=5.4.8`, GHSA-c27g-q93r-2cwf) plus the earlier `vite` advisories still matching `5.2.10`; **high** `playwright <1.55.1` (GHSA-7mvr-c777-76hp) and an `esbuild` binary-integrity RCE. `vite` is still pinned at `5.2.10` (`package.json`) — the Phase 9 bump-to-`>=5.4.15` recommendation (prior T-3) was not applied, and the advisory count has since grown.
- **Description:** These are dev/test-tooling issues (test runner, dev server, browser installer, bundler) rather than flaws in the shipped static bundle, so end-user exposure is limited; but they affect every developer/CI machine, and two are now rated critical (a malicious page can read/execute files on a developer running the Vitest server). The regression — advisory count up and the prior bump not applied — means the toolchain is drifting further from patched versions each phase.
- **Suggested resolution:** Bump `vite` to a patched line (`>=5.4.20` clears the matched advisories), `vitest` to `>=3.2.6` (or at minimum `>=1.6.1` for the RCE), `@playwright/test`/`playwright` to `>=1.55.1`, and let `esbuild`/`@babel/core` update transitively (pin via pnpm overrides if needed). Re-run `pnpm audit` to confirm zero high+; re-run the golden/E2E suite to confirm byte-stable output. A test-runner major bump (`vitest` 1→3) must be validated against the existing unit suite.

### T-2 — API key still sent as a URL query string to the external provider (carried over, unfixed)

- **Track:** Technical
- **Severity:** Medium
- **Evidence:** `src/services/feed/external/provider.ts:54` constructs the request URL with `...&apiKey=${encodeURIComponent(apiKey)}`; `dist/assets/*.js` still contains the `apiKey=` query construction (confirmed via grep on the rebuilt bundle).
- **Description:** Unchanged from the Phase 9 review (T-1 there). The opt-in reference-mid poller appends the user's secret key to the request URL, so a real key lands in the provider's access logs, any proxy logs, the browser network panel, and potentially `Referer`. Off by default keeps it below Critical, but the moment a key is entered it leaks into multiple logging surfaces. Re-reported because it remains in the current build.
- **Suggested resolution:** As before — send the key via a request header in the `fetchImpl` options if the provider supports it; otherwise document the exposure and batch requests to minimise key emission. Must not change the simulated-feed default or any test path (the poller is injected with a mock `fetchImpl`).

### T-3 — Production build still makes an unauthenticated live third-party fetch; response baked in unvalidated (carried over, unfixed)

- **Track:** Technical
- **Severity:** Medium
- **Evidence:** `package.json` still wires `tsx scripts/fetch-reference-mids.ts` as both `prebuild` and `predev`; running `pnpm build` for this review emitted a live-fetch failure line naming the build-time provider and `(HTTP 403); using fallback`, i.e. the live unauthenticated call is still attempted on every build with no `USE_FALLBACK_MIDS` opt-out in effect. The committed anchor `src/services/feed/referenceMids.json` is imported as the feed baseline.
- **Description:** Unchanged from the Phase 9 review (T-2 there). Build correctness depends on an external, unauthenticated third party at build time, and (per the prior review) the build-time script consumes the response without field-level finiteness/range validation, so a poisoned-but-200 payload could be serialised into the committed anchor. Re-reported because the build still behaves this way at the reviewed commit.
- **Suggested resolution:** As before — default the build to the pinned committed mids (make the live fetch opt-*in*), and validate every consumed field with `Number.isFinite` + a sane range before writing/using. Keep the seed-42 golden stable (recorded against the fallback mids).

### T-4 — Still no Content-Security-Policy or Subresource-Integrity on the shipped site (carried over, unfixed)

- **Track:** Technical
- **Severity:** Low
- **Evidence:** Rebuilt `dist/index.html` contains no `<meta http-equiv="Content-Security-Policy">`; the emitted `<script>`/`<link>` carry `crossorigin` but no `integrity` attribute; no `public/_headers`/equivalent in the repo. (Confirmed on the rebuilt artefact.)
- **Description:** Unchanged from the Phase 9 review (T-4 there). The app runs entirely client-side, can `fetch` a third-party host (the poller), and holds a secret key in `sessionStorage`; with no CSP there is no defence-in-depth on script/connect origins, and with no SRI a CDN/host compromise could swap the bundle undetected. Re-reported because it remains absent.
- **Suggested resolution:** As before — ship a restrictive CSP `<meta>` (`default-src 'self'; script-src 'self'; connect-src 'self'` + the single provider origin only when the live feed is used) and add build-time SRI for emitted assets where feasible. Must not block the simulated-feed default path.

### T-5 — External provider endpoint + `apiKey=` query construction present in `dist/` (documented exception)

- **Track:** Technical
- **Severity:** Info
- **Evidence:** The rebuilt bundle (`dist/assets/index-*.js`) contains the external market-data provider's endpoint host literal (see `src/services/feed/external/provider.ts:19,54`) together with the `apiKey=` query fragment. No source maps emitted; no `sourceMappingURL` in the bundle (verified). The Phase 10 instrument tokens that appear in the bundle (e.g. `NDF`) are generic FX terminology, not vendor brands — no brand-neutrality regression from this phase.
- **Description:** The runtime poller endpoint host is a literal in the production bundle. Per the project's own v3 exception, the external-feed adapter may name the provider and its endpoint, so this is anticipated; recorded for completeness and because, reviewed cold, a hard-coded third-party endpoint plus the auth mechanism (key-in-query, see T-2) in shipped code is worth noting. No user-visible vendor brand label leaks into UI text.
- **Suggested resolution:** None required for brand-neutrality. Fixing T-2 removes the `apiKey=` query construction from the bundle as a side benefit.

## Accepted risk (out of scope this phase)

- **`instrumentOf()` resolver consistency** — every read site (`ActiveBlotter.tsx:123`, `HistoricBlotter.tsx`, `TicketPanel.tsx:157`, `HistoricDetailPanel.tsx:125`, `player.ts:87-90`) resolves the instrument through `instrumentOf()`/`defaultInstrumentForTenor()`; the SPOT→forward coercion for NDF lives once in `buildDeal` (`player.ts:93-96`). No inconsistent resolution was found, so the "mispriced because the instrument resolves differently in different layers" concern does **not** produce a finding — the resolver is sound. The residual risk is not the resolver but the *margin* path (F-1/F-2), which is instrument-agnostic at the math layer and relies on the caller.
- **SWAP instrument not yet implemented** — `InstrumentType` includes `SWAP` and `DealLeg`/`LegTabs` exist as seams, but no swap pricing/near-far leg logic ships this phase (the injector offers only `AUTO`/`NDF`, `DevInjector.tsx:15-16`). The swap-specific lenses (near/far leg mix-ups, far ≤ near acceptance, net-points from the wrong sides) have no code surface to attack and are deferred to the swap phase.
- **Synthetic client data treated as non-PII** — `definitions.ts` uses obviously fictional names/accounts; no real PII; recorded only so the decision stays explicit if real data is ever introduced.
- **No backend / in-memory state** — by design; the reason several technical findings carry residual rather than Critical severity.

## Proposed resolution work-item

```
FXSW-082 — Phase 10 security remediation (NDF spot-markup inertness + toolchain + carried-over hardening)
Effort: M

Acceptance criteria:
- NDF spot markup is inert on EVERY path, not just the manual ticket branch:
  the auto-priced (ESP) NDF view zeroes the spot margin in both ForwardPointsPanel
  and ClientSummaryPanel, so an auto-priced NDF client price/outright contains no
  spot widening. (F-1)
- The NDF effective-margin rule is centralised (a single helper keyed off
  instrumentOf(deal)) and used by the manual view, the auto view, and the
  quote-context capture, so no individual render path can reintroduce a spot
  markup. (F-2)
- The recorded quote-context appliedMargin for an NDF carries a zero spot
  component (matches the price actually sent); non-NDF records unchanged. (F-3)
- The auto-priced NDF view hides the all-in/per-component markup toggle and shows
  the NDF note, matching the manual NDF view. (F-4)
- Toolchain bumped: vite >= 5.4.20, vitest >= 3.2.6 (or >= 1.6.1 minimum),
  @playwright/test/playwright >= 1.55.1, esbuild/@babel/core updated transitively;
  pnpm audit reports zero high+ advisories. (T-1)
- External provider auth no longer uses a URL query string for the API key where
  the provider permits a header; otherwise the exposure is documented and requests
  batched. (T-2)
- The build defaults to the pinned committed reference mids (live third-party
  fetch is opt-IN), and any consumed response is validated field-by-field with
  Number.isFinite + range before use. (T-3)
- index.html ships a restrictive CSP <meta> (default-src/script-src/connect-src
  'self' + the single provider origin only when the live feed is used); SRI added
  for emitted assets where feasible. (T-4)

Done when:
- pnpm lint, typecheck, test:run, and test:e2e all pass, including a new e2e that
  injects an NDF via the ESP/HAPPY_PATH path and asserts the client price contains
  no spot markup.
- The seed-42 golden, the GA spot + mid sequence, and the v3 forward goldens are
  byte-stable for non-NDF instruments.
- Canonical state names and data-* test attributes are unchanged.
- dist/ remains brand-neutral in user-visible strings and contains no source maps.
- The simulated feed remains the default and the only test/E2E path.
```
```
```
```
```
Note on prior work-item FXSW-078 (proposed in the FXSW-077 review): its
ticket number was reused by the build team for the Phase 10 instrumentType
discriminator, and its security ACs (API key in URL, live build fetch,
vite bump, CSP/SRI, side-lock guard, *Sent/parent-machine reconciliation,
vendor literals in tests) were NOT implemented. The external-call-surface
and hardening items are re-raised above as T-2/T-3/T-4/T-1; the state-layer
items (one-sided lock guard, RFS *Sent symmetry, parent-machine
reconciliation, vendor literals in test files) remain open and should be
folded back into the backlog — they were not re-audited line-by-line this
phase but no code change addressing them was observed in the Phase 10 diff.
```
