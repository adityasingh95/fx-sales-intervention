# 01 — Product Requirements Document

## 1. Background

FX Sales Workstation is a frontend prototype for a sales-trader manual-pricing intervention workflow. It models the situation where an auto-pricing path cannot or should not price a client FX request automatically, and a human sales trader must review the reason, adjust the margin or rate, and return a price to the client.

The project is not a reimplementation of any third-party product. It is a brand-neutral prototype intended to demonstrate that an LLM-driven development workflow can deliver a polished, functional, tested SI screen within one week from a structured specification pack.

## 2. Problem statement

Banks and brokers may route certain client quote requests to manual pricing when automated pricing is unavailable, outside configured limits, blocked by credit/risk controls, or otherwise requires trader judgement. Without a manual-pricing workflow, these requests can become lost revenue or a poor client experience. The prototype shows how a sales trader can review the risk verdict, apply judgement, adjust pricing, and complete or reject the trade.

## 3. Goals

| # | Goal | How we measure |
|---|------|----------------|
| G1 | Visually credible sales-trader workstation | Modern dark trading-app aesthetic and dense workflow layout |
| G2 | End-to-end working flow with simulated data | A new deal can be injected, priced, sent, accepted, and archived |
| G3 | Three distinct manual-pricing scenarios | Each scenario reproducible from one Dev Injector click |
| G4 | AI Margin Suggestion with Apply | Suggestion panel renders in the ticket, gives rationale, and updates margin |
| G5 | Automated E2E coverage | Playwright suite runs green in CI |
| G6 | Demonstrate an agentic dev loop | Built from this doc pack with visible commits and tests |

## 4. Non-goals

- No real-time market data; pricing feed is simulated.
- No backend quote handler, risk engine, trade booking, or authentication.
- No persistence beyond session-level UI settings.
- Spot only for v1; Forward, NDF, Flexible Forward, Swap, and Block Trade are out.
- Three manual-pricing reasons only: off-hours, size-limit breach, and credit-limit breach.
- Desktop-first layout with responsive horizontal-scroll support for review on smaller screens.
- No formal accessibility certification.
- No internationalization.

## 5. Personas

**Sales trader.** Monitors live requests, opens intervention tickets, reviews reasons, adjusts margin in pips, sends streams or quotes, withdraws/rejects/releases when required, and expects low-friction dense UI.

**Sales-desk manager / observer.** Reviews the workflow during demos and cares about the operational story.

**Client (off-screen).** Initiates quote requests from a separate trading application and receives/accepts/rejects quotes.

## 6. User stories

1. As a sales trader, I want a single screen showing all live deals so I can see what needs attention.
2. As a sales trader, when a deal needs intervention I want visual and audible cues.
3. As a sales trader, I want to mute audible notifications without losing visual cues.
4. As a sales trader, I want to open a ticket and see why auto-pricing failed.
5. As a sales trader, I want streaming and fixed quote modes.
6. As a sales trader, I want to adjust margin in pips with client-price preview.
7. As a sales trader, I want to send a streaming quote and see completion in Historic.
8. As a sales trader, I want to release a ticket back to the desk.
9. As a sales trader, I want to reject a deal when it should not be priced.
10. As a sales trader, I want terminal deals to clear from Active after the configured grace period.
11. As a sales trader, I want an AI-suggested margin and one-line rationale.
12. As a sales trader, I want to see the factors behind the suggestion.
13. As a sales trader, when credit would be breached I want a decline recommendation rather than a wider price.
14. As a demo operator, I want a hidden dev panel for scenario injection.
15. As a developer/reviewer, I want demo scenarios backed by automated E2E tests.

## 7. Success criteria

The demo is successful if the operator can:

1. Open the app at a clean URL and see empty Active/Historic blotters.
2. Trigger Happy Path ESP and see it flow Active → Historic.
3. Trigger Off-Hours Intervention and complete the send-stream path.
4. Trigger Credit Breach and reject the ticket.
5. Trigger Size Limit + Margin Tune and apply the AI suggestion.
6. Toggle mute and verify visual notifications continue.
7. Run `pnpm test:e2e` and see the scenario suite pass.

## 8. Constraints

- Frontend-only and static-host deployable.
- Latest Chrome as primary browser target.
- TypeScript strict, no `any`, ESLint clean.
- CI should run typecheck, lint, unit tests, E2E tests, and build.

## 9. Open questions retained for history

- Whether to use a grid library or a lighter plain layout.
- Whether the dev injector should ship behind `?dev=1`.
- Whether audible notifications should use an asset or WebAudio.
- Whether Historic should be visible by default.

## 10. Out-of-scope items for v1

- Additional product tickets beyond Spot.
- Additional manual-pricing reasons beyond the three demo cases.
- Limit-order tickets.
- Multi-user/take-over of released tickets.
- Audit trail and activity log.
- Real WebSocket transport.
- Real auth.
- Settings panel beyond mute.
- Confirmation tickets launched from Historic rows.
