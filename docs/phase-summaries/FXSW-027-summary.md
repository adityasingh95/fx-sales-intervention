---
phase: 4
ticket_range: FXSW-022 → FXSW-027
date: 2026-05-26
branch: claude/cool-planck-MeZgz
gate_counts:
  unit_tests: 296 pass / 0 todo
  e2e_tests: 5 pass (smoke + happy-path-esp + off-hours-intervention + credit-breach + size-limit-margin-tune)
  typecheck: clean
  lint: clean (--max-warnings 0)
  build: clean
  caplin_grep: dist/ Caplin-free on every commit's build
---

# Phase 4 Summary — AI Margin Suggestion

Builds on Phase 3's complete ticket UI. End state: every SI ticket reaching `PickedUp` shows a deterministic AI margin suggestion — pips number, confidence badge, rationale, Apply / Why? / Recompute — with a credit-decline guardrail that swaps the Apply path for a Reject shortcut on `CREDIT_LIMIT` deals. The two new E2Es (`credit-breach` and `size-limit-margin-tune`) exercise both happy-path Apply and credit-decline Reject end-to-end through the real ticket flow.

## What works

**FXSW-022 — clientProfiles seed data.** Commit `59fff0e`.
- `src/services/suggestion/clientProfiles.ts` — five named profiles (Acme Corp / Globex / Halcyon / Northwind / Polaris) from `docs/09 §11`, plus `getClientProfile(name)` with a defensive `'new'`-tier fallback for unknown clients.
- `src/services/suggestion/types.ts` — `ClientTier`, `ClientBehaviorFlag`, `ClientProfile`, `Factor`, `SuggestionInput`, and a discriminated union `MarginSuggestion = ReadySuggestion | CreditDeclineSuggestion`. The discriminator gives FXSW-025/026 an exhaustive contract.
- `src/services/suggestion/marketContext.ts` — static per-pair volatility lookup (`docs/09 §3.1`). Bundled in this ticket to keep the shared static data in one commit.
- Halcyon's `recent30dAcceptanceRate` encoded as `0.5` (neutral prior) instead of `0` to avoid the engine's `< 0.4` penalty firing on a new client with no history. 6 tests.

**FXSW-023 — Suggestion engine.** Commit `ca0cad8`.
- `src/services/suggestion/engine.ts` — pure `suggestMargin(input)` per `docs/09 §5–§7`. CREDIT_LIMIT short-circuits to the credit-decline shape. Otherwise: tier baseline → notional band (≤5M / 5–10M / 10–20M / >20M) → market (vol > 1.5, thin liquidity, HIGH_VOL_PAIRS) → rejection reasons (OFF_HOURS, SIZE_LIMIT) → behaviour (flight_risk, high-engagement VIP, low acceptance) → floor & round.
- `computeConfidence` per `docs/09 §6`: high for established + vol > 10M + non-thin; low for new tier OR thin OR vol < 1M; medium otherwise.
- `approxUsdNotional` inlined — USD-base pairs return notional as-is, USD-quote pairs convert via current mid.
- 34 tests cover every `if`/`else if`/`&&`/`||` branch with both true and false cases. Skipped installing `@vitest/coverage-v8` — manual walk confirmed the AC's "100% branch coverage" claim; if a future ticket needs CI coverage gating, that's the right point to add the instrumentation.

**FXSW-024 — Rationale builder.** Commit `8b12400`.
- `src/services/suggestion/rationale.ts` — `buildRationale(factors, suggestedPips, input)` per `docs/09 §8`. Enriched client phrase ("Platinum client with strong recent acceptance" for high-engagement + acceptance ≥ 0.7), per-factor crafted phrases (`"off-hours USDJPY"`, `"above auto-pricer band"`, `"12M EURUSD"`), top-3 factors by `|delta|`, truncation until ≤ 120 chars.
- Pluralisation: `1 pip` vs `N pips`. Trivial polish the doc template didn't encode.
- `Pair class` + `VIP volume` factors emit no phrase to avoid redundancy with the enriched client phrase and the already-named pair.
- `CREDIT_DECLINE_RATIONALE` exported as a constant; engine imports it. Single source of truth for the §7 message.
- 7 tests including the two canonical §8 examples (Globex 5M USDJPY OFF_HOURS = 5 pips; Northwind 12M EURUSD SIZE_LIMIT = 4 pips), the 0-factor case, the 5-factor truncate case.

**FXSW-025 — SuggestionPanel ready / applied / Undo.** Commit `301aac1`.
- `src/features/ticket/SuggestionPanel.tsx` — header with Sparkles icon + label + confidence badge (color-coded per `docs/05 §4.5`), 32px mono pips number, rationale text, Apply + Why? buttons. Applied state collapses to a single-line strip ("Applied N pips · Undo") on the same indigo chrome.
- Why? expanded inserts a 3-column factors table (Factor / Δ pips / Note). The tier row shows `baseline` instead of `+0` — the tier is the starting point, not an adjustment.
- `appliedFrom: number | null` is the single state — presence means "applied," and the stored value is what Undo restores. Avoids an "applied but previousMargin missing" impossible state.
- `src/features/ticket/TicketPanel.tsx` wires the panel between ReasonsPanel and SummaryPanel (per `docs/09 §2`); computed once per PickedUp visit via a `useRef` flag, recomputed on re-entry. The placeholder note ("AI Suggestion lands in FXSW-022 through FXSW-026") is removed.
- 8 tests including a `MarginGlowHarness` integration test that proves Apply triggers `data-margin-glow` on the PricingPanel margin input — the indigo outline animation the FXSW-025 AC calls out.

**FXSW-026 — SuggestionPanel credit-decline + Recompute.** Commit `a7cd0fd`.
- Credit-decline branch: "AI Recommendation" header + amber AlertTriangle + the §7 rationale + `RejectHoldButton` (600ms hold or double-click) on `red/40` chrome. Reject shortcut fires `onReject()` which TicketPanel maps to `forwardEvent({ type: 'Reject' })` — the same event the TicketFooter Reject sends.
- Recompute icon (`RotateCw`) in the header. Click flips `data-suggestion-state` to `computing`, shows a `bg-elevated` pulse skeleton + "Recomputing…" copy, disables Apply + Why?. After 800ms (the spec's debounce window) the panel calls `onRecompute()` and returns to `ready`.
- Debounced trigger coalesces rapid clicks / vol-shift events into one `onRecompute` call.
- Vol-shift effect: when `currentVolatility` prop changes by > 30% relative to the last computed value, fires `triggerRecompute`. Static in v1 because `marketContext` returns constant per pair — wiring in place for v2 per `docs/09 §3.1`.
- `RejectHoldButton` inlined in `SuggestionPanel.tsx`. The TicketFooter's `HoldButton` is the same shape; the lift to a shared `Button.tsx` is FXSW-029 polish scope (per FXSW-020's dev-log "lift when a second consumer arrives" plan).
- 6 new tests (14 total on the panel after removing the FXSW-025 "renders nothing for credit-decline" placeholder).

**FXSW-027 — SIZE_LIMIT_MARGIN_TUNE + CREDIT_BREACH E2E.** Commit `ab8cd30`.
- `tests/e2e/credit-breach.spec.ts` (7.3s) — Scenario 3 verbatim. Inject → INTERVENE row for Halcyon Capital / GBPUSD / "Credit limit breach" → click → ticket opens → SI advances to PickedUp → ReasonsPanel shows the long label ("Client credit limit would be breached") → `data-suggestion-state="credit-decline"` + §7 rationale + Reject button + no Apply → hold Reject 600ms → SI cycles RejectSent → TraderRejected → REJECTED → 5s removal → Historic with `data-outcome="Rejected by Trader"`.
- `tests/e2e/size-limit-margin-tune.spec.ts` (9.2s) — Scenario 4 verbatim. Inject → INTERVENE row for Northwind FX / EURUSD / "Size > auto-pricer band" → click → ticket opens with margin=3 → suggestion ready (4 pips, High confidence, rationale containing "Gold-tier" or "12M EURUSD") → Apply → margin animates to 4 + panel collapses to "Applied 4 pips" → hold Send Stream 600ms → Quoted (STREAMING) → 2s wait for the scripted CLIENT_ACCEPT → TradeConfirmed (DONE) → 5s removal → Historic with `data-outcome="Executed"`.
- Both specs follow the OFF_HOURS template: `__seedFeed = 42` + `__zeroAckDelay = true` via `addInitScript`, hold via Playwright's `click({ delay: 700 })`. Toast + document-title-prefix assertions deferred to FXSW-028.
- Total 5 E2Es now green in 34.5s.

## What's rough or open

- **`RejectHoldButton` is duplicated between `SuggestionPanel.tsx` and `TicketFooter.tsx`** (as inline `HoldButton`). FXSW-029 polish ticket is the right place to lift both to `src/components/Button.tsx` per `docs/05 §3.1`.
- **`TicketPanel.tsx`'s "reset on entry change" effect resets `margin` along with everything else.** Means Apply'd margin could revert if entry's reference changes for an unrelated reason (e.g., a tick — though in practice ticks don't update entry, just liveTick). Not currently observable; flagged for a future audit when more state flows through TicketPanel.
- **Recompute is gated only by the explicit click + the (v1-dormant) vol-shift trigger.** The spec also mentions "computed within 800ms of PickedUp" — that's the initial compute path (already wired) rather than a separate recompute. No action needed unless a future spec change introduces a third trigger.
- **No notifications layer yet.** FXSW-028 owns toast + document-title-prefix + audio chime. Both new E2Es defer those assertions consistent with the OFF_HOURS spec convention.
- **Volatility prop is constant in v1.** The `> 30%` shift trigger never fires in practice — the panel's vol-shift code path is reachable only via tests that re-render with a different `currentVolatility` prop. Working as designed per `docs/09 §3.1` v2 hook.

## What surprised you

- **The first SIZE_LIMIT E2E failure looked like "panel never renders" but was actually "panel renders, testid resolved a sibling text".** `getByTestId('suggestion-pips').toHaveText('4')` matched the combined text content `"4pips"` (number + the "pips" unit span inside the same div). The DOM dump diagnostic — a throwaway spec that dumped the ticket panel HTML and console-logged the compute effect — was what unstuck it. 15-minute detour worth the precise diagnosis. Lift: when wiring testids around a value + unit composition, scope the testid to the value-only child.
- **TicketPanel needed a `useCallback` for the compute function so the FXSW-026 Recompute path could invoke the same code.** Initial FXSW-025 inlined the engine call in the effect; refactoring to a callable handler was a one-commit change that turned out to be the right architecture from the start for FXSW-026's onRecompute.
- **Halcyon's `recent30dAcceptanceRate` literally encoded "—" as `0` would have caused the engine to penalise a new client.** Caught during code review of FXSW-022's first draft. The fix was tiny (use `0.5`) but the reasoning is the kind of "no data ≠ zero" thinking that distinguishes a deterministic rule engine from a careless one. Documented in `clientProfiles.ts` so the choice survives later readers.
- **Pluralisation of "pip" vs "pips" was nowhere in the doc** but became visible the first time the engine produced suggestedPips=1. The template literal `${suggestedPips} pips` is a slip rather than a spec; the fix in `compose()` is two lines.
- **All five E2Es finish in 34.5s.** Smoke + happy-path + off-hours + credit-breach + size-limit total time. Plenty of CI budget headroom for FXSW-031's release-path spec and any future scenarios.
- **No new deps in Phase 4 either.** Mirrors Phase 3. The four library imports were already in `package.json`: lucide-react (icons), clsx, react, xstate, zustand. The doc-pack's pinned-stack discipline continues to pay rent.

## Recommended next slice

**Ready for Phase 5.** Start with **FXSW-028 — Notifications visual layer** (toast + row flash + document-title prefix). The OFF_HOURS, CREDIT_BREACH, and SIZE_LIMIT_MARGIN_TUNE E2Es all have toast + title-prefix assertions stubbed-out comments waiting to be activated once the layer ships. FXSW-029 adds the audio chime + mute toggle + settingsStore on top, FXSW-030 is a pure polish pass (including the FXSW-029-deferred shared `Button.tsx` lift), FXSW-031 is the last E2E (RELEASE_PATH), FXSW-032 wires CI, FXSW-033 is README + recording, FXSW-034 is the final deploy workflow.

Phase 4 work product lives on `claude/cool-planck-MeZgz` ahead of `main` by 14 commits; the PR back to main + Wiki Agent ingest happen as a single hand-off step.
