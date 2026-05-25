# 01 — Product Requirements Document

## 1. Background

Caplin FX Sales is a single-dealer-platform component used by sales traders at banks to monitor and intervene in client FX pricing. Its **Sales Intervention (SI)** feature lets a human trader manually price quote requests that the bank's auto-pricer either rejected or chose not to handle. The full product spec is at https://docs.caplin.com/developer/fx-sales/st-sales-intervention.

This project is **not** a re-implementation of that product. It is a **frontend prototype** intended to demonstrate that an LLM-driven development workflow (Claude Code) can deliver a polished, functional, and tested SI screen — design, interactions, automation tests — within one week, using a structured doc pack like this one as the input.

## 2. Problem statement

Banks running Caplin's auto-pricer reject some client quote requests for reasons including: no live rates available, amount outside auto-pricing limits, breach of client credit limit, margin system unavailable, off-hours, or explicit client request for a manual price (per the Caplin overview page). Without SI, those rejected requests are lost revenue and (in the manual-route case) a worse client experience. SI lets a sales trader review the risk verdict, apply judgement, adjust the margin and/or rate, and complete the trade.

## 3. Goals (for the prototype)

| # | Goal | How we measure |
|---|------|----------------|
| G1 | Visually credible reproduction of an SI workstation | Modern dark-trading-app aesthetic; same affordances as the reference Caplin UI screens |
| G2 | End-to-end working flow with simulated data | A new deal can be injected, priced, sent, accepted, and reach Historic Blotter without manual code intervention |
| G3 | Three distinct rejection-reason scenarios | Each scenario reproducible from a single Dev Injector click |
| G4 | **AI Margin Suggestion with Apply** | Suggestion panel renders in the ticket, produces a sensible margin and rationale per scenario, Apply button updates margin reactively |
| G5 | Automated E2E coverage of the scenarios | Playwright suite runs green in CI under 2 minutes |
| G6 | Demonstrate Claude Code's agentic dev loop | Built in ≤5 working days from this doc pack, with commits visible per slice |

## 4. Non-goals

- **No real-time market data.** The pricing feed is simulated.
- **No backend.** No real Liberator, no DataSource, no quote handler integration.
- **No authentication.** Single-user, no login.
- **No persistence beyond session.** Page reload resets all state (except the mute setting).
- **Not all six ticket types.** Spot only. Forward is a stretch goal; NDF, Flexible Forward, Swap, Block are explicitly out.
- **Not all six Caplin rejection reasons.** Three only, chosen for visual distinctness in a demo.
- **No mobile / responsive design.** Desktop only, ≥1440px wide.
- **No accessibility certification.** WCAG AA contrast is a build target; full a11y audit is out.
- **No internationalization.** English, EN-GB number formatting.

## 5. Personas

**Sales trader (primary user).** Sits on a trading desk with multiple monitors. Watches the Active Blotter for notifications. Opens a ticket, reviews the risk reasons, adjusts margin in pips, sends a stream or single quote, and moves on. Hates clicks; lives on the keyboard. Wants the screen dense, the latency invisible, the affordances predictable.

**Sales-desk manager / observer (secondary).** Watches blotters over the trader's shoulder during demos and pitches. Cares about the workflow story.

**Client (off-screen).** Initiates quote requests from a separate trading app. Receives quotes. Accepts, rejects, or lets them expire.

## 6. User stories

1. As a sales trader, I want a single screen showing all live deals so I can see at a glance what needs my attention.
2. As a sales trader, when a deal enters intervention state I want both a visual cue (highlighted row + toast) and an audible cue so I notice it even when I'm looking elsewhere.
3. As a sales trader, I want to mute audible notifications when I'm on a call, without losing visual cues.
4. As a sales trader, I want to open a deal's ticket and immediately see why auto-pricing failed.
5. As a sales trader, I want a streaming trader rate as the default, and the ability to switch to a fixed rate by clicking the rate value.
6. As a sales trader, I want to adjust margin in single-pip increments with a clear preview of what the client will see.
7. As a sales trader, I want to send a streaming quote with one click, watch the row update, and see the deal completion in Historic.
8. As a sales trader, I want to release a ticket back to the desk if I can't take it, so a colleague can pick it up.
9. As a sales trader, I want to reject a deal that I don't want to price, with the rejection reaching the client.
10. As a sales trader, I want completed deals to clear from the Active Blotter automatically after 5 seconds so my view stays focused on what's live.
11. **As a sales trader, I want an AI-suggested margin with a one-line rationale so I can pre-commit to a price faster on familiar shapes of trade, while keeping the right to override.**
12. **As a sales trader, I want to see *why* the AI suggested what it did (factors like client tier, notional, volatility, recent behavior), so I can trust or contest it.**
13. **As a sales trader, when the AI sees a credit-limit breach it should recommend declining, not just price wider — guardrail not gas pedal.**
14. As a demo operator, I want a hidden dev panel where I can inject specific scenarios on demand.
15. As a developer/reviewer, I want each demo scenario to be backed by an automated Playwright test that exercises the same path.

## 7. Success criteria (demo definition of done)

The demo is successful if the operator can:

1. Open the app at a clean URL and see an empty Active Blotter, an empty Historic Blotter, and an unmuted notifications icon.
2. Trigger Scenario 1 (Happy Path ESP) and watch the deal flow Active → 5s pause → Historic with no SI interaction.
3. Trigger Scenario 2 (Off-Hours Intervention) and watch the row enter SI state, notification fires, the operator opens the ticket, sends stream, simulator accepts, deal lands in Historic — total time under 30 seconds.
4. Trigger Scenario 3 (Credit Breach) and reject the ticket; deal lands in Historic with REJECTED state.
5. Trigger Scenario 4 (Size Limit + Margin Adjustment) and use the +/- pip controls to widen the margin, send the stream, watch acceptance.
6. Toggle mute and verify audible notifications stop firing while toast/visual cues continue.
7. Run `pnpm test:e2e` from the same code and watch the 4 scenarios above pass under 2 minutes.

## 8. Constraints

- **Time:** ≤5 working days from the start of build, single developer + Claude Code.
- **Tech:** Frontend-only. Static-host deployable. No server.
- **Browser support:** Latest Chrome. Other browsers nice-to-have.
- **Code quality bar:** TS strict, no `any`, ESLint clean, every PR green in CI.

## 9. Open questions

These are flagged for the operator (you) to decide before build day 2:

- **Q1:** Use AG-Grid Community (free) or pivot to TanStack Table? AG-Grid is the de facto standard for trading blotters; TanStack is lighter. Recommendation: AG-Grid for fidelity to the real product.
- **Q2:** Should the dev injector ship enabled in production builds? Recommendation: gated behind `?dev=1` URL param.
- **Q3:** Audible notification — license-clean ping sound, or generated with WebAudio API? Recommendation: WebAudio (no asset licensing risk).
- **Q4:** Should Historic Blotter be visible by default or hidden behind a tab toggle? Recommendation: split-screen visible, smaller pane below Active.

## 10. Out-of-scope items for v1 (logged for v2 planning)

- Forward / NDF / Flexible-Forward / Swap / Block-Trade tickets
- The other three Caplin rejection reasons: no live rates, margin system unavailable, explicit client manual-pricing request
- Limit Order tickets (stop loss, take profit) — Caplin lists these as SI candidates
- Multi-user / take-over of released tickets
- Audit trail / activity log
- Real WebSocket transport
- Real auth
- Settings panel beyond mute
- Confirmation tickets launched from Historic rows (Caplin docs note this exists)
