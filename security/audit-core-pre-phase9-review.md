# Security review — Special full-codebase audit of pre-Phase-9 / GA core surfaces (FXSW-090)

## Review metadata

- **Phase:** Special full-codebase audit of pre-Phase-9 / GA core surfaces (state machines, stores, simulated feed + scenario player, deterministic suggestion engine, pricing/utility math, GA UI render surfaces, index.html/Vite). Surfaces first deep-reviewed here; the Phase 9/10 surface (bid/ask points, external feed, build-time fetch, NDF) and the toolchain/build-hygiene surface were covered by `FXSW-077-review.md` and `FXSW-081-review.md` and are not re-litigated.
- **Commit reviewed:** `3ba85213600a6a8c242c94995be10823d93bba20`
- **Branch:** `claude/pricing-trades-phase-plan-h70vy7`
- **Date:** 2026-06-17
- **Tooling run:** `pnpm audit`; `pnpm build` (rebuilt `dist/`, inspected `dist/index.html` + `dist/assets/*`, confirmed no source maps / no `sourceMappingURL`); static read of `/src` (`state/machines`, `state/stores`, `services/feed`, `services/scenarios`, `services/suggestion`, `lib`, `features/blotter|ticket|notifications|dev-injector`), `index.html`, `vite.config.ts`. Read-only only; no live exploits, no third-party endpoint scans.

## Summary

The GA/core surfaces are in good shape, with a genuinely deterministic and well-bounded pricing/suggestion core. Pricing arithmetic is centralised in `lib/pips.ts` with consistent rounding and is correct; margins are floored to zero at every UI call site; the AI Margin Suggestion engine is fully deterministic (static client profiles + static market context, no model/network call — the only `Date.now()` use is a non-load-bearing `computedAt` timestamp). There are no DOM-injection sinks anywhere (no `dangerouslySetInnerHTML`/`innerHTML`/`eval`), so client names, account codes, and rationale text rendered into the DOM are React-escaped. WebAudio is correctly gesture-gated; `sessionStorage` writes are limited to documented small UI prefs (mute, blotter split, theme) plus the v3 external-feed key/flag (the key handling is a Phase-9 item, already filed). The material residual risks are two non-determinism gaps in the scenario player (a `Math.random()` coin-flip follow-up and `Math.random()` deal-ID generation) and a scenario-player timer/gate leak that survives deal archival and a single-deal reset. The state-layer integrity gaps in the dual-machine model (UI-only side-lock, RFS leg has no `*Sent` ack, parent machine never reconciles terminal legs) are real GA-core defects but were already filed in the Phase 9 review (F-1/F-2/F-3 there) and are referenced, not re-counted, here. **New findings: 0 Critical, 0 High, 1 Medium, 3 Low, 2 Info.**

| ID | Track | Severity | Title |
|----|-------|----------|-------|
| F-1 | Functional | Medium | Scenario player follow-up uses non-seeded `Math.random()` — one scenario's client outcome is non-deterministic |
| F-2 | Functional | Low | Scenario-player timers/gates are not cleared on deal archival or single-deal reset (leak + stale emits) |
| F-3 | Functional | Low | Deal IDs and display IDs use non-seeded `Math.random()` (reproducibility / collision surface) |
| T-1 | Technical | Low | Spot pricing feed default seed derives from `Date.now()` (non-deterministic unless `window.__seedFeed` is set) |
| F-4 | Functional | Info | `RfsEvent.Expire`/`ClientClose` are unreachable from the live feed (dead transitions) |
| T-2 | Technical | Info | Suggestion `computedAt` and toast/title side-effects use wall-clock time (non-load-bearing) |

## Findings

### F-1 — Scenario player follow-up uses non-seeded `Math.random()`; one scenario's client outcome is non-deterministic

- **Track:** Functional
- **Severity:** Medium
- **Evidence:** `src/services/scenarios/player.ts:33-37` — the `CLIENT_ACCEPT_OR_REJECT` follow-up resolves via `Math.random() < 0.5 ? CLIENT_ACCEPT : CLIENT_REJECT`. Wired by the `CREDIT_BREACH` scenario at `src/services/scenarios/definitions.ts:55-60`.
- **Description:** The codebase invests heavily in determinism — the spot feed (`pricingFeed.ts`), the forward-points feed (`forwardPoints.ts`), and the suggestion engine (`engine.ts`) are all seeded/static so the seed-42 golden and the E2E suite are reproducible. This one scenario branch breaks that contract: whether the credit-breach deal ends `Executed` or `Declined` is decided by a non-seeded coin flip at runtime. Any golden/E2E that injects `CREDIT_BREACH` and asserts a terminal outcome is inherently flaky, and a reviewer cannot reproduce a given run. Reviewed cold, a trading-flow simulator whose terminal outcome is unseeded-random for one path is a determinism defect, not just test flakiness — it means the demonstrated behaviour for that scenario is not pinned. Severity Medium because it is confined to the simulated scenario layer (no real price/PII impact) but it directly contradicts the project's own determinism contract for a documented scenario.
- **Suggested resolution:** Route the coin flip through a seeded PRNG (the existing `makeRng`/`hashSeed` in `services/feed/rng.ts`), keyed off the deal ID or an injectable seed, and make the seed overridable for tests (mirroring `window.__seedFeed`). Alternatively split `CREDIT_BREACH` into two fixed-outcome scenarios. Must keep the seed-42 golden and the existing E2E paths byte-stable (no scenario today asserts the random branch's outcome, so a seeded default that preserves current observed behaviour is safe).

### F-2 — Scenario-player timers/gates are not cleared on deal archival or single-deal reset

- **Track:** Functional
- **Severity:** Low
- **Evidence:** `src/services/scenarios/player.ts:59-79,122-130` — `scheduleEvent` adds `setTimeout` handles to `timers` and `armFollowUp` adds `after-si-state` gates to `gates`; both are only purged in `reset()` (`:132-136`). Deal archival in `src/state/stores/dealsStore.ts:142-166` stops the XState actor and deletes the store entry but never tells the player to drop that deal's pending timers/gates. `DevInjector.resetSession` (`src/features/dev-injector/DevInjector.tsx:55-62`) calls the global `dealFeed.reset()`, but `useDealsStore.removeDeal` (`dealsStore.ts:256-265`) does not.
- **Description:** When a deal archives (5-second rule) or is individually removed, any still-pending follow-up timer keeps running and eventually calls `opts.emit({type, dealId})` for a `dealId` that no longer has a store entry; `forwardEvent` then no-ops (`dealsStore.ts:267-271`). Likewise an unfired `after-si-state` gate lingers in the `gates` set forever (it is only deleted when its exact state is observed, `:127`). The practical impact today is benign — the stale emit is swallowed and the sets are small — but it is an unbounded-growth / timer-leak seam: over a long session with many injected-then-archived deals the `gates` set accumulates dead entries, and a late-firing timer for a recycled `dealId` (IDs are random, see F-3) could in principle target the wrong live deal. Low severity (no current exploit, bounded by session length and `Math.random` collision probability).
- **Suggested resolution:** Add a `forgetDeal(dealId)` to the scenario player that clears that deal's timers + gates, and call it from the archival path and from `removeDeal`. Keep the global `reset()` behaviour. No contract/state-name change.

### F-3 — Deal IDs and display IDs use non-seeded `Math.random()`

- **Track:** Functional
- **Severity:** Low
- **Evidence:** `src/services/scenarios/player.ts:15-21` (`makeDealId` — 6 chars from a 62-char alphabet via `Math.random`); `src/lib/ids.ts:7-16` (`makeRequestId`/`makeTradeId` — 6 chars from a 36-char alphabet via `Math.random`).
- **Description:** Two consequences. (1) Reproducibility: the internal `dealId` and the displayed REQ-/TRD- identifiers differ run-to-run, so any golden/snapshot that captures an ID is non-stable and the determinism contract that covers prices does not extend to identity. (2) Collision: 6 chars is a small space (≈5.7e10 for dealId, ≈2.2e9 for the display IDs) and `Math.random` is not collision-resistant; `addDeal` silently no-ops on a `dealId` it already holds (`dealsStore.ts:115`), so a collision would drop a deal rather than error. In a no-backend prototype the collision odds over a session are negligible, hence Low, but the IDs are the human-facing reconciliation handles in the blotters and a silently-dropped deal on collision is a latent integrity gap.
- **Suggested resolution:** Generate IDs from a seeded/monotonic source (the player already accepts an injectable `generateDealId`; `lib/ids` could take an injectable RNG) so tests can pin them, and make `addDeal` treat a duplicate `dealId` as an error/regenerate rather than a silent no-op. Must not change the REQ-/TRD- display format.

### T-1 — Spot pricing feed default seed derives from `Date.now()`

- **Track:** Technical
- **Severity:** Low
- **Evidence:** `src/services/feed/pricingFeed.ts:106-110` — `const seed = ...window.__seedFeed... : Date.now() & 0xffffffff;`.
- **Description:** The spot feed is deterministic only when `window.__seedFeed` is set (the E2E/golden path). In normal app/dev use the seed is the wall clock, so the price stream is non-reproducible. This is by design for the running app and is the documented test hook, so it is not a defect per se; recorded as Low because, reviewed cold, a "simulated, deterministic feed" whose default seed is the clock is worth flagging — a reviewer who runs `pnpm dev` cannot reproduce a price path without knowing to set the global. No security impact beyond reproducibility.
- **Suggested resolution:** Optionally allow the seed to also come from a URL/sessionStorage knob for manual reproduction; otherwise document that `window.__seedFeed` is the only determinism entry point. No change to the test path required.

### F-4 — `RfsEvent.Expire`/`ClientClose` are unreachable from the live feed (dead transitions)

- **Track:** Functional
- **Severity:** Info
- **Evidence:** `src/state/machines/rfsMachine.ts:8-15,49,57,64,73` define `Expire`/`ClientClose` transitions, but `src/state/stores/dealsBootstrap.ts:27-32` makes the feed's `EXPIRE` event a no-op (the parent `dealMachine` has no `Expire`/`ClientClose` forwarding, `dealMachine.ts:62-105`), and no scenario emits `CLIENT_CANCEL` down a path that reaches RFS `ClientClose` (the feed maps `CLIENT_CANCEL` → SI `ClientReject`, `dealsBootstrap.ts:23-25`).
- **Description:** The RFS `Expired`/`ClientClosed` terminal states and the `outcomeFromFinalStates` branches that read them (`dealsStore.ts:69-70`) are present but cannot be reached through the live feed/scenario layer at this commit. This is not a vulnerability — it is dead-but-correct lifecycle code — but it is noted because the unreachable terminal paths mean the `EXPIRED`/`Cancelled` historic outcomes are effectively untested through the real wiring, and a future ticket that enables `Expire` forwarding would activate them without a dedicated review. Info only.
- **Suggested resolution:** None required now. If/when `Expire` forwarding is added to the parent machine, re-review the RFS terminal/removal path and ensure the parent reconciles the SI leg (see the carried-over F-3 below).

### T-2 — Suggestion `computedAt` and toast/title side-effects use wall-clock time

- **Track:** Technical
- **Severity:** Info
- **Evidence:** `src/services/suggestion/engine.ts:56,170` (`computedAt: Date.now()`); `src/state/stores/notificationsStore.ts:37`; `src/state/stores/dealsStore.ts:153,190,223,289`.
- **Description:** Confirming the suggestion engine is genuinely deterministic: the *suggested pips*, *confidence*, *factors*, and *rationale* derive solely from static client profiles (`clientProfiles.ts`), static market context (`marketContext.ts`), and the deal inputs — no `Math.random`, no network, no model call. The only non-deterministic value is the `computedAt` timestamp, which is display/audit metadata and does not feed back into any price or suggestion. Recorded as Info to make the determinism conclusion explicit (a clean result for the engine) and to note the wall-clock usages are non-load-bearing.
- **Suggested resolution:** None required. If timestamp stability in goldens is ever wanted, inject a clock.

## Areas given a clean bill (no actionable findings)

- **Pricing / utility math (`src/lib/pips.ts`, `format.ts`, `time.ts`, `quoteSide.ts`):** Pip sizes and display precision are consistent per pair; `roundTo` is applied at every boundary; `estimatedProfitUsd` guards `midRate === 0`; the quote-side truth table (`quoteSide.ts:14-18`) matches the documented BUY/SELL × BASE/QUOTE mapping; `valueDateForTenor` correctly applies T+2 + weekend roll-forward. No sign/rounding/locale-injection defects found. (The math layer is instrument-agnostic and relies on callers to zero the NDF spot margin — that caller-dependency was filed as F-1/F-2 in the Phase 10 review and is out of scope here.)
- **Margin flooring in the UI:** Every margin mutation path floors at zero — steppers/inputs/keyboard in `MarginControls.tsx` are clamped by the parent callbacks (`PricingPanel.tsx:188,219`, `ForwardPointsPanel.tsx:195,208`); `BalanceZeroRow` clamps to `minMargin` (`MarginControls.tsx:167-169`); the single-control path clamps to `MIN_MARGIN` (`:25-27,49-51`). No negative-margin path found.
- **DOM-injection / XSS:** No `dangerouslySetInnerHTML`, `innerHTML`, `insertAdjacentHTML`, `document.write`, `eval`, or `new Function` anywhere in `/src`. Client names, account codes, and AI rationale are rendered as React children (auto-escaped), including in the toast message built by `dispatcher.ts:25-29`. Clean.
- **WebAudio unlock (`useNotificationSound.ts`):** Playback is gated behind both `muted` and an `unlocked` flag set only on the first `click`/`keydown` gesture (`:46-52,77-86`); `playChime` early-returns until unlocked. Correct per the audio-unlock rule.
- **`sessionStorage`/`localStorage` usage:** No `localStorage` anywhere. `sessionStorage` writes are limited to `si.muted`, `si.blotterSplit`, `si.theme` (small UI prefs) and the v3 `si.externalFeedKey`/`si.externalFeedEnabled`. All reads/writes are wrapped in `try/catch` with sane fallbacks. The external-feed key storage is a Phase-9 item already filed (and backlogged) — not re-counted here.
- **Suggestion engine determinism:** Confirmed deterministic (see T-2). No model/network call; `CREDIT_LIMIT` short-circuits to a fixed decline message; bounds are clamped (`Math.max(1, Math.round(...))` for both spot and forward-points components). The rationale builder truncates to a max length and cannot emit markup that contradicts the suggested pips.
- **Store immutability:** `dealsStore` updates clone the `Map` and build new entry objects on every `set`; `recordQuoteContext` shallow-copies the events array and replaces (not mutates) the target element (`dealsStore.ts:277-296`); notification/ui/settings stores all replace rather than mutate. No in-place mutation of prior state found.
- **Feed timer hygiene (spot + forward feeds):** `pricingFeed.start()` is idempotent (`:105`) and `stop()` clears the interval and all maps; the forward-points feed is a pure memoised lookup with no timers. `usePrice` returns the subscribe-unsubscribe cleanup from `useEffect`. (The scenario-player timer leak is the one exception — filed as F-2.)
- **Build hygiene (GA build path):** `pnpm build` emits no source maps and no `sourceMappingURL`; `dist/index.html` is minimal. (Absence of CSP/SRI on the shipped site is a known Phase-9 item, backlogged — not re-counted.)

## Accepted risk / referenced prior findings (not re-counted here)

- **State-layer integrity in the dual-machine model — ALREADY FILED.** The one-sided side-lock is enforced only in the UI (`disabled` props in `PricingPanel.tsx`/`ForwardPointsPanel.tsx`) with no guard in the machines; the RFS leg has no `*Sent` acknowledgement state and flips straight to `Executable` while SI is still in its ack window (`rfsMachine.ts:39-66` vs `siMachine.ts:56-58`); and the parent `dealMachine` has a single `Running` state with no terminal/reconciliation, routing `Reject` to SI only (`dealMachine.ts:87-95`) so a half-terminal deal stays partially actionable. These are genuine pre-Phase-9 GA-core gaps, but they were filed as **F-1/F-2/F-3 in `FXSW-077-review.md`** (Phase 9) and re-noted as open in `FXSW-081-review.md`. They remain unaddressed at this commit (no guard, no parent final state, no RFS `*Sent`), but per scope they are not re-litigated or re-counted here — they should be carried in the backlog under the prior remediation work-items.
- **External market-data feed / build-time fetch / API-key-in-URL / CSP+SRI / toolchain advisories — ALREADY FILED.** Out of scope per this review's brief; backlogged as FXSW-088 / FXSW-089. `pnpm audit` at this commit still reports 24 advisories (2 critical, 5 high, 14 moderate, 3 low) in dev/test tooling — unchanged in character from the prior reviews, not re-counted.
- **Synthetic client data treated as non-PII.** `definitions.ts` / `clientProfiles.ts` use obviously fictional names and account codes. No real PII; recorded only so the decision stays explicit if real data is ever introduced.
- **No backend / in-memory state.** By design; the reason the determinism/timer findings above carry residual rather than higher severity.

## Proposed resolution work-item

```
FXSW-090 — GA-core determinism + scenario-player lifecycle hardening
Effort: S–M

Acceptance criteria:
- The CLIENT_ACCEPT_OR_REJECT scenario follow-up is resolved via a seeded PRNG
  (reusing services/feed/rng.ts), keyed off the deal ID or an injectable seed and
  overridable for tests; the credit-breach scenario outcome is reproducible. (F-1)
- The scenario player exposes forgetDeal(dealId) that clears that deal's pending
  timers and after-si-state gates; it is called from the deal archival path
  (dealsStore archive) and from removeDeal, so no stale follow-up emits for an
  archived/removed deal and the gates set does not grow unbounded. (F-2)
- Deal IDs (player.makeDealId) and display IDs (lib/ids) are generated from an
  injectable/seeded source so tests can pin them; addDeal treats a duplicate
  dealId as an error/regeneration rather than a silent no-op. The REQ-/TRD-
  display format is unchanged. (F-3)
- (Optional) A documented manual-reproduction seed knob for the spot feed beyond
  window.__seedFeed. (T-1)

Done when:
- pnpm lint, typecheck, test:run, and test:e2e all pass.
- The seed-42 golden, the GA spot + mid sequence, and the v3 forward goldens are
  byte-stable.
- Canonical state names and data-* test attributes are unchanged.
- dist/ remains brand-neutral in user-visible strings and contains no source maps.
- The simulated feed remains the default and the only test/E2E path.

Note: the dual-machine state-layer gaps (UI-only side-lock guard, RFS *Sent
symmetry, parent-machine terminal reconciliation) were filed in FXSW-077-review.md
(F-1/F-2/F-3) and remain open at this commit; they are GA-core but are tracked
under that prior remediation, not duplicated into FXSW-090.
```
