---
last_updated: 2026-05-26
sources:
  - docs/01-prd.md
  - docs/06-tech-architecture.md
  - docs/08-test-plan.md
  - docs/BACKLOG.md
status: in-progress
---

# Onboarding — FX Sales Workstation

For a new engineer joining the project. Target: from cold open to "I can ship a ticket" inside 30 minutes. This page is a synthesis pointing at the rest of the wiki — read it linearly.

## 1 · What this is

The **FX Sales Workstation** is a single-page frontend prototype of a sales-trader workstation for FX manual pricing intervention. **Sales Intervention (SI)** is the industry term for the workflow: when the bank's auto-pricer rejects a client quote-request, a human sales trader manually prices it. Read [overview.md](overview.md) first.

It is **not** a re-implementation of any vendor product. The state names and workflow shape come from publicly documented FX Sales Intervention specifications, but the prototype is brand-neutral — see [decisions/ADR-0010-brand-neutral-product.md](decisions/ADR-0010-brand-neutral-product.md).

## 2 · How it works at a glance

```
DealFeed (scenario player)  ──►  dealsStore (Zustand)  ──►  ActiveBlotter / Ticket
                                       │
                                       └──►  dealMachine (XState, parent)
                                                 ├──► rfsMachine (RFS Trade Model)
                                                 └──► siMachine  (SI Trade Model)

PricingFeed (300ms tick) ───────────────►  RateCell / PricingPanel (direct subscribe)
```

Two trade models per deal, coordinated by a parent. See [decisions/ADR-0002-two-parallel-state-machines.md](decisions/ADR-0002-two-parallel-state-machines.md). The full data-flow diagram lives in `docs/06-tech-architecture.md` §3.

Five demo scenarios drive every visible feature. Each is a button in the dev injector, a script in the deal feed, and a Playwright test. See [scenarios/](scenarios/).

## 3 · Stack

- **Build:** Vite 5 + TypeScript 5 (strict mode, no `any`)
- **UI:** React 18 + Tailwind CSS 3 + `clsx` + `lucide-react`
- **State:** Zustand (UI/transient) + XState v5 (deal lifecycle) — [decisions/ADR-0003-xstate-zustand.md](decisions/ADR-0003-xstate-zustand.md)
- **Grid:** Plain flex-row table (AG-Grid is in `package.json` but unused — see [decisions/ADR-0004-ag-grid-community.md](decisions/ADR-0004-ag-grid-community.md))
- **Test:** Vitest + React Testing Library + Playwright (chromium-only, single worker)
- **Package manager:** pnpm

Stack rationale: [decisions/ADR-0001-vite-react-tailwind.md](decisions/ADR-0001-vite-react-tailwind.md). Pinned versions in `docs/06-tech-architecture.md` §1.

## 4 · Repo layout

```
/src
  /components       Shared dumb components (Button, Pill, Chip, ...)
  /features
    /blotter        ActiveBlotter, HistoricBlotter, cells, statusFromMachines
    /ticket         TicketPanel + 7 sub-panels (Pending Phase 3)
    /notifications  ToastStack + audio + mute (Pending Phase 5)
    /dev-injector   DevInjector
  /services
    /feed           PricingFeed + DealFeed (mock implementations)
    /scenarios      Definitions + scenario player
    /suggestion     AI margin engine (Pending Phase 4)
  /state
    /stores         Zustand: dealsStore, uiStore, settingsStore
    /machines       XState: rfsMachine, siMachine, dealMachine, timings
  /types            Shared TS types (Deal, Pair, RejectionReason)
  /lib              Pure utilities (pip math, formatters, time)
  /styles           tokens.css, global.css
  App.tsx, main.tsx
/tests
  /unit             Vitest specs
  /e2e              Playwright specs
/docs               Spec pack (build-agent source of truth)
/wiki               Synthesized product knowledge (this directory)
/raw                Wiki-ingest source archive
```

## 5 · Commands

```bash
pnpm install          # install
pnpm dev              # vite dev server on :5173
pnpm test             # vitest watch
pnpm test:run         # vitest single run (CI)
pnpm test:e2e         # playwright headless
pnpm test:e2e:ui      # playwright UI mode
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm build            # production build
pnpm preview          # serve production build on :4173
```

CI must pass `lint`, `typecheck`, `test:run`, `test:e2e` before merge.

## 6 · The three-agent setup

The codebase is maintained by three agents:

| Agent | Session | Writes | Owns |
|---|---|---|---|
| **Build agent** | Claude Code window #1 | `src/`, `tests/`, `scripts/`, config, `docs/` | Implements backlog tickets, runs tests |
| **Human (you)** | Chat / direct | Approvals + scope decisions | Phase gates, routing |
| **Wiki agent** | Claude Code window #2 | `wiki/`, `raw/` | Maintains synthesized product knowledge |

The build agent never writes to `wiki/`. The wiki agent never writes to `src/` or `tests/`. They communicate via files — the build agent saves an end-of-phase summary to `docs/phase-summaries/FXSW-{N}-summary.md` and the wiki agent ingests it. See [WIKI_SCHEMA.md](WIKI_SCHEMA.md) §Hand-off-contract.

Vendor neutrality is enforced at two strictness levels: `/CLAUDE.md` rule §1 (no vendor names in shipped artifacts) and `/wiki/CLAUDE.md` rule §1 (no vendor names anywhere in `wiki/` or `raw/`, even in citation URLs). See [decisions/ADR-0010-brand-neutral-product.md](decisions/ADR-0010-brand-neutral-product.md).

## 7 · Where to start reading

If you're touching:

| Area | Read first |
|---|---|
| The two trade machines | [components/rfs-machine.md](components/rfs-machine.md) + [components/si-machine.md](components/si-machine.md) + [components/deal-machine.md](components/deal-machine.md) + `docs/03-trade-state-model.md` |
| The blotter UI | [features/active-blotter.md](features/active-blotter.md) + [components/status-derivation.md](components/status-derivation.md) |
| The ticket | [features/ticket.md](features/ticket.md) + `docs/02-functional-spec.md` §4 |
| The AI suggestion | [features/ai-margin-suggestion.md](features/ai-margin-suggestion.md) + [components/suggestion-engine.md](components/suggestion-engine.md) |
| The pricing feed | [components/pricing-feed.md](components/pricing-feed.md) + [data-models/price-tick.md](data-models/price-tick.md) |
| Adding a scenario | [scenarios/happy-path-esp.md](scenarios/happy-path-esp.md) (template) + `docs/07-scenario-pack.md` |
| Tests | §8 below + `docs/08-test-plan.md` |

## 8 · Testing

Three layers, three questions:

| Layer | Tool | Question | Coverage floor |
|---|---|---|---|
| Unit | Vitest | Does this pure function compute the right number? | 90% lines on `/lib`, `/state/machines`; 100% branches on `engine.ts` |
| Component | Vitest + RTL | Does this component render the right thing? | 80% lines on `PricingPanel.tsx`, `SuggestionPanel.tsx`; smoke elsewhere |
| E2E | Playwright | Does the user's journey work? | All 5 scenarios + notifications |

Determinism: Playwright pins `window.__seedFeed = 42` (deterministic price walks) and `window.__zeroAckDelay = true` (collapses 250ms `*Sent` delays to 0 — see [decisions/ADR-0009-simulated-ack-delays.md](decisions/ADR-0009-simulated-ack-delays.md)). The 5-second blotter-removal delay is **not** zeroed — real wall-clock assertion.

Tests assert on `data-*` attributes, never on text or color. The test-contract attributes per component live in each feature/component wiki page.

## 9 · Build progression

| Phase | Tickets | What lands | Status |
|---|---|---|---|
| 0 | (pre-build) | Spec pack, backlog, CLAUDE.md | Done |
| 1 | FXSW-001 → FXSW-006 | Scaffold + first hardcoded blotter row | Done |
| 2 | FXSW-007 → FXSW-013 | Pricing feed, deal feed, two-machine deal lifecycle, status derivation, live blotters, dev injector + HAPPY_PATH_ESP E2E | **Done** (current state) |
| 3 | FXSW-014 → FXSW-021 | TicketPanel + sub-panels, footer actions, OFF_HOURS_INTERVENTION E2E | Not started |
| 4 | FXSW-022 → FXSW-027 | AI margin engine, suggestion panel, SIZE_LIMIT + CREDIT_BREACH E2E | Not started |
| 5 | FXSW-028 → FXSW-034 | Notifications, polish, CI, README, Pages deploy, RELEASE_PATH E2E | Not started |

Full backlog: `docs/BACKLOG.md`. Per-ticket implementation notes: `docs/dev-log.md`.

## 10 · The five demo scenarios

Each is a one-click reproducer + an E2E test:

1. [happy-path-esp.md](scenarios/happy-path-esp.md) — auto-priced flow, no SI involvement. **Passing E2E as of Phase 2.**
2. [off-hours-intervention.md](scenarios/off-hours-intervention.md) — canonical SI happy path. Implemented after Phase 3.
3. [credit-breach.md](scenarios/credit-breach.md) — AI credit-decline guardrail + trader reject. Implemented after Phase 4.
4. [size-limit-margin-tune.md](scenarios/size-limit-margin-tune.md) — AI suggestion + Apply. Implemented after Phase 4.
5. [release-path.md](scenarios/release-path.md) — trader hands ticket back to desk. Implemented after Phase 5.

## 11 · Cross-cutting rules

The build agent operates under `/CLAUDE.md`. Critical rules worth knowing:

- TypeScript strict. No `any`, no `// @ts-ignore`.
- No mutation. Zustand stores use immutable updates. State transitions always go through XState — never set a deal's status field directly.
- Pricing math lives in `/src/lib/pips.ts`. Don't inline pip arithmetic in components.
- No real network calls. `fetch`, `WebSocket`, `EventSource` are banned in `/src`.
- No persistence beyond `sessionStorage` (mute toggle + AI-suggestion dismissal flag).
- Audio playback requires a user-gesture unlock — see [features/notifications.md](features/notifications.md#audible-cue).
- `*Sent` SI states are not skippable. The 250ms ack delay is part of the UX fidelity.
- AI Margin Suggestion is a pure deterministic function ([ADR-0006](decisions/ADR-0006-deterministic-suggestion-engine.md)).
- Vendor names forbidden in shipped artifacts ([ADR-0010](decisions/ADR-0010-brand-neutral-product.md)) and in the wiki layer (stricter — see `wiki/CLAUDE.md`).

## 12 · Definition of done (per ticket)

From `/CLAUDE.md`:

- TypeScript compiles, no `any` in changed files.
- Unit tests for any new pure function in `/lib` or `/state`.
- Component tests for any new visible behaviour.
- Playwright still passes for scenarios in scope.
- `data-testid` / `data-deal-status` attributes preserved.
- No console errors / warnings in dev mode.
- A `docs/dev-log.md` entry with user-directed vs agent-directed decision splits + gate counts.

At end of each phase, a summary to `docs/phase-summaries/FXSW-{last-ticket}-summary.md` for the wiki agent to ingest. See `KICKOFF-PROMPT.md` for the format.

## 13 · Glossary

[glossary.md](glossary.md). Read it once cold; it covers Sales Intervention terms, FX market terms, RFS + SI state names, blotter fields, and prototype-only terms.

## Status

This onboarding page is `in-progress` — it'll be rewritten from scratch at end of Phase 5 (FXSW-033 + final wiki sweep) to reflect the shipped state, not the planned state. The build-progression table in §9 is the bit most likely to be stale on any given day.
