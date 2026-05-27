---
last_updated: 2026-05-26
sources:
  - docs/01-prd.md
  - docs/06-tech-architecture.md
  - docs/08-test-plan.md
  - docs/BACKLOG.md
  - docs/dev-log.md
  - docs/phase-summaries/FXSW-013-summary.md
  - docs/phase-summaries/FXSW-021-summary.md
  - docs/phase-summaries/FXSW-027-summary.md
  - docs/phase-summaries/FXSW-033-summary.md
status: stable
---

# Onboarding — FX Sales Workstation

Joining the team on Monday? Read this end-to-end. By the time you finish you should know what the product is, how the codebase is organised, how to run it, where to start reading for any given task, and the load-bearing conventions that the build agreed on across five phases.

The wider wiki is the long form. This page is the entry point.

---

## 1 · What this is

A **single-page frontend prototype of a sales-trader workstation for FX manual pricing intervention**. The industry term is **Sales Intervention (SI)** — the workflow in which a human sales trader manually prices a client quote-request that the bank's auto-pricer rejected or chose not to handle.

Built as a one-week showcase of an LLM-native development pipeline. **Not** a re-implementation of any vendor product — see [overview.md](overview.md) for the brand-neutrality context and [decisions/ADR-0010-brand-neutral-product.md](decisions/ADR-0010-brand-neutral-product.md) for the strict layering of that rule. Industry-standard FX terminology (RFS, Sales Intervention, the canonical state names) is fair game; vendor identity is not.

## 2 · The four-minute demo

Open the live URL with `?dev=1`. The dev-injector strip across the header is the demo control. Click each in order:

| Inject | What to watch |
|---|---|
| `HAPPY_PATH_ESP` | Row appears with `AUTO` status (auto-priced), flips to `DONE` after 2s, dims, vanishes from Active 5s later, lands in Historic. No trader involvement. |
| `OFF_HOURS_INTERVENTION` | Toast + title-`●` + amber row + chime fire. Click the row → ticket slides in → hold `Send Stream` 600ms → row flips to `STREAMING` → client accepts after 1.5s → `DONE` → Historic. |
| `CREDIT_BREACH` | Same notification cues. Open ticket → AI panel shows **credit-decline guardrail** with a Reject shortcut (no margin proposed). Hold `Reject` 600ms → `REJECTED` → Historic. |
| `SIZE_LIMIT_MARGIN_TUNE` | Open ticket → AI suggests **4 pips** with High confidence and a rationale mentioning "Gold-tier" + "12M EURUSD" → click `Apply` → margin animates to 4 with indigo outline glow → hold Send Stream → client accepts → DONE. |
| `RELEASE_PATH` | Open ticket → click `Release` → ticket closes, row returns to `INTERVENE`, `Dealable=true` again. Deal stays in Active indefinitely. |
| Mute toggle | Bell icon in header. Click silences the chime but visual cues continue. Persists across reload via `sessionStorage`. |

Each row demonstrates a different slice — ESP path, full SI happy path, credit guardrail, AI Apply, Release, audio gating. Together they hit every visible code path in the prototype.

## 3 · How it works at a glance

```
DealFeed (scenario player)  ──►  dealsStore (Zustand)  ──►  ActiveBlotter / Ticket / Toast
                                       │
                                       └──►  dealMachine (XState parent, one per deal)
                                                 ├──► rfsMachine (RFS Trade Model)
                                                 └──► siMachine  (SI Trade Model, with *Sent ack delays)

PricingFeed (300ms tick) ───────────────►  usePrice() hook  ──►  RateCell / PricingPanel
                                            (direct subscribe — bypasses Zustand)

User actions  ──►  forwardEvent → parent dealMachine → fans to both child machines

notificationsStore  ◄─── dealsStore subscription (dispatcher)
useNotificationSound() subscribes to notifiedDealIds.size  ──►  chime via WebAudio
```

**Two state machines per deal**, coordinated by a parent. Always. See [decisions/ADR-0002-two-parallel-state-machines.md](decisions/ADR-0002-two-parallel-state-machines.md).

The full data-flow diagram lives in `docs/06-tech-architecture.md` §3.

## 4 · Stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, zero config at this scale. See [ADR-0001](decisions/ADR-0001-vite-react-tailwind.md). |
| Language | **TypeScript 5 strict, no `any`** | Catches FX precision bugs early. |
| UI | **React 18** | Hooks + concurrent features. |
| Style | **Tailwind 3 + design tokens** + `clsx` + `lucide-react` icons | Tokens are the design system; Tailwind is the velocity layer. |
| State (UI/transient) | **Zustand** | Tiny, no provider hell, selector-friendly. |
| State (deal lifecycle) | **XState v5** | The trade model is a state machine — use the right tool. See [ADR-0003](decisions/ADR-0003-xstate-zustand.md). |
| Tables | **Plain flex-row table** | AG-Grid is in `package.json` but unused on deploy. See [ADR-0004 superseded](decisions/ADR-0004-ag-grid-community.md) for the spec-vs-toolchain reconciliation. |
| Unit/component tests | **Vitest** + **React Testing Library** | Vite-native, same module graph as the app. |
| E2E | **Playwright** (Chromium, single worker) | Best-in-class for finance UIs; auto-waits, deterministic with seed pinning. |
| Package manager | **pnpm 10** | Pinned via `packageManager` field. |

No `lodash`, `date-fns`, `axios`, `redux`/`mobx`/`jotai`, or CSS-in-JS. Five external library imports across the entire app: `react`, `xstate`, `zustand`, `clsx`, `lucide-react`. **No new deps were added in Phases 2-5** — the pinned-stack discipline held across the full build.

Pinned versions live in `docs/06-tech-architecture.md` §1.

## 5 · Repo layout

```
/src
  /components       Shared dumb components (Button, HoldButton, Pill, Chip, ...)
  /features
    /blotter        ActiveBlotter, HistoricBlotter, statusFromMachines, cells
    /ticket         TicketPanel + 7 sub-panels (Reasons, Summary, Suggestion, Pricing, ClientSummary, DealSummary, Footer)
    /notifications  ToastStack, MuteToggle, useNotificationSound, titleFlash, dispatcher
    /dev-injector   DevInjector
  /services
    /feed           PricingFeed, DealFeed, usePrice hook
    /scenarios      Definitions + scenario player
    /suggestion     AI margin engine, rationale builder, clientProfiles, marketContext
  /state
    /stores         Zustand: dealsStore, uiStore, settingsStore, notificationsStore
    /machines       XState: rfsMachine, siMachine, dealMachine, timings
  /types            Shared TS types (Deal, Pair, RejectionReason)
  /lib              Pure utilities (pips, format, time)
  /styles           tokens.css, global.css (with row-flash + holdgrow keyframes)
  App.tsx, main.tsx
/tests
  /unit             Vitest specs not colocated with a single source file
  /e2e              Playwright specs (6 scenarios + smoke)
/scripts            Build-time tooling (fetch-reference-mids.ts, resolveBasePath.ts)
/docs               Spec pack (build-agent source of truth) + dev-log + phase-summaries
/wiki               Synthesized product knowledge (this directory) — wiki-agent territory
/raw                Wiki-ingest source archive — wiki-agent territory
.github/workflows   ci.yml (Phase 5) + deploy.yml (Phase 1, FXSW-034)
```

Closer mapping per area: `docs/06-tech-architecture.md` §2.

## 6 · Commands

```bash
pnpm install          # one-time setup
pnpm dev              # vite dev server on :5173 (runs predev → fetch-reference-mids)
pnpm test             # vitest watch
pnpm test:run         # vitest single run (CI uses this)
pnpm test:e2e         # playwright headless against the production build at :4173
pnpm test:e2e:ui      # playwright UI mode for debugging
pnpm lint             # eslint with --max-warnings 0
pnpm typecheck        # tsc --noEmit
pnpm build            # production build (runs prebuild → fetch-reference-mids)
pnpm preview          # serve dist/ at :4173
```

CI must pass `typecheck` + `lint` + `test:run` + `test:e2e` before merge. The total budget is 5 minutes; current Phase 5 runtime is well under (unit ~3s, Playwright 6 specs in 35.9s, install dominates).

## 7 · The three-agent setup

The codebase is maintained by three coordinated agents:

| Agent | Session | Owns | Reads |
|---|---|---|---|
| **Build agent** | Claude Code window #1 | `src/`, `tests/`, `scripts/`, `package.json`, config files, `docs/` | All |
| **You (human)** | Chat / direct | Phase gates, scope decisions, routing | All |
| **Wiki agent** | Claude Code window #2 | `wiki/`, `raw/` | All |

The build agent **never** writes to `wiki/`. The wiki agent **never** writes to `src/`, `tests/`, or `docs/`. They communicate via files — the build agent saves an end-of-phase summary to `docs/phase-summaries/FXSW-{N}-summary.md` and the wiki agent ingests it.

Vendor neutrality is enforced at two strictness levels: `/CLAUDE.md` rule §1 (no vendor names in shipped artifacts) and `/wiki/CLAUDE.md` rule §1 (no vendor names anywhere in `wiki/` or `raw/`, including citation URLs). See [decisions/ADR-0010-brand-neutral-product.md](decisions/ADR-0010-brand-neutral-product.md).

## 8 · Where to start reading

| Touching | Read first |
|---|---|
| Either trade machine, or the parent coordination | [components/rfs-machine.md](components/rfs-machine.md) + [components/si-machine.md](components/si-machine.md) + [components/deal-machine.md](components/deal-machine.md) + `docs/03-trade-state-model.md` |
| The display-status pill on the blotter | [components/status-derivation.md](components/status-derivation.md) (and the §6 mapping table in `docs/03`) |
| Active or Historic blotter | [features/active-blotter.md](features/active-blotter.md) / [features/historic-blotter.md](features/historic-blotter.md) |
| The ticket panel or any sub-panel | [features/ticket.md](features/ticket.md) + `docs/02-functional-spec.md` §4 |
| The AI Margin Suggestion | [features/ai-margin-suggestion.md](features/ai-margin-suggestion.md) + [components/suggestion-engine.md](components/suggestion-engine.md) + `docs/09-suggestion-engine.md` |
| The pricing feed | [components/pricing-feed.md](components/pricing-feed.md) + [data-models/price-tick.md](data-models/price-tick.md) |
| The deal feed or scenario player | [components/deal-feed.md](components/deal-feed.md) + [components/scenario-player.md](components/scenario-player.md) |
| Notifications (toast, chime, mute) | [features/notifications.md](features/notifications.md) |
| Adding a new demo scenario | An existing scenario page like [scenarios/happy-path-esp.md](scenarios/happy-path-esp.md) + `docs/07-scenario-pack.md` + `src/services/scenarios/definitions.ts` |
| Anything to do with money / pip math | `src/lib/pips.ts` (the only place this lives) + the FXSW-019 dev-log entry |
| Tests / patterns / fixtures | §9 below + [components/test-patterns.md](components/test-patterns.md) + `docs/08-test-plan.md` |
| State persistence / mute / sessionStorage | [features/notifications.md](features/notifications.md) §Mute-toggle + `/CLAUDE.md` rule §3 |
| The deploy workflow or Pages env | `docs/06-tech-architecture.md` §7.1 + `docs/dev-log.md` FXSW-034 entry |

## 9 · Testing

Three layers, three questions:

| Layer | Tool | Question | Coverage floor |
|---|---|---|---|
| Unit | Vitest | Does this pure function compute the right number? | 90% lines on `/lib`, `/state/machines`; **100% branches on `engine.ts`** |
| Component | Vitest + React Testing Library | Does this component render the right thing? | 80% on `PricingPanel.tsx`, `SuggestionPanel.tsx`; smoke elsewhere |
| E2E | Playwright | Does the user's journey work? | All 5 scenarios + smoke |

**Phase 5 totals:** 316 unit cases pass · 6 E2Es pass in 35.9s · CI runs all four gates in under 5 minutes.

**Determinism**:
- Playwright pins `window.__seedFeed = 42` via `addInitScript` so price walks are reproducible.
- Playwright also pins `window.__zeroAckDelay = true`, which `main.tsx` reads at boot to set `timings.ackDelayMs = 0` — collapses 250ms `*Sent` transitions to instant. See [ADR-0009](decisions/ADR-0009-simulated-ack-delays.md).
- **The 5-second blotter-removal delay is NOT zeroed** — real wall-clock UX behaviour the demo + tests both depend on.

Tests assert on **`data-*` attributes**, never on text or color. Text and color may change; the testids and canonical state names should not. Each component/feature wiki page has a `## Tests` section listing the actual file paths, case counts, and 1-line category summaries.

**Read [components/test-patterns.md](components/test-patterns.md) before writing your first new test.** It documents the 11 recurring patterns this codebase uses: seed pinning (Vitest + Playwright forms), fake timers for `*Sent`, hold-to-confirm with pointer events + double-click, the Harness pattern for testing components consuming lifted state, state-gate vs time-gate scenario follow-ups, subscribe-to-children for XState v5, `queueMicrotask` for actor cleanup, cell-testid scoping (the number+unit pitfall), throwaway debug spec pattern, `data-*` over text/color, idempotent setup/teardown.

The wider strategy + acceptance criteria + CI config live in `docs/08-test-plan.md`.

## 10 · The five demo scenarios

Each is a one-click reproducer + a passing E2E test.

| ID | Spec | E2E file | Runtime | Ticket |
|---|---|---|---|---|
| `HAPPY_PATH_ESP` | [happy-path-esp.md](scenarios/happy-path-esp.md) | `tests/e2e/happy-path-esp.spec.ts` | 8.0s | FXSW-013 |
| `OFF_HOURS_INTERVENTION` | [off-hours-intervention.md](scenarios/off-hours-intervention.md) | `tests/e2e/off-hours-intervention.spec.ts` | 8.2s | FXSW-021 |
| `CREDIT_BREACH` | [credit-breach.md](scenarios/credit-breach.md) | `tests/e2e/credit-breach.spec.ts` | 7.4s | FXSW-027 |
| `SIZE_LIMIT_MARGIN_TUNE` | [size-limit-margin-tune.md](scenarios/size-limit-margin-tune.md) | `tests/e2e/size-limit-margin-tune.spec.ts` | 9.3s | FXSW-027 |
| `RELEASE_PATH` | [release-path.md](scenarios/release-path.md) | `tests/e2e/release-path.spec.ts` | 0.7s | FXSW-031 |
| (smoke) | — | `tests/e2e/smoke.spec.ts` | 0.2s | FXSW-001 |

Each Gherkin scenario in `docs/07-scenario-pack.md` is the single source of truth for its E2E. Toast + document-title-prefix assertions live in the SI scenarios (added in FXSW-028).

## 11 · Cross-cutting conventions

Operating rules from `/CLAUDE.md` that matter beyond a single ticket:

- **TypeScript strict.** No `any`. No `// @ts-ignore`. If a type is hard, write the type — don't escape.
- **No mutation.** Zustand stores use immutable updates (`set(state => ({...}))`, `new Map(...)` for Maps). State transitions always go through XState — never set a deal's status field directly.
- **Pricing / date math lives in `/src/lib/`.** Don't inline pip arithmetic or T+2 settlement math in components.
- **No real network calls.** `fetch`, `WebSocket`, `EventSource` are banned in `/src`. The only network call in the entire codebase is the build-time `prebuild` Frankfurter fetch in `scripts/fetch-reference-mids.ts`, and it has a hard-coded fallback (see [ADR-0005](decisions/ADR-0005-bake-reference-mids.md)).
- **No persistence beyond `sessionStorage`**, and even that only for the mute toggle (and any future AI-suggestion dismissal flag).
- **Audio playback requires a user-gesture unlock.** See [features/notifications.md](features/notifications.md) §Audible-cue.
- **`*Sent` SI states are not skippable.** The 250ms ack delay is part of the UX fidelity ([ADR-0009](decisions/ADR-0009-simulated-ack-delays.md)).
- **AI Margin Suggestion is a pure deterministic function** ([ADR-0006](decisions/ADR-0006-deterministic-suggestion-engine.md)), not an API call. The "AI" label is real-trader vernacular; the implementation is rule-based.
- **Credit-breach short-circuits to recommend-decline**, not wider pricing ([ADR-0007](decisions/ADR-0007-credit-breach-recommend-decline.md)). Guardrail, not gas pedal.
- **Vendor names forbidden in shipped artifacts** ([ADR-0010](decisions/ADR-0010-brand-neutral-product.md)) and (stricter) anywhere in `wiki/` or `raw/` — see `/wiki/CLAUDE.md` rule §1.
- **Indigo-violet accent reserved exclusively for AI surfaces** ([ADR-0008](decisions/ADR-0008-ai-indigo-accent.md)).
- **Files under 300 lines.** Split if larger.
- **Test colocation:** `Foo.tsx` → `Foo.test.tsx` next to it for component tests; pure-logic tests live under `/tests/unit/`.

## 12 · Definition of done (per ticket)

From `/CLAUDE.md`:

- TypeScript compiles, no `any` in changed files.
- Unit tests for any new pure function in `/lib` or `/state`.
- Component tests for any new visible behaviour.
- Playwright still passes for scenarios in scope.
- `data-testid` / `data-si-state` / `data-rfs-state` / etc. attributes preserved.
- No console errors / warnings in dev mode.
- A `docs/dev-log.md` entry with **user-directed vs agent-directed decision splits** + gate counts.

At end of each phase, the build agent saves a summary to `docs/phase-summaries/FXSW-{last-ticket}-summary.md` for the wiki agent to ingest. The wiki agent re-runs a full lint (vendor neutrality, code-drift on pip values + scenario data + client profiles, data-testid + component naming, cross-references, orphans).

## 13 · Build progression — what landed when

| Phase | Tickets | Headline output | Closed | Wiki ingest |
|---|---|---|---|---|
| 0 | (pre-build) | Spec pack (`docs/00`–`docs/09`), backlog, `CLAUDE.md`, kickoff prompt | ☑ | initial 13-source ingest |
| 1 | FXSW-001 → FXSW-006 + FXSW-034 (pulled forward) | Scaffold, design tokens, folder structure, prebuild reference mids, state-machine skeletons, AppShell + hardcoded blotter row, GitHub Pages deploy | ☑ | n/a |
| 2 | FXSW-007 → FXSW-013 | PricingFeed, DealFeed + scenario player, dealsStore + machine spawning, dealMachine cross-model coordination, statusFromMachines, live blotters + 5s removal, DevInjector + HAPPY_PATH_ESP E2E | ☑ | `FXSW-013-summary.md` |
| 3 | FXSW-014 → FXSW-021 | TicketPanel shell, ReasonsPanel, Summary + DealSummary, PricingPanel (streaming + fixed), ClientSummaryPanel + pips lib, TicketFooter + `*Sent → *Ack` flow, OFF_HOURS_INTERVENTION E2E | ☑ | `FXSW-021-summary.md` |
| 4 | FXSW-022 → FXSW-027 | clientProfiles, suggestion engine (100% branch), rationale builder, SuggestionPanel ready/applied/Undo, credit-decline + Recompute, SIZE_LIMIT + CREDIT_BREACH E2Es | ☑ | `FXSW-027-summary.md` |
| 5 | FXSW-028 → FXSW-033 | Notifications visual layer (toast + title + row flash), audio chime + mute + settingsStore, Button + HoldButton lift to `src/components/`, RELEASE_PATH E2E, CI workflow, README polish | ☑ | `FXSW-033-summary.md` (this ingest) |

Total: 33 tickets, 5 phases, ~5 working days for the build agent. **No new dependencies added in Phases 2-5.**

Per-ticket implementation notes live in `docs/dev-log.md` (terse bullets, **user-directed vs agent-directed decisions** split, gate counts as the trailing bullet). The decision-split convention is what makes the log presentation material — it shows where the agent had autonomy under doc-pack guidance vs where it correctly escalated to the human.

## 14 · Lessons that survived the build

Patterns that were learned the hard way and now live in code or wiki:

- **Seed-42 half-spread rounding asymmetry.** EURUSD tick 1: mid rounds to 1.1715, bid rounds to **1.1714** (the `mid_float - 0.000025` lands below the rounding boundary). Caught FXSW-017. The lesson: golden sequences that lock the mid don't necessarily lock bid/ask. See [test-patterns.md](components/test-patterns.md) §1.
- **Pips-span testid scoping.** `data-testid="suggestion-pips"` wrapping `{value}<span>pips</span>` returned text `"4pips"`, not `"4"`. Lift the unit label to a sibling. [test-patterns.md](components/test-patterns.md) §8.
- **Neutral prior for missing data.** Halcyon's `recent30dAcceptanceRate` would have triggered the engine's `< 0.4` penalty if encoded as 0. Used 0.5 (neutral half) instead. See [data-models/client-profile.md](data-models/client-profile.md) §Halcyon's-recent30dAcceptanceRate.
- **AG-Grid was spec'd; flex-row table shipped.** No first-class API for per-row `data-*` attributes in AG-Grid 31, which broke the test contract. ADR-0004 marked superseded as a worked example of [spec-vs-toolchain reconciliation](decisions/ADR-0004-ag-grid-community.md).
- **XState v5 `setup({...}).createMachine` generic narrowing rejects helper factories.** The parent dealMachine's 16-event handler is verbose-but-inline rather than DRY-but-`any`. See `docs/dev-log.md` FXSW-010 entry.
- **`timings.ackDelayMs` is a mutable object property, not a `const`.** ES module `const` bindings are read-only across module boundaries, which would break the test override pattern. See [ADR-0009](decisions/ADR-0009-simulated-ack-delays.md).
- **`queueMicrotask` for `actor.stop()` inside subscription callback.** Stopping an actor inside its own subscription would interrupt the current transition. The microtask defer is the smallest-possible delay. [test-patterns.md](components/test-patterns.md) §7.
- **The two-machine model required a synthetic ESP terminal coordination.** ESP deals keep SI at `Initial` forever, so the parent fires a guarded `Initial → TradeConfirmed` transition on the SI machine when RFS confirms. Keeps the "every deal has both machines reach a terminal" invariant. See [components/rfs-machine.md](components/rfs-machine.md) §ESP-terminal-coordination.
- **HoldButton's hold-OR-double-click semantics** mean two single clicks (each cancelled by `pointerUp`) still register as a `dblclick` at the DOM level. No timing math needed for the alt-confirm path. [test-patterns.md](components/test-patterns.md) §3.
- **One chime per new deal**, gated by `notifiedDealIds.size` growth. The dispatcher only ever adds to the Set, so size growth uniquely identifies "new". O(1) signal.
- **Per-project hand-off override.** Phase summaries live in `docs/phase-summaries/` (build-agent territory), not `raw/prs/` (the dev-wiki methodology default). Keeps the build agent's write boundary strict — `/CLAUDE.md` rule §10 forbids them writing to `wiki/` or `raw/`. Recorded in `wiki/WIKI_SCHEMA.md` §Hand-off-contract.

## 15 · The glossary

[glossary.md](glossary.md). Read it once cold; it covers Sales Intervention terms, FX market terms, RFS + SI state names, blotter fields, and prototype-only terms in a single page.

---

## After you've read this

You should be able to:

- Open the live URL, run all five scenarios from memory, and explain what's happening in each.
- Pick any wiki page and trace it back to the spec section it grounds in.
- Pick any source file and know which wiki page documents it.
- Write a new component test using the right pattern from [test-patterns.md](components/test-patterns.md) without hunting for examples.
- Spot a spec-vs-implementation drift and know whether to fix the code, the wiki, or both.

If you can't, this page is the bug — open the wiki agent and ask for the gap to be filled.
