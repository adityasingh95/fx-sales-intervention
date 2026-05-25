# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales
Workstation** prototype. Each entry is the chat-style summary the
agent posted on ticket completion — terse bullets, decisions called
out explicitly, gate counts as the trailing bullet.

This is presentation material for two parallel stories:

1. **The prototype** — a sales-trader workstation for FX manual
   pricing intervention. Single-page React + XState app, simulated
   feed, no backend.
2. **The AI-native development pipeline** — a spec pack
   (`docs/00–09`), `CLAUDE.md` operating rules, a TDD-shaped backlog
   (`docs/BACKLOG.md`), a downstream Wiki Agent hand-off contract,
   and a four-gate guard (`typecheck + lint + test:run + test:e2e`)
   on every commit. This log is the artifact that shows the
   pipeline in motion.

Separate from `docs/phase-summaries/` — those are end-of-phase
hand-off summaries for the Wiki Agent. This is the working journal.
Most recent first.

---

## FXSW-005 · State machine skeletons
**Commit `49bde9a`**

- TDD red→green: all 7 specified tests pass (`siMachine` 4, `rfsMachine` 2, `dealMachine` 1).
- `siMachine` — `Initial → PickUpSent → PickedUp` with a named `ackDelay` (250ms) wired through a delay function so `timings.ackDelayMs = 0` from tests immediately makes the transition synchronous.
- `rfsMachine` — `Queued → PickedUp` on `PickUp`. Minimal subset per AC; the rest lands in FXSW-010.
- `dealMachine` — parent that spawns one of each child on init, sharing `dealId` via context.

**Decisions:**
- `timings.ts` exports an **object** (`{ ackDelayMs: 250 }`) not `const ackDelayMs = 250`. ES modules make `const` bindings read-only across module boundaries; one of the TDD specs is "overriding `timings.ackDelayMs = 0` makes the transition synchronous", and object property assignment is the only form that satisfies it.
- Delay is wired via a named `ackDelay` **delay function** (`delays: { ackDelay: () => timings.ackDelayMs }`) rather than a literal `after: { 250: ... }`. XState re-evaluates the function lazily on state entry, so test reassignment takes effect on subsequent transitions without rebuilding the machine.
- Declared no-op handlers for **all 16 SI events** from `docs/03 §2` on the parent up-front (not just the few used in this slice). Lets callers wire `send({ type: 'Quote' })` etc. now without TS errors; the real RFS↔SI cross-model coordination from `docs/03 §3` lands cleanly in FXSW-010 by replacing the no-ops in place.
- Each module exports `SnapshotFrom`-derived state-value types so consumers get inferred types instead of repeating the union.
- All gates green: typecheck, lint, test:run (106 pass / 8 todo).

---

## FXSW-004 · Prebuild reference-mids script
**Commit `1ca6d65`**

- Tests-first: 4 cases covering `round` precision, happy-path inversion (EUR/GBP from `1/rate`; JPY/INR straight), HTTP-non-OK → fallback, fetch-throw → fallback.
- Script `scripts/fetch-reference-mids.ts` — Frankfurter USD-based fetch with a 5s `AbortSignal.timeout`, hard-coded fallback, 0 exit code on either path.
- `predev` and `prebuild` wired in `package.json` — confirmed both fire (Frankfurter returns 403 in sandbox network, fallback kicks in, file written, exit 0).

**Decisions:**
- Bake-at-build, not runtime fetch. `04 §10` was emphatic: a prototype demo shouldn't have a runtime network dependency on a third-party FX API. Daily-resolution source data + a random-walk simulator covers the demo value.
- Frankfurter as primary source (free, USD-based, no key, no signup, ECB-aggregated) with hard-coded values in the script as the fallback. Network failure logs a warning but **never breaks the build**.
- Direct-run guard: `import.meta.url === file://${process.argv[1]}` so vitest can `import { main, round, FALLBACK }` from the script without triggering a real fetch + write on import. Exports `main(outPath)` parameterised on output path so tests use `mkdtemp` and don't clobber the real generated file.
- `referenceMids.json` is **gitignored**, not checked in. It's a build artifact regenerated on every `pnpm dev`/`pnpm build`; checking it in would create noisy daily diffs.
- `scripts/` added to `tsconfig.app.json` include so `tsc -b` covers the new file (it was outside the existing roots).
- All four gates: typecheck ✓, lint ✓, test:run ✓ (99 pass / 11 todo), build ✓.

---

## FXSW-003 · Folder structure
**Commit `04c4032`**

- Playwright network retry succeeded — chromium installed cleanly at `/opt/pw-browsers/` (had to re-install for v1.44 after `pnpm install` pulled the bundled version).
- Created the full `06 §2` folder tree: 65 new placeholder files across `src/components/`, `src/features/{blotter,ticket,notifications,dev-injector}/`, `src/services/{feed,scenarios,suggestion}/`, `src/state/{stores,machines}/`, `src/types/`, `src/lib/`, plus `tests/e2e/{scenarios,notifications}.spec.ts` and `fixtures.ts`.

**Decisions:**
- TS/TSX placeholders use `export {};`; test files (`*.test.ts`) use `it.todo('placeholder')`. Both forms keep typecheck, lint, and vitest green while files wait for real implementations. `it.todo` shows up as a `todo` rather than a failure or a "no tests found" error.
- Kept `index.html` at the **repo root** (Vite 5 convention) rather than moving it under `public/` as the architecture tree shows. Vite's behavior overrides the documentation imprecision; `public/.gitkeep` lets the directory exist for the spec without breaking the bundler.
- Existing `tests/e2e/smoke.spec.ts` (from FXSW-001) kept alongside the three e2e files the architecture lists. Smoke-as-canary stays useful.
- `@/` → `src/` alias was already wired by FXSW-001; the AC's alias-existence check was a no-op.
- All four gates green: typecheck, lint, test:run (95 pass / 11 todo), test:e2e (smoke).

---

## FXSW-002 · Design tokens + Tailwind config
**Commit `f732331`**

- Every CSS custom property from `docs/05-ui-ux-spec.md §1` lifted into `src/styles/tokens.css`: backgrounds, borders, text, status colors, AI accent family (Cyan/Violet/Teal), functional colors, typography (Geist + Geist Mono via `@fontsource`), spacing, radii, shadows, easings.
- Tailwind theme extended with matching aliases so `bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai` resolve.

**Decisions:**
- Hex values **duplicated** between `tokens.css` (runtime) and `tailwind.config.ts` (build-time) — the FXSW-002 AC's hex assertion needs an asserted-against source, and Tailwind can't read CSS custom properties at config-evaluation time. The duplication is intentional, not accidental drift.
- Test approach pivoted from the AC's original "assert computed styles on a rendered probe div" to file-content assertions (49 token cases) plus import-the-config-and-assert-the-shape (45 cases). **jsdom doesn't resolve Tailwind classes or CSS `var()` references in `getComputedStyle`**, so the original AC was untestable as-stated. The pivot preserves the spirit (every documented token has an assertion) without depending on a real browser.
- Moved `tailwind.config.ts` out of `tsconfig.node.json` into `tsconfig.app.json` so the config-shape test can import it under the app's project boundary.
- Body sets `tabular-nums` on `.font-mono` so price columns stay aligned.
- All gates green: typecheck, lint, test:run (95 pass).

---

## FXSW-001 · Project scaffolding
**Commit `6999625`**

- Vite 5 + React 18 + TypeScript 5 (strict, no `any`), all dependency versions pinned exactly to `docs/06-tech-architecture.md §1`.
- Full script set wired per `CLAUDE.md`: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:run`, `test:e2e`, `test:e2e:ui`.
- Configs landed: project-reference `tsconfig` with `@/` → `src/` alias, Vite with `VITE_BASE_PATH`-driven base, Tailwind 3 + PostCSS + Autoprefixer (tokens hold til FXSW-002), Vitest with jsdom + globals + `testing-library/jest-dom`, Playwright chromium-only single-worker on 4173 preview, ESLint 8 + Prettier-disable + no-warnings policy, Prettier 3.
- Smoke tests prove the plumbing: `App` is a function (Vite + TS + Vitest pipeline works) and Playwright loads `<body>` (preview + browser launch + assertion works).

**Decisions:**
- `VITE_BASE_PATH` env-driven base path baked in from day one so the FXSW-034 GitHub Pages deploy doesn't need a config retrofit.
- ESLint runs with `--max-warnings 0`. Warnings fail CI; no gradual-decay rot allowed.
- Playwright pinned to **chromium-only, single-worker**. Multi-browser matrix is out of scope for a prototype; single worker keeps the simulated time-based scenarios deterministic.
- All gates green: typecheck, lint, test:run, e2e.

---

## Phase 0 · Spec pack, backlog, scaffolding (pre-implementation)
**Commits `4ecba9d`, `ac4b8cd`, `1dc1a1f`**

The phase before any code. Sets up everything the FXSW-001+ tickets
draw on. Not a single ticket — a multi-day grounding pass.

- **Spec pack** written into `docs/00-glossary.md` through
  `docs/09-suggestion-engine.md`. Industry-standard FX terminology
  defined, functional spec for tickets + blotters + notifications,
  trade-state model (RFS + Sales Intervention) with full state
  tables and Mermaid diagrams, dummy feed spec, UI/UX spec with
  every design token, tech architecture, scenario pack, test plan,
  AI Margin Suggestion engine.
- **Backlog** at `docs/BACKLOG.md` — 34 tickets (FXSW-001 through
  FXSW-034) across 5 phases. Every ticket has effort estimate (S/M/L),
  TDD heat-level (🔴 strict / 🟡 component-tests / 🟢 e2e-only / —),
  dependency list, doc anchors, acceptance criteria, and TDD test
  list where applicable.
- **`CLAUDE.md`** — operating instructions auto-loaded each session.
  Pinned the stack, the conventions, and ten critical rules
  including "no Caplin in any shipped artifact", the 5-second blotter
  removal rule, the two-machines-per-deal rule, the AI Suggestion is
  a deterministic function (not an LLM call), and the write boundary
  (`src/`, `tests/`, `scripts/`, root config files only — never
  `wiki/` or `raw/` which belong to a separate Wiki Agent).

**Decisions:**
- **Grounded in Caplin's public docs** (the canonical FX Sales /
  Sales Intervention reference) but the build itself **must not
  mention Caplin** anywhere — UI strings, package metadata,
  comments, source-map identifiers, README. Industry-standard FX
  terms (`Quoted`, `PickedUp`, `Executable`, `RFS`, `Sales
  Intervention`, `Active Deals Blotter`) are fine; the vendor name
  is the line.
- Product name decided: **"FX Sales Workstation"**. Repo slug
  renamed from `fx-sales-workstation` to `fx-sales-intervention`
  (commit `ac4b8cd`) to match the underlying functional domain.
  Slug ≠ product name is intentional.
- **Two trade machines per deal**, not one combined. The Caplin
  docs are explicit RFS and SI are distinct models running in
  parallel with documented relationships. Modelling them as a
  single flat machine collapses the design and would lose the v2
  path of swapping the dummy feed for a real Caplin StreamLink
  adapter. Locked in as `CLAUDE.md` rule §7.
- **`*Sent` states are not skippable.** Real backends have ack
  latency. Simulated 200-300ms delay on every `PickUpSent`,
  `QuoteSent`, `WithdrawSent`, `HoldSent`, `RejectSent` — zeroable
  in tests but always present in dev/demo. UX fidelity decision.
- **AI Margin Suggestion is a pure deterministic function**, not a
  real model call. `docs/09-suggestion-engine.md` is the rule book;
  the in-UI label is "AI Margin Suggestion" / "Suggested Markup".
  Avoids vendor lock-in, latency, billing, and non-determinism in
  the demo path.
- **Reference FX mids baked at build time** (`04 §10`) — not
  fetched at runtime. No runtime third-party API dependency means
  no flaky demos. The `prebuild` script (FXSW-004) is the
  implementation.
- **Hand-off contract with the Wiki Agent**: phase summaries land
  in `docs/phase-summaries/FXSW-{phase-last-ticket-id}-summary.md`,
  **not** in `raw/prs/`, so `CLAUDE.md` rule §10's write boundary
  stays strict (the implementation agent never writes to `wiki/`
  or `raw/`). The Wiki Agent runs in a separate Claude Code session
  and ingests from `docs/phase-summaries/`.
- **Branch model**: each Claude Code web session gets a fresh
  branch (`claude/<adjective-noun>-<id>`). No direct main commits;
  PRs at consolidation points. Session-1 worked on
  `claude/friendly-keller-OruRa`, session-2 on
  `claude/vigilant-einstein-Dtads`.

No gates at this stage — no code yet. The spec pack itself is the
deliverable, and it's the single grounding source FXSW-001+ all
cite.

---

_Older entries (the bare repo + the initial spec-pack import) are
visible in `git log` directly._
