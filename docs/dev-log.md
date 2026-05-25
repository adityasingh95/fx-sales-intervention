# Dev Log

A chronological, ticket-by-ticket log of build progress on the FX Sales
Workstation. Each entry is a self-contained summary suitable for lifting
into a presentation, retrospective, or stand-up — what shipped, the
non-obvious decisions, and the gates at the time of commit.

This is **distinct** from `docs/phase-summaries/`: those files are the
end-of-phase hand-off contract for the Wiki Agent (see `CLAUDE.md`
"Hand-off contract" section). This log is the working journal.

Entries are appended on every ticket completion. Most recent first.

---

## FXSW-005 · State machine skeletons
**Commit:** `49bde9a` · **Phase:** 1 · **Effort:** M · **TDD:** 🔴

Three XState 5 machines covering the bare slice we need before wiring
the blotter and ticket. The full state set lands in FXSW-010.

- **`siMachine`** — `Initial → PickUpSent → PickedUp` with the 250ms
  simulated ack as an `after: { ackDelay }` transition.
- **`rfsMachine`** — `Queued → PickedUp` on `PickUp`.
- **`dealMachine`** — parent actor that spawns one `rfsMachine` + one
  `siMachine` on init, both sharing the deal's id via context. Declares
  no-op handlers for every SI event from `docs/03 §2` so callers can
  already `send({ type: 'Quote' })` etc.; the real RFS↔SI cross-model
  coordination from `docs/03 §3` / `CLAUDE.md` rule §7 is FXSW-010.

**Non-obvious decisions**
- `timings.ts` exports an **object** (`{ ackDelayMs: 250 }`) rather than
  `const ackDelayMs = 250`. ES modules make `const` bindings read-only
  across module boundaries, so a const wouldn't satisfy the AC's
  "overridable from tests by reassignment". Object property assignment
  works.
- The delay is wired into the machine via a named `ackDelay` delay
  *function* (`delays: { ackDelay: () => timings.ackDelayMs }`).
  XState re-evaluates this lazily on state entry, so reassigning
  `timings.ackDelayMs = 0` from a test takes effect on subsequent
  transitions without rebuilding the machine.
- Each module exports `SnapshotFrom`-derived state-value types so
  consumers can do `SiStateValue` / `RfsStateValue` without re-typing.

**Tests added:** 7 (siMachine 4, rfsMachine 2, dealMachine 1) — all
TDD-red first, then green.

**Gates at commit:** typecheck ✓ · lint ✓ · test:run ✓ (106 pass / 8 todo)

---

## FXSW-004 · Prebuild reference-mids script
**Commit:** `1ca6d65` · **Phase:** 1 · **Effort:** S · **TDD:** 🔴

`scripts/fetch-reference-mids.ts` hits Frankfurter (USD-based, free,
no key) and writes `src/services/feed/referenceMids.json` with the
USD-based mids the PricingFeed will anchor its random walk to. Wired
as `predev` and `prebuild` so the file is fresh on every dev/build
cycle. On any failure path (HTTP non-OK, timeout, network throw) the
script logs a warning, writes a hard-coded fallback payload, and exits
0 so demos never break on a flaky API.

**Non-obvious decisions**
- Frankfurter returns USD-based rates where `rates.EUR = 0.85361` means
  "1 USD = 0.85361 EUR". For quote-style pairs (EURUSD, GBPUSD) the
  script inverts (`1 / data.rates.EUR`, rounded to 4dp). JPY/INR are
  taken straight (2dp).
- The script's direct-run is guarded by
  `import.meta.url === file://${process.argv[1]}` so vitest can import
  the module's exports (`main`, `round`, `FALLBACK`) without triggering
  a real fetch + write on import.
- The generated JSON is **gitignored** — it's a build artifact, and
  prebuild regenerates it on every dev/build. Avoids noisy daily diffs.
- `scripts/` was added to `tsconfig.app.json` include so `tsc -b`
  covers the new file.

**Sandbox note:** Frankfurter is blocked (HTTP 403) from the web
sandbox's egress policy, so every run here exercises the fallback
path. The user verified the happy path needs to be tested locally with
real network — when run elsewhere, the fallback is the safety net.

**Tests added:** 4 — `round` precision, happy-path inversion shape,
HTTP-non-OK → fallback, fetch-throw → fallback. Uses `vi.stubGlobal`
on `fetch` and a `mkdtemp` for output path isolation.

**Gates at commit:** typecheck ✓ · lint ✓ · test:run ✓ (99 pass / 11 todo) · build ✓

---

## FXSW-003 · Folder structure
**Commit:** `04c4032` · **Phase:** 1 · **Effort:** S · **TDD:** —

Created the full directory + placeholder file tree from
`docs/06-tech-architecture.md §2`. 65 new files: TS/TSX use
`export {};`, test files use `it.todo('placeholder')` so typecheck,
lint, and the unit test runner stay green while the files wait for
real implementations.

**Non-obvious decisions**
- The spec doc shows `public/index.html`, but Vite 5 uses a root
  `index.html` (placed by FXSW-001). Kept it there and created
  `public/.gitkeep` so the directory exists per the AC without
  breaking Vite's convention.
- Existing `tests/e2e/smoke.spec.ts` (from FXSW-001) preserved
  alongside the three spec files listed in the architecture tree.
- Path alias `@/` → `src/` was already wired by FXSW-001; the AC's
  alias-existence check was a no-op.

**Tests added:** none — structural ticket.

**Gates at commit:** typecheck ✓ · lint ✓ · test:run ✓ (95 pass / 11 todo) · e2e ✓

---

## FXSW-002 · Design tokens + Tailwind config
**Commit:** `f732331` · **Phase:** 1 · **Effort:** S · **TDD:** 🟢

Every CSS custom property from `docs/05-ui-ux-spec.md §1` declared in
`src/styles/tokens.css`: backgrounds, borders, text, status colors,
AI accent family, functional colors, typography (Geist + Geist Mono
via `@fontsource`), spacing, radii, shadows, easings.

Tailwind theme extended with matching token aliases so utility classes
like `bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai`
resolve to the documented values. Hex values are duplicated between
`tokens.css` (runtime) and `tailwind.config.ts` (build-time).

**Non-obvious decisions**
- The AC describes asserting computed styles on a rendered probe `div`,
  but **jsdom doesn't resolve Tailwind classes or CSS `var()`
  references in `getComputedStyle`**. Tokens tests use file-content
  assertions instead (49 cases). Tailwind config tested by importing
  the config module and asserting the extend shape (45 cases).
- Geist 400/500/600 + Geist Mono 400/500 loaded via `@fontsource`.
  Body sets `tabular-nums` on `.font-mono` so price columns stay
  aligned.
- Moved `tailwind.config.ts` out of `tsconfig.node.json` into
  `tsconfig.app.json` so the config-shape test can import it under the
  app project boundary.

**Tests added:** 94 (49 tokens + 45 tailwind config).

**Gates at commit:** typecheck ✓ · lint ✓ · test:run ✓ (95 pass)

---

## FXSW-001 · Project scaffolding
**Commit:** `6999625` · **Phase:** 1 · **Effort:** M · **TDD:** 🟡

Vite 5 + React 18 + TypeScript 5 (strict) with all dependencies at the
versions pinned in `docs/06-tech-architecture.md §1`. Full script set
wired: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`,
`test:run`, `test:e2e`, `test:e2e:ui`.

**Configs landed**
- tsconfig with project references, ES2022 target, `@/` alias to `src/`
- Vite with `VITE_BASE_PATH`-driven base, port 5173 strict
- Tailwind 3 + PostCSS + Autoprefixer (tokens land in FXSW-002)
- Vitest with jsdom, globals, `testing-library/jest-dom` matchers
- Playwright chromium-only, single worker, 4173 preview server
- ESLint 8 with TypeScript + React + react-hooks + react-refresh +
  Prettier-disable, no-warnings policy
- Prettier 3 with project conventions

**Tests added:** smoke tests proving the pipeline (App-is-function
unit + Playwright body-exists e2e).

**Gates at commit:** typecheck ✓ · lint ✓ · test:run ✓ · e2e ✓

---

_Older entries (the spec pack and Phase 0 decisions) predate any
implementation work and live in the doc pack itself; see
`docs/BACKLOG.md` and the `00–09` design docs._
