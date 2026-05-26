---
last_updated: 2026-05-26
sources:
  - docs/01-prd.md
status: in-progress
---

# Overview — FX Sales Workstation

A single-page frontend prototype of a **sales-trader workstation for FX manual pricing intervention**. Industry-standard term: **Sales Intervention (SI)** — the workflow in which a human sales trader manually prices a quote-request that the bank's auto-pricer either rejected or chose not to handle.

## What it is

A polished, functional, tested SI screen — design, interactions, automation tests — built in one week from a structured doc pack as an LLM-driven development showcase. It is **not** a re-implementation of any vendor product; it's a brand-neutral prototype that demonstrates the workflow with simulated data.

## Who it's for

- **Sales trader (primary user).** Watches the Active Blotter for deals needing intervention. Opens a ticket, reviews the risk reasons, adjusts margin in pips, sends a stream or single quote, moves on.
- **Sales-desk manager / observer (secondary).** Watches the workflow during demos.
- **Client (off-screen).** Simulated. Initiates quote requests; accepts, rejects, or lets them expire.

## Goals

| # | Goal |
|---|------|
| G1 | Visually credible reproduction of an SI workstation — modern dark-trading-app aesthetic. |
| G2 | End-to-end working flow with simulated data — deal injects, prices, sends, accepts, lands in Historic Blotter without manual code intervention. |
| G3 | Three distinct rejection-reason scenarios, each reproducible from a single Dev Injector click. |
| G4 | AI Margin Suggestion with Apply — produces a sensible margin and rationale per scenario; Apply button updates margin reactively. |
| G5 | Automated E2E coverage of the scenarios — Playwright suite runs green in CI under 2 minutes. |
| G6 | Demonstrate the agentic dev loop — built in ≤5 working days, with commits visible per slice. |

## Current state

Phase 2 closed (FXSW-007 → FXSW-013). The pricing feed, deal feed, scenario player, two-machine deal lifecycle, status derivation, live blotters, and the dev injector are wired end-to-end. `HAPPY_PATH_ESP` runs as a passing Playwright E2E. The ticket panel, AI Margin Suggestion, notifications, and polish (Phases 3-5) are not yet built.

## Where to go next

- **Glossary** — domain terms (FX, Sales Intervention, prototype-only). _Pending first ingest._
- **Features** — one page per visible capability. _Pending._
- **Components** — one page per architectural piece. _Pending._
- **Decisions (ADRs)** — pre-build decisions and ongoing trade-offs. _Pending backfill._
- **Onboarding** — synthesized new-engineer guide. _Written after spec-pack ingest completes._
