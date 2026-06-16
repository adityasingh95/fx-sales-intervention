# Security review — Phase 9 — bid/ask points + v4 gate + Security Agent (FXSW-077)

## Review metadata

- **Phase:** Phase 9 — bid/ask points + v4 gate + Security Agent
- **Commit reviewed:** `3c4390a17956a8ecda7c1664a733b3fb9b071834`
- **Branch:** `claude/pricing-trades-phase-plan-h70vy7`
- **Date:** 2026-06-16
- **Tooling run:** `pnpm audit` (JSON); `pnpm build` (rebuilt `dist/`, then inspected `dist/index.html` + `dist/assets/*.js`); static read of `/src`, `/scripts`, `package.json`, lockfile, and `.github/workflows`. Read-only only; no live exploits, no third-party endpoint scans.

## Summary

Overall posture is reasonable for a no-backend prototype: pricing arithmetic is correct and centralised, margins are floored to zero at every input boundary, terminal lifecycle states accept no further actions, synthetic client data is plainly fictional, and there are no DOM-injection sinks. The material risks are concentrated in the external-call surface and build pipeline: the GUI-entered API key is transmitted as a URL query parameter to the third-party provider; the production deploy makes an unauthenticated live build-time call to a third-party FX-rate endpoint whose response is baked into the bundle with no integrity validation; the toolchain (`vite` 5.2.10) carries five known moderate advisories; and the shipped site has no CSP/SRI hardening. Functionally, the one-sided "lock" and the `*Sent` acknowledgement contract are enforced only in the UI/topology, with no guard in the state layer and no parent-machine reconciliation. **11 findings: 0 Critical, 2 High, 5 Medium, 3 Low, 1 Info.**

| ID | Track | Severity | Title |
|----|-------|----------|-------|
| T-1 | Technical | High | API key sent as URL query string to the external provider |
| T-2 | Technical | High | Production build makes an unauthenticated live call to a third-party endpoint; response baked into bundle without validation |
| T-3 | Technical | Medium | Toolchain `vite` 5.2.10 has five known moderate advisories |
| T-4 | Technical | Medium | No Content-Security-Policy or Subresource-Integrity on the shipped site |
| F-1 | Functional | Medium | One-sided side-lock enforced only in the UI; no guard in the state layer |
| F-2 | Functional | Medium | `*Sent` acknowledgement contract not enforced on the RFS leg; ack-skew between children |
| F-3 | Functional | Medium | Parent deal machine never reconciles/terminates; half-terminal deals stay partially actionable |
| T-5 | Technical | Low | API key persisted in `sessionStorage` in plaintext, readable by any script (no CSP backstop) |
| T-6 | Technical | Low | Vendor names committed in a test file outside the permitted adapter path |
| T-7 | Technical | Low | External-feed adapter lacks per-request rate-limit/backoff jitter and concurrency guard |
| T-8 | Technical | Info | Third-party endpoint string is present in `dist/` (documented exception) |

## Findings

### T-1 — API key sent as URL query string to the external provider

- **Track:** Technical
- **Severity:** High
- **Evidence:** `src/services/feed/external/provider.ts:54` — `const url = \`${BASE_URL}/C:${pair}/prev?adjusted=true&apiKey=${encodeURIComponent(apiKey)}\`;`
- **Description:** The opt-in reference-mid poller authenticates by appending the user's secret API key to the request URL as `?apiKey=...`. Secrets in URLs are a well-known anti-pattern: the full URL (key included) lands in the provider's server access logs, any intermediary/proxy logs, the browser's network panel, and — if any redirect or third-party resource is ever loaded from these pages — the `Referer` header. The key is fetched per pair in a loop, so it is emitted in up to four URLs per poll cycle. Because the feed is opt-in and off by default this is not Critical, but the moment a real key is entered it is leaked into multiple logging surfaces.
- **Suggested resolution:** Send the key in a request header (e.g. `Authorization`/an `X-API-Key` style header) via the `fetchImpl` options object instead of the query string, if the provider supports it. If the provider only accepts a query-param key, document the exposure explicitly and minimise it (single batched request rather than per-pair). Must not change the simulated-feed default path or any test path (the poller is injected with a mock `fetchImpl`).

### T-2 — Production build makes an unauthenticated live call to a third-party endpoint; response baked into the bundle without validation

- **Track:** Technical
- **Severity:** High
- **Evidence:** `scripts/fetch-reference-mids.ts:48-60`; wired as `prebuild`/`predev` in `package.json:7,9`; `.github/workflows/deploy.yml:31` runs `pnpm build` with **no** `USE_FALLBACK_MIDS`, so the live path executes on every deploy.
- **Description:** On every production deploy the build fetches a third-party FX-rate endpoint (the build-time reference-rate provider; see `scripts/fetch-reference-mids.ts:48-60` for the endpoint URL literal), parses the JSON, and writes `src/services/feed/referenceMids.json`, which is then imported as the price-feed anchor (`src/services/feed/pricingFeed.ts:1,51,112`). Two issues: (1) the build's correctness and integrity now depend on an external, unauthenticated third party at build time — a poisoned or hijacked response directly determines the prices the prototype shows; (2) the response is consumed without schema/finiteness validation — `EURUSD: round(1 / data.rates.EUR, 4)` (line 55) yields `Infinity`/`NaN` if `rates.EUR` is missing or zero, which would then be serialised into the committed anchor file. (The runtime poller path *does* validate with `Number.isFinite` at `pricingFeed.ts:136`; the build-time script does not.) The `try/catch` only covers transport/`!res.ok`, not malformed-but-200 payloads. Observed during this review: the build log emitted a "fetch failed (HTTP 403); using fallback." message, i.e. the live call is genuinely attempted during `pnpm build`.
- **Suggested resolution:** Default the build to the pinned `FALLBACK` (treat `USE_FALLBACK_MIDS` as opt-*in* to the live call, not opt-out), or validate every field with `Number.isFinite` and a sane range before writing, falling back otherwise. Either way the committed `referenceMids.json` should be the source of truth for reproducible/offline builds. Must keep the seed-42 golden stable (it is recorded against the `FALLBACK` mids per the script comment, so defaulting to fallback is golden-safe).

### T-3 — Toolchain `vite` 5.2.10 has five known moderate advisories

- **Track:** Technical
- **Severity:** Medium
- **Evidence:** `pnpm audit` reports `vite@5.2.10` matching GHSA-9cwx-2883-4wfx, GHSA-64vr-g452-qvp3, GHSA-vg6x-rcgg-rjx6, GHSA-x574-m823-4x7w (all `>=5.0.0 <5.4.15`, patched `>=5.4.15`) plus `esbuild@0.20.2` (GHSA-67mh-4wv8-2f99, via `tsx`). Installed version confirmed `5.2.10`.
- **Description:** The advisories are dev-server / build-tooling issues (arbitrary file read via `?raw`/`?import&raw`, permissive dev-server CORS + missing Origin/Host validation, and a DOM-clobbering XSS gadget for `cjs`/`iife`/`umd` output). This project ships ES-module output to static GitHub Pages, so the DOM-clobbering gadget does not apply to the production artefact, and the dev-server issues affect developer machines rather than end users. Severity is Medium because the exposure is primarily to the development environment, but a malicious site could read a developer's source while `pnpm dev` is running.
- **Suggested resolution:** Bump `vite` to `>=5.4.15` (and let `esbuild` update transitively, or add a pnpm override pinning `esbuild>=0.25.0`). Re-run `pnpm build` and the golden/E2E suite to confirm output is byte-stable.

### T-4 — No Content-Security-Policy or Subresource-Integrity on the shipped site

- **Track:** Technical
- **Severity:** Medium
- **Evidence:** `dist/index.html` (generated) contains no `<meta http-equiv="Content-Security-Policy">`; the `<script>`/`<link>` tags carry `crossorigin` but no `integrity` attribute; no `public/_headers`, `netlify.toml`, or equivalent header config exists in the repo.
- **Description:** The application runs entirely client-side and can initiate outbound `fetch` to a third-party host (the poller). With no CSP there is no defence-in-depth limiting where script may execute or where the page may connect — relevant because the page holds a secret API key in `sessionStorage` (see T-5) and makes cross-origin requests. With no SRI, a compromise of the hosting/CDN path could swap the bundle undetected. GitHub Pages cannot set arbitrary response headers, but a CSP `<meta>` tag is deliverable and would constrain `connect-src`/`script-src`.
- **Suggested resolution:** Add a restrictive CSP `<meta>` tag to `index.html` allowing `script-src 'self'`, `connect-src 'self'` plus the single external provider origin (only when the live feed is in use), and `default-src 'self'`. Consider enabling Vite build SRI (e.g. an SRI plugin) for the emitted assets. Must not block the simulated-feed default path.

### F-1 — One-sided side-lock enforced only in the UI; no guard in the state layer

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/features/ticket/pricing/MarginControls.tsx:81,91-93,114` (the `disabled` prop only greys out the markup row); locking wired purely as a UI prop at `src/features/ticket/PricingPanel.tsx:173,185,204,216` and `src/features/ticket/pricing/ForwardPointsPanel.tsx:192,205`. The state machines contain **no** guards: `src/state/machines/siMachine.ts` (`PickedUp --Quote--> QuoteSent` at ~:51, `Quoted --Quote--> QuoteSent` at ~:60) accept a quote unconditionally; `src/state/machines/rfsMachine.ts` likewise; `src/state/machines/dealMachine.ts` fans `Quote` to both children with no condition (~:64-73). The deal context carries only `dealId`, so the machine has no notion of which side is locked.
- **Description:** For a one-sided client request the non-quotable side is meant to be unpriceable. That invariant lives entirely in the React layer (a `disabled` input). Nothing in the lifecycle layer prevents a `Quote`/`PriceUpdate` event for a locked side from being accepted — e.g. via the dev-injector, a direct store dispatch, or any future code path that bypasses the disabled input. In a real trading context, pricing a side the client did not ask for (and the desk intended to lock) is a "price the trader did not intend" risk. The price math itself is correct (`src/lib/pips.ts`, `src/lib/quoteSide.ts`), so the gap is authorization, not arithmetic.
- **Suggested resolution:** Carry the quotable side(s) in the deal/SI context and add a guard on the quote transition so a locked side is rejected at the machine level (defence in depth behind the UI lock). Must preserve canonical state names and the `*Sent` sequencing; guard only the entry condition, not the state graph.

### F-2 — `*Sent` acknowledgement contract not enforced on the RFS leg; ack-skew between children

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/state/machines/siMachine.ts` funnels every client-facing state through a timed `*Sent` state (e.g. `Quoted` reachable only from `QuoteSent` via `after: { ackDelay: 'Quoted' }`, ~:56-58) — non-skippable. `src/state/machines/rfsMachine.ts` has **no** `*Sent` states: `Queued --PriceUpdate--> Executable` (~:47) and `PickedUp --PriceUpdate--> Executable` (~:54) flip instantly. `src/state/machines/dealMachine.ts:69-73` fans one `Quote` to both children (`si: Quote`, `rfs: PriceUpdate`).
- **Description:** Critical rule #9 makes the simulated `*Sent` acknowledgement states a UX/integrity contract ("not skippable"). That contract is enforced on the SI leg only. Because the parent fans a single quote to both children, the RFS leg becomes `Executable` immediately while the SI leg is still in `QuoteSent` for the ack delay. Any consumer that reads RFS `Executable` as the authoritative "executable to client" signal effectively skips the acknowledgement on the RFS path, and for the ack window the two coordinated machines disagree about whether the deal is live.
- **Suggested resolution:** Either document the RFS leg's no-ack model as intentional and ensure no consumer treats RFS `Executable` as the client-facing "sent" signal, or add the symmetric `*Sent` staging to RFS so both legs honour the same contract. Must preserve canonical state names and the seed-42 golden.

### F-3 — Parent deal machine never reconciles/terminates; half-terminal deals stay partially actionable

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/state/machines/dealMachine.ts:54-107` — a single `Running` state, no final state, no detection that both children reached `Removed`, and `Reject` routed to SI only (~:87-92). Terminal child states rely solely on the *absence* of `on:` handlers for protection (`siMachine.ts` ~:78-86, `rfsMachine.ts` ~:67-75).
- **Description:** Terminal protection is topological, not explicit — there is no `notTerminal` guard or parent final state. After a trader `Reject`, SI is terminal but the RFS leg stays in `PickedUp`/`Executable` and still accepts `TradeConfirmed`/`Withdraw`/`Expire`; similarly a `TradeConfirmed` arriving during the SI ack window confirms RFS while SI continues to `Quoted`. The result is a half-terminal deal that remains partially actionable, including during the 5-second removal window, since the parent keeps fanning events to both children. The 5-second removal rule (Critical rule #6) is therefore not guaranteed to be inert at the state layer when only one leg is terminal. No immediate exploit was demonstrated, but the lack of cross-leg reconciliation is a latent integrity gap that worsens if any terminal state later gains an `on:` handler.
- **Suggested resolution:** Add a parent-level aggregate/terminal state that stops routing once both children are terminal, and/or add explicit `notTerminal` guards as defence in depth. Route reject/terminal events to both legs so they cannot diverge. Must preserve canonical state names, the `*Sent` contract, and the 5-second removal timing.

### T-5 — API key persisted in `sessionStorage` in plaintext, readable by any script

- **Track:** Technical
- **Severity:** Low
- **Evidence:** `src/state/stores/settingsStore.ts:53-70` (`readExternalFeedKey`/`writeExternalFeedKey` store the raw key under `si.externalFeedKey`); rendered into a `type="password"` input at `src/features/settings/ExternalFeedPanel.tsx:61-69`.
- **Description:** The secret is held in `sessionStorage` for the whole tab session in cleartext, accessible to any JavaScript running on the origin (`sessionStorage.getItem('si.externalFeedKey')`). With no CSP (T-4) there is no backstop against a single injected/compromised script exfiltrating it. The `sessionStorage` scope (cleared on tab close, not shared cross-tab) is the right call and matches the documented intent; severity is Low because the masked input and session scope are already in place and the feature is off by default. The residual risk is the absence of a CSP and the plaintext-at-rest storage.
- **Suggested resolution:** Keep the session-only scope; pair with the CSP from T-4 to reduce exfiltration risk, and consider clearing the key on `disable()` / explicit "forget key" affordance. Do not move the key out of `sessionStorage` into anything more persistent.

### T-6 — Vendor names committed in a test file outside the permitted adapter path

- **Track:** Technical
- **Severity:** Low
- **Evidence:** `src/features/settings/ExternalFeedPanel.test.tsx:30-31` — two `.not.toContain(...)` negative assertions against the external provider's brand tokens (two string literals).
- **Description:** The brand-neutrality rule confines vendor names to the external-feed adapter path (`src/services/feed/external/`). These two provider brand tokens appear in a *test* file under `src/features/settings/`, which is committed source outside the permitted path. The strings are in negative assertions (verifying the UI does *not* leak the names), so the intent is sound, but the literal vendor tokens are nonetheless committed outside the sanctioned location. They do not reach `dist/` (confirmed: no provider brand token in the bundle other than the permitted endpoint host — see T-8). Low severity: source-only, test-only, and self-cancelling in intent.
- **Suggested resolution:** Assert against a non-vendor sentinel or read the forbidden tokens from a shared constant in the adapter dir, so the vendor literals do not appear in `src/features/`. Behaviour unchanged.

### T-7 — External-feed adapter lacks per-request timeout jitter and concurrent-poll guard

- **Track:** Technical
- **Severity:** Low
- **Evidence:** `src/services/feed/external/provider.ts:53-67` (sequential per-pair fetches, each a 5 s `AbortSignal.timeout`, no inter-request spacing); `src/services/feed/external/poller.ts:23-67` (self-rescheduling `setTimeout`; `enable()` stops any prior poller, but `runOnce` has no in-flight guard if a fetch outlives the next tick).
- **Description:** The poller backoff (exponential, capped at 30 min) and the rate-limit (HTTP 429) handling are well-implemented. Minor gaps: four sequential requests per cycle with no jitter can trip a strict free-tier limiter; and if a `fetchMids` call were ever slower than the interval there is no explicit single-flight guard (in practice the 5 s per-request timeout vs 5 min interval makes this benign today). Low severity / largely defensive.
- **Suggested resolution:** Optional: add small jitter between per-pair requests and an in-flight flag in `runOnce`. No contract change.

### T-8 — Third-party endpoint string is present in `dist/` (documented exception)

- **Track:** Technical
- **Severity:** Info
- **Evidence:** `dist/assets/index-B44iVXrw.js` contains the external market-data provider's endpoint URL literal (see `src/services/feed/external/provider.ts:19,54`) together with the `apiKey=` query fragment. No source maps are emitted and no `sourceMappingURL` is present (verified).
- **Description:** A third-party market-data host appears as a literal in the production bundle. Per the project's own v3 exception, the external-feed adapter may name the provider and its endpoint, and the endpoint therefore appearing in the bundle is explicitly anticipated. Recording it here for completeness and because, reviewed cold, a hard-coded third-party endpoint in shipped code is worth noting; it is not a user-visible string and no vendor brand label leaks into UI text. Combined with T-1, note that the bundle also reveals the auth mechanism (key-in-query). No action required beyond the T-1 fix.
- **Suggested resolution:** None required for brand-neutrality. Addressing T-1 removes the `apiKey=` query construction from the bundle as a side benefit.

## Accepted risk (out of scope this phase)

- **Synthetic client data treated as non-PII** — `src/services/scenarios/definitions.ts` uses obviously fictional names/accounts (Acme Corp, Globex Industries, account codes like `ACME-EUR-1`). No real PII; no finding. Recorded so the decision is explicit: if this prototype is ever fed real client/account data, that data must be reclassified and protected.
- **v4 instruments (NDF, SWAP) largely unimplemented** — the `?dev=v4` gate is live (`src/lib/devVersion.ts:34`), but `Deal` has no `instrumentType` discriminator (`src/types/deal.ts:40-54`) and NDF/SWAP exist only as documented seams (`LegKind`, `LegTabs.tsx`). The instrument-specific lenses (NDF spot-markup leakage, swap near/far leg mix-ups, far ≤ near acceptance, net-points from the wrong sides) have **no current code surface** to attack, so no findings are raised for them this phase. They must be re-reviewed when the v4 instrument logic is actually built.
- **No backend / in-memory state** — by design; not a finding on its own, but it is the reason several of the above (T-1, T-4, T-5) carry residual rather than Critical severity.

## Proposed resolution work-item

```
FXSW-078 — Phase 9 security remediation (external-call surface, build pipeline, hardening)
Effort: M

Acceptance criteria:
- External provider auth no longer uses a URL query string for the API key
  where the provider permits a header; if query-param is unavoidable, the
  exposure is documented and requests are batched to minimise key emission. (T-1)
- The build defaults to the pinned committed reference mids; the live third-party
  fetch is opt-IN (not opt-out), and any consumed response is validated field-by-
  field with Number.isFinite + range check before being written/used. (T-2)
- Toolchain bumped: vite >= 5.4.15 and esbuild >= 0.25.0 (override if transitive);
  pnpm audit reports zero moderate+ advisories. (T-3)
- index.html ships a restrictive CSP <meta> (default-src 'self'; script-src 'self';
  connect-src 'self' + the single provider origin only when the live feed is used);
  SRI added for emitted assets where feasible. (T-4)
- Side-lock enforced by a guard in the SI/deal machine (quotable side carried in
  context), not by the UI disabled prop alone. (F-1)
- *Sent acknowledgement model on RFS is either symmetric with SI or documented so
  no consumer reads RFS Executable as the client-facing "sent" signal. (F-2)
- Parent deal machine reconciles/terminates once both legs are terminal and routes
  terminal/reject events to both legs; terminal protection is explicit, not only
  topological. (F-3)
- Vendor literals removed from test files outside src/services/feed/external/. (T-6)

Done when:
- pnpm lint, typecheck, test:run, and test:e2e all pass.
- The seed-42 golden and the GA spot + mid sequence are byte-stable.
- Canonical state names and data-* test attributes are unchanged.
- dist/ remains brand-neutral in user-visible strings and contains no source maps.
- The simulated feed remains the default and the only test/E2E path.
```
