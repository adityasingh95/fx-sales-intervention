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
