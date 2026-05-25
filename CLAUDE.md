# CLAUDE.md

Operational instructions for Claude Code. Auto-loaded at every session start. Keep short and current.

## What this is

A frontend prototype of a **sales-trader workstation for FX manual pricing intervention**. Product name: **FX Sales Workstation** (repo: `fx-sales-intervention`). Single-page React app, in-memory state, simulated pricing feed, no backend.

**The build must not reference Caplin anywhere.** No "Caplin" in UI strings, package metadata, comments, the deployed README, code identifiers, or any user-visible text. The internal spec docs under `/docs` reference Caplin URLs for research grounding only — those are not shipped with the build. If anything in the final bundle (including source maps) mentions Caplin, that is a defect.

Industry-standard FX terminology that happens to also be used by Caplin (`Quoted`, `PickedUp`, `Executable`, `Sales Intervention`, `RFS`, `Active Deals Blotter`, etc.) is fine and expected — these are not proprietary to Caplin.

**Source-of-truth docs (research grounding, not shipped):**
- Overview: https://docs.caplin.com/developer/fx-sales/st-sales-intervention
- Architecture: https://docs.caplin.com/developer/fx-sales/st-sales-intervention-architecture
- User interface: https://docs.caplin.com/developer/fx-sales/st-sales-intervention-user-interface
- Implementation (canonical state names + RFS↔SI relationships): https://docs.caplin.com/developer/fx-sales/st-implementing-sales-intervention

Use the canonical state and event names everywhere in code: `Queued`, `PickedUp`, `Executable`, `Quoted`, `TradeConfirmed`, `TraderRejected`, `ClientRejected`, etc. Do not invent friendlier internal names — the display labels in the UI ("INTERVENE", "DONE") are derived from these via `src/features/blotter/statusFromMachines.ts`.

## Stack

- **Build:** Vite 5 + TypeScript 5 (strict mode)
- **UI:** React 18 + Tailwind CSS 3 + `clsx` + `lucide-react` icons
- **State:** Zustand (UI/transient) + XState (deal lifecycle)
- **Grid:** AG-Grid Community 31
- **Test:** Vitest + React Testing Library (unit/component) + Playwright (E2E)
- **Lint/format:** ESLint + Prettier
- **Package manager:** pnpm

## Commands

```bash
pnpm install          # install
pnpm dev              # vite dev server on :5173
pnpm test             # vitest watch
pnpm test:run         # vitest single run (used by CI)
pnpm test:e2e         # playwright headless
pnpm test:e2e:ui      # playwright UI mode
pnpm lint             # eslint
pnpm typecheck        # tsc --noEmit
pnpm build            # production build
pnpm preview          # serve production build on :4173
```

CI must pass `lint`, `typecheck`, `test:run`, `test:e2e` before merge.

## Folder map

```
/src
  /components       Shared dumb components (Button, Pill, Toast, IconButton)
  /features
    /blotter        Active + Historic blotters, row cells, status pills
    /ticket         Spot ticket panels (Reasons, Summary, Pricing, etc.)
    /notifications  Toast manager + audio player + mute toggle
    /dev-injector   Dev-only panel to inject scenarios (hidden behind ?dev=1)
  /services
    /feed           PricingFeed + DealFeed (mock implementations)
    /scenarios      Pre-canned scenario definitions (see 07-scenario-pack.md)
  /state
    /stores         Zustand stores (deals, ui, settings)
    /machines       XState machines (dealMachine, ticketMachine)
  /types            Shared TS types (Deal, Quote, Pair, RejectionReason)
  /lib              Pure utility (pip math, formatters, time helpers)
  /styles           Tailwind config, design tokens
  App.tsx
  main.tsx
/tests
  /unit             Vitest specs (.test.ts)
  /e2e              Playwright specs (.spec.ts)
/docs               This doc pack
```

## Conventions

- **TypeScript strict.** No `any`. No `// @ts-ignore`. If a type is hard, write the type — don't escape.
- **No mutation.** All state updates immutable. Zustand stores use `set(state => ({...}))`.
- **State transitions go through XState.** Never set a deal's status field directly; always send an event to the deal's state machine. See `03-trade-state-model.md`.
- **Pricing math lives in `/lib/pips.ts`.** Do not inline pip/margin math in components.
- **No real network calls.** All `fetch`, `WebSocket`, `EventSource` is banned in `/src`. Anything that looks like I/O must go through `services/feed/`.
- **Money values as `number` in display units, never strings.** Format at the render boundary only.
- **Files under 300 lines.** Split if larger.
- **One default export per file** for components, named exports for utilities.
- **Test colocation:** `Foo.tsx` → `Foo.test.tsx` next to it for component tests; pure logic tests live under `/tests/unit`.

## Critical rules

1. **The product name is "FX Sales Workstation".** No mention of "Caplin" in any shipped artifact (UI text, README on the final repo, comments, package.json, source-map identifiers). Industry-standard FX terms (RFS, Sales Intervention, the state names from `03`) are fine — those are not Caplin-proprietary.
2. **Never call external pricing APIs.** This is a prototype with a simulated feed.
3. **Never persist beyond `sessionStorage`**, and even that only for the mute-toggle and the AI-suggestion dismissal flag.
4. **Audio playback requires a user-gesture unlock.** Wire this on first click anywhere in the app — see `02-functional-spec.md §Notifications`.
5. **The 5-second removal rule for completed/terminal trades is a real spec requirement** — see `02-functional-spec.md §Active Blotter`.
6. **Every state change emits the canonical state name** the E2E tests can observe via `data-si-state` and `data-rfs-state` attributes on the row.
7. **Two machines per deal, not one.** The RFS Trade Model and the Sales Intervention Trade Model are distinct and run in parallel. Implement them as two XState machines coordinated by a parent `dealMachine` actor. See `03-trade-state-model.md §6`.
8. **`*Sent` states are not skippable.** `PickUpSent`, `QuoteSent`, `WithdrawSent`, `HoldSent`, `RejectSent` each take ~250ms (configurable, zeroable in tests) to simulate backend ack.
9. **The AI Margin Suggestion is a pure deterministic function**, not a real model call. See `09-suggestion-engine.md`. It must never reference Caplin or any vendor; the in-UI label is "AI Margin Suggestion" or "Suggested Markup".
10. **Never write to `wiki/` or `raw/`.** Those directories belong to the Wiki Agent (a separate Claude Code session). Your write boundary is `src/`, `tests/`, `scripts/`, `package.json`, and config files at the repo root. If a backlog ticket mentions documentation, that means updating `docs/` — the wiki layer is downstream.

## Hand-off contract with the Wiki Agent

At the end of each phase, after the E2E gate passes, produce your end-of-phase summary in the format defined by `KICKOFF-PROMPT.md`. Save it to `docs/phase-summaries/FXSW-{phase-last-ticket-id}-summary.md` (e.g., `docs/phase-summaries/FXSW-013-summary.md`). This is the source of truth the Wiki Agent will ingest. After saving, your phase is done — the Wiki Agent runs in a separate session and the human invokes it.

(Per-project decision recorded in Phase 0: summaries live in `docs/phase-summaries/` rather than `raw/prs/` so rule §10's write boundary stays strict. The Wiki Agent setup must be told to ingest from this path.)

## Before editing X, read Y

- Anything in `/src/state/machines/` → `03-trade-state-model.md`
- Anything in `/src/services/feed/` → `04-dummy-feed-spec.md`
- Anything in `/src/services/suggestion/` → `09-suggestion-engine.md`
- Anything in `/src/features/ticket/SuggestionPanel.tsx` → `09-suggestion-engine.md` + `05-ui-ux-spec.md §4.5`
- Anything in `/src/features/ticket/` (other) → `02-functional-spec.md §Tickets` + `05-ui-ux-spec.md`
- Anything in `/src/features/blotter/` → `02-functional-spec.md §Blotters` + `05-ui-ux-spec.md §Blotter`
- Adding a new scenario → `07-scenario-pack.md`
- Test file changes → `08-test-plan.md`

## Definition of done (per task)

- TypeScript compiles with no errors and no `any` in changed files.
- Unit tests for any new pure function in `/lib` or `/state`.
- Component tests for any new visible behaviour.
- If the change is in a scenario path, the relevant Playwright test still passes.
- `data-testid` and `data-deal-status` attributes preserved on testable elements.
- No console errors or warnings in dev mode.

## When in doubt

Ask, in this order:
1. Is this in the doc pack? Read it.
2. Is this in the Caplin docs? Cite the URL in your answer.
3. Is this genuinely ambiguous? Surface it as a question, do not guess.
