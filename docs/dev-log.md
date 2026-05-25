# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales
Workstation** prototype. Each entry is the chat-style summary the
agent posted on ticket completion — terse, technical, decision-dense.

This is presentation material for two parallel stories:

1. **The prototype** — a sales-trader workstation for FX manual
   pricing intervention. Single-page React + XState app, simulated
   feed, no backend.
2. **The AI-native development pipeline** — a spec pack
   (`docs/00–09`), `CLAUDE.md` operating rules, a TDD-shaped backlog
   (`docs/BACKLOG.md`), a downstream Wiki Agent hand-off contract,
   and a four-gate guard (`typecheck + lint + test:run + test:e2e`)
   on every commit.

Separate from `docs/phase-summaries/` — those are end-of-phase
hand-off summaries for the Wiki Agent. This is the working journal.
Most recent first.

---

## FXSW-005 · State machine skeletons
**Commit `49bde9a`**

- TDD red→green: all 7 specified tests pass (`siMachine` 4, `rfsMachine` 2, `dealMachine` 1).
- `siMachine` — `Initial → PickUpSent → PickedUp` with a named `ackDelay` (250ms) wired through a delay function so `timings.ackDelayMs = 0` from tests immediately makes the transition synchronous.
- `rfsMachine` — `Queued → PickedUp` on `PickUp`. Minimal subset per AC; the rest lands in FXSW-010.
- `dealMachine` — parent that spawns one of each child on init, sharing `dealId`. All 16 SI events (per `docs/03 §2`) have no-op handlers so callers can already wire up `send` without runtime errors; cross-model coordination is explicitly FXSW-010.
- `timings.ts` is an object (`{ ackDelayMs: 250 }`) — properties are mutable from outside the module, which the synchronous-transition test exercises.
- Each module exports `SnapshotFrom`-derived state-value types.
- All gates green: typecheck, lint, test:run (106 pass / 8 todo).

---

## FXSW-004 · Prebuild reference-mids script
**Commit `1ca6d65`**

- Tests-first: 4 cases covering `round` precision, happy-path inversion (EUR/GBP from `1/rate`; JPY/INR straight), HTTP-non-OK → fallback, fetch-throw → fallback.
- Script `scripts/fetch-reference-mids.ts` — Frankfurter USD-based fetch with a 5s `AbortSignal.timeout`, hard-coded fallback, 0 exit code on either path. Direct-run guard so vitest can import it without side effects.
- `predev` and `prebuild` wired in `package.json` — confirmed both fire (Frankfurter returns 403 in sandbox network, fallback kicks in, file written, exit 0).
- Generated `referenceMids.json` is gitignored (regenerated on every dev/build).
- `scripts/` added to `tsconfig.app.json` include so the script is typechecked by `tsc -b`.
- All four gates: typecheck ✓, lint ✓, test:run ✓ (99 pass / 11 todo), build ✓.

---

## FXSW-003 · Folder structure
**Commit `04c4032`**

- Playwright network retry succeeded — chromium installed cleanly at `/opt/pw-browsers/` (had to re-install for v1.44 after pnpm install pulled the bundled version).
- Created the full `06 §2` folder tree: 65 new placeholder files across `src/components/`, `src/features/{blotter,ticket,notifications,dev-injector}/`, `src/services/{feed,scenarios,suggestion}/`, `src/state/{stores,machines}/`, `src/types/`, `src/lib/`, plus `tests/e2e/{scenarios,notifications}.spec.ts` and `fixtures.ts`. TS/TSX use `export {};`; test files use `it.todo('placeholder')`.
- `@/` → `src/` alias was already wired from FXSW-001; no config change needed.
- Kept `index.html` at repo root (Vite 5 convention) with `public/.gitkeep` so the directory exists.
- All four gates green: `typecheck`, `lint`, `test:run` (95 pass / 11 todo), `test:e2e` (smoke passes).

---

## FXSW-002 · Design tokens + Tailwind config
**Commit `f732331`**

- Every CSS custom property from `docs/05-ui-ux-spec.md §1` lifted into `src/styles/tokens.css`: backgrounds, borders, text, status colors, AI accent family (Cyan/Violet/Teal), functional colors, typography (Geist + Geist Mono via `@fontsource`), spacing, radii, shadows, easings.
- Tailwind theme extended with matching aliases so `bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai` resolve. Hex values duplicated between `tokens.css` (runtime) and `tailwind.config.ts` (build-time) per the FXSW-002 AC's hex assertion.
- The AC originally said "assert computed styles on a rendered probe div" — but jsdom doesn't resolve Tailwind classes or CSS `var()` references in `getComputedStyle`. Pivoted to file-content assertions (49 token cases) plus import-the-config-and-assert-the-shape (45 cases). 94 token-related tests, all green.
- Moved `tailwind.config.ts` out of `tsconfig.node.json` into `tsconfig.app.json` so the config test can import it under the app's project boundary.
- Body sets `tabular-nums` on `.font-mono` so price columns stay aligned.
- All gates green: typecheck, lint, test:run (95 pass).

---

## FXSW-001 · Project scaffolding
**Commit `6999625`**

- Vite 5 + React 18 + TypeScript 5 (strict, no `any`), all dependency versions pinned exactly to `docs/06-tech-architecture.md §1`.
- Full script set wired per `CLAUDE.md`: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:run`, `test:e2e`, `test:e2e:ui`.
- Configs landed: project-reference `tsconfig` with `@/` → `src/` alias, Vite with `VITE_BASE_PATH`-driven base (for the eventual GitHub Pages deploy), Tailwind 3 + PostCSS + Autoprefixer (tokens hold til FXSW-002), Vitest with jsdom + globals + `testing-library/jest-dom` matchers, Playwright chromium-only single-worker on 4173 preview, ESLint 8 with TypeScript + React + react-hooks + react-refresh + Prettier-disable + no-warnings policy, Prettier 3.
- Smoke tests prove the plumbing: `App` is a function (Vite + TS + Vitest pipeline works) and Playwright loads `<body>` (preview + browser launch + assertion works).
- All gates green: typecheck, lint, test:run, e2e.

---

_Older entries (spec pack, Phase 0 decisions) predate any
implementation work; see `docs/BACKLOG.md` and the `00–09` design
docs._
