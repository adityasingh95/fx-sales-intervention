# CLAUDE.md

Operational instructions for Claude Code. Auto-loaded at every session start. Keep short and current.

## What this is

A frontend prototype of a **sales-trader workstation for FX manual pricing intervention**. Product name: **FX Sales Workstation** (repo: `fx-sales-intervention`). Single-page React app, in-memory state, simulated pricing feed, no backend.

## Brand-neutrality rule

No vendor names may appear anywhere in committed source, documentation, package metadata, comments, UI strings, README content, source-map identifiers, wiki/raw content, or generated build output.

Industry-standard FX terminology is allowed and expected: `Queued`, `PickedUp`, `Executable`, `Quoted`, `TradeConfirmed`, `Sales Intervention`, `RFS`, `Active Deals Blotter`, and similar terms are treated as generic workflow terminology.

## Stack

- **Build:** Vite 5 + TypeScript 5 strict mode
- **UI:** React 18 + Tailwind CSS 3 + `clsx` + `lucide-react`
- **State:** Zustand for UI/transient state + XState for deal lifecycle
- **Test:** Vitest + React Testing Library + Playwright
- **Lint/format:** ESLint + Prettier
- **Package manager:** pnpm

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm test:run
pnpm test:e2e
pnpm test:e2e:ui
pnpm lint
pnpm typecheck
pnpm build
pnpm preview
```

CI must pass `lint`, `typecheck`, `test:run`, and `test:e2e` before merge.

## Folder map

```text
/src
  /components       Shared dumb components
  /features
    /blotter        Active + Historic blotters, row cells, status pills
    /ticket         Spot ticket panels
    /notifications  Toast manager + audio player + mute toggle
    /dev-injector   Dev-only panel to inject scenarios
  /services
    /feed           PricingFeed + DealFeed mock implementations
    /scenarios      Pre-canned scenario definitions
    /suggestion     Deterministic AI Margin Suggestion service
  /state
    /stores         Zustand stores
    /machines       XState machines
  /types            Shared TS types
  /lib              Pure utility
  /styles           Tailwind config, design tokens
/tests
  /unit
  /e2e
/docs               Specification and project documentation
/wiki               Synthesized project knowledge, owned by Wiki Agent
/security           Security Agent findings (end-of-phase reviews), agent-owned
```

## Conventions

- **TypeScript strict.** No `any`. No `// @ts-ignore`.
- **No mutation.** State updates must be immutable.
- **State transitions go through XState.** Never set lifecycle state directly.
- **Pricing math lives in `/lib/pips.ts`.** Do not inline pip/margin math in components.
- **`PricingPanel` is a folder** (`src/features/ticket/pricing/`) of sub-components since FXSW-056; the `?dev=v3` (FXSW-048) and `?dev=v4` (FXSW-072, superset of v3) gates live in `src/lib/devVersion.ts`.
- **No real network calls in `/src`.** Anything feed-like must go through `services/feed/`.
- **Money values as numbers in display units, never strings.** Format at render boundary only.
- **Files under 300 lines** unless a documented exception is warranted.
- **Test colocation:** component tests sit near components; pure logic tests live under `/tests/unit` or colocated with service/lib code.

## Critical rules

1. **Product name:** `FX Sales Workstation`.
2. **Brand-neutrality:** no vendor names in committed files or generated output. *Exception (v3):* the external-feed adapter under `src/services/feed/external/` may reference the real market-data provider (incl. its endpoint, which therefore appears in the bundle); all **user-visible** strings stay generic.
3. **Simulated feed only by default.** *Exception (v3, behind `?dev=v3`):* an opt-in runtime reference-mid poller, keyed by a GUI-entered API key held in `sessionStorage`, may call an external provider every 5 min to update the feed anchor. OFF by default; simulation remains the default and the only test/E2E path.
4. **Persistence:** no persistence beyond `sessionStorage`, limited to small UI preferences.
5. **Audio unlock:** WebAudio playback requires a user gesture.
6. **5-second removal rule:** completed/terminal trades stay in Active briefly, then archive to Historic.
7. **Canonical state names:** state names and `data-*` test attributes must stay stable.
8. **Two machines per deal:** RFS and Sales Intervention trade models remain distinct, coordinated by a parent deal machine.
9. **`*Sent` states are not skippable:** simulated acknowledgement states are part of the UX contract.
10. **AI Margin Suggestion is deterministic:** no real model call in this prototype.
11. **Build agent write boundary:** do not write to `wiki/`, `raw/`, or `security/`; `wiki/`+`raw/` are Wiki Agent-owned and `security/` is Security Agent-owned, unless an explicit one-time bootstrap exception is recorded.
12. **Dev-log update:** each implementation task should append a concise entry to `docs/dev-log.md` unless the task is purely metadata cleanup.
13. **v4 gate + bid/ask points (Phase 9+):** bid/ask forward points apply to `?dev=v3` outright forwards and above (v3 forward goldens re-baselined; GA spot + mid sequence unchanged). New instruments — NDF, swap — live behind a new `?dev=v4` gate in `src/lib/devVersion.ts` (superset of v3). `Deal.instrumentType` (`SPOT|OUTRIGHT|NDF|SWAP`) is the instrument discriminator. See `docs/02` §12.
14. **Security Agent (5th agent):** an independent, unprimed reviewer runs at the end of every phase (Phase 9+), writing findings under `security/` only. See `docs/10-security-agent-spec.md`.

## Before editing X, read Y

- `/src/state/machines/` → `docs/03-trade-state-model.md`
- `/src/services/feed/` → `docs/04-dummy-feed-spec.md`
- `/src/services/suggestion/` → `docs/09-suggestion-engine.md`
- `/src/features/ticket/SuggestionPanel.tsx` → `docs/09-suggestion-engine.md` + `docs/05-ui-ux-spec.md`
- `/src/features/ticket/` → `docs/02-functional-spec.md` + `docs/05-ui-ux-spec.md`
- `/src/features/blotter/` → `docs/02-functional-spec.md` + `docs/05-ui-ux-spec.md`
- New scenario → `docs/07-scenario-pack.md`
- Test changes → `docs/08-test-plan.md`

## Definition of done

- TypeScript compiles cleanly.
- Lint passes with zero warnings.
- Unit/component tests pass.
- Relevant Playwright tests pass.
- No console errors or warnings in dev mode.
- Build output is brand-neutral.

## When in doubt

Ask in this order:

1. Is this covered in the doc pack?
2. Is the current code already the source of truth?
3. Is this genuinely ambiguous?
