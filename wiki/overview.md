---
last_updated: 2026-06-11
sources:
  - docs/01-prd.md
  - docs/phase-summaries/FXSW-046-summary.md
status: stable
---

# Overview — FX Sales Workstation

A single-page frontend prototype of a **sales-trader workstation for FX manual pricing intervention**. Industry-standard term: **Sales Intervention (SI)** — the workflow in which a human sales trader manually prices a quote-request that the bank's auto-pricer either rejected or chose not to handle.

## Problem statement

Banks running auto-pricers reject some client quote requests for reasons including: no live rates available, amount outside auto-pricing limits, breach of client credit limit, margin system unavailable, off-hours, or explicit client request for a manual price. Without SI, those rejected requests are lost revenue and (in the manual-route case) a worse client experience. SI lets a sales trader review the risk verdict, apply judgement, adjust the margin and/or rate, and complete the trade.

## What this prototype is

This is **not** a re-implementation of any vendor product. It is a brand-neutral frontend prototype that demonstrates the SI workflow with simulated data, built in one week from a structured doc pack as an LLM-driven development showcase.

## Goals

| # | Goal | How we measure |
|---|------|----------------|
| G1 | Visually credible reproduction of an SI workstation | Modern dark-trading-app aesthetic |
| G2 | End-to-end working flow with simulated data | A deal can be injected, priced, sent, accepted, and reach Historic without manual code intervention |
| G3 | Three distinct rejection-reason scenarios | Each reproducible from a single Dev Injector click |
| G4 | AI Margin Suggestion with Apply | Suggestion panel produces a sensible margin and rationale per scenario; Apply updates margin reactively |
| G5 | Automated E2E coverage of the scenarios | Playwright suite runs green in CI under 2 minutes |
| G6 | Demonstrate an agentic dev loop | Built in ≤5 working days from the spec pack, commits visible per slice |

## Personas

- **Sales trader (primary user).** Watches the Active Blotter for deals needing intervention. Opens a ticket, reviews risk reasons, adjusts margin in pips, sends a stream or single quote, moves on. Lives on the keyboard.
- **Sales-desk manager / observer (secondary).** Watches the workflow during demos.
- **Client (off-screen).** Simulated. Initiates quote requests; accepts, rejects, or lets them expire.

## What's in v1

- Spot ticket only (Forward is a stretch goal; NDF / Flexible Forward / Swap / Block are out).
- Three rejection reasons: `OFF_HOURS`, `SIZE_LIMIT`, `CREDIT_LIMIT`.
- Active + Historic blotters with the 5-second removal rule.
- Send Stream / Send Quote / Withdraw / Release / Reject actions, all gated by the SI machine.
- AI Margin Suggestion with Apply / Undo and a credit-breach guardrail.
- Visual + audible notifications with a mute toggle.
- Dev injector for one-click scenario playback (gated by `?dev=1`).
- Optimised for desktop ≥1440px; horizontal-scroll responsive layout down to mobile (see [decisions/ADR-0008-ai-indigo-accent.md](decisions/) for the visual-conventions ADR and `docs/dev-log.md` "Mobile/responsive layout" for the responsive amendment).

## What's not

- No real-time market data — the pricing feed is simulated.
- No backend — no real quote handler, no real risk system, no real pricing system.
- No authentication, no persistence beyond `sessionStorage` (mute toggle only).
- Not all six ticket types — Spot only.
- Not all rejection reasons — three only, chosen for visual distinctness.
- No accessibility certification, no internationalization.

## Current state

**Phase 7 closed (FXSW-043 → FXSW-046): opt-in light theme behind `?theme=preview`. Build complete; the dark workstation remains the default and is unchanged without the flag.**

The full stack is live end-to-end:

- Pricing feed (300ms tick, seeded random walk, baked reference mids).
- Deal feed + scenario player driving the demo scenarios.
- Two-machine deal lifecycle (RFS + SI) coordinated by `dealMachine`, with `*Sent` ack delays + 5-second blotter removal.
- Live Active + Historic blotters with full status derivation.
- SI ticket panel with all seven sub-panels: Reasons, Summary, AI Margin Suggestion (ready / applied / Undo / credit-decline / computing), Pricing (streaming + fixed mode + margin controls), Client Summary, Deal Summary, Footer (hold-to-confirm + double-click).
- Deterministic AI margin engine + indigo-accented suggestion panel.
- Notifications layer: toast + title-flash + row-flash + 880 Hz WebAudio chime + mute toggle (sessionStorage-persisted).
- Dev injector for one-click scenario playback (`?dev=1`, with `?dev=v2` adding the v2 scenarios).
- **v2 UX enhancements** (Phase 6 / 6.1, behind `?dev=v2`): resizable blotter split, dual-margin pricing, mobile card-stack blotters + dev-injector popover. See [components/resize-handle.md](components/resize-handle.md) and [components/dev-injector.md](components/dev-injector.md).
- **Opt-in light theme** (Phase 7, behind `?theme=preview`): [theme switching](features/theme-switching.md) via the [theme store](components/theme-store.md) + a Tailwind RGB-triple token migration ([ADR-0011](decisions/ADR-0011-tailwind-rgb-variable-tokens.md)). Orthogonal to `?dev=v2`; both flags compose.
- Shared `Button` + `HoldButton` primitives in `src/components/`.

**Test suite:** 422 unit tests pass · 6 E2Es pass (smoke + happy-path-esp + off-hours-intervention + credit-breach + size-limit-margin-tune + release-path).

**CI workflow:** typecheck + lint + Vitest + Playwright Chromium on every push to `main` or `claude/**` and every PR; trace artifacts uploaded on failure with 7-day retention.

**Deploy:** GitHub Pages workflow shipped at FXSW-034 (pulled forward in Phase 1). Live URL serves the production build with `?dev=1`-gated injector.

**Phase progression:** Phases 1–5 built the dark v1 workstation. Phase 6 + 6.1 added the `?dev=v2` UX enhancements (squash-merged to `main`). Phase 7 added the `?theme=preview` light theme (squash-merged to `main`, commit `a622dce`). Both preview flags are opt-in; `main` without flags is the original dark v1 experience.

## Where to go next

- [glossary.md](glossary.md) — domain terms (FX, Sales Intervention, prototype-only).
- `features/` — one page per visible capability. Pending second-batch ingest.
- `components/` — one page per architectural piece. Pending.
- `scenarios/` — one page per demo scenario with the Gherkin source + test contract. Pending.
- `decisions/` — ADRs for the pre-build architectural decisions. Pending backfill.
- `onboarding.md` — synthesized new-engineer guide. Written after the full spec pack is ingested.
