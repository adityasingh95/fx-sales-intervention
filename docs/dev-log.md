# Dev Log

A chronological, ticket-by-ticket journal of building the **FX Sales
Workstation** prototype. Written in the voice of the agent doing the
work — what shipped, what the docs said, what tripped me up, what the
gates caught.

This log is presentation material. The project has two deliverables
running side-by-side:

1. **The prototype itself** — a sales-trader workstation for FX
   manual pricing intervention. Single-page React + XState app, fully
   simulated feed, no backend.
2. **The AI-native development pipeline** showing how the prototype
   gets built. A spec pack (`docs/00–09`), a CLAUDE.md with operating
   rules and write boundaries, a backlog of TDD-shaped tickets
   (`docs/BACKLOG.md`), a hand-off contract with a downstream Wiki
   Agent, and a hard gate of `typecheck + lint + test:run + test:e2e`
   on every commit. This log is the artifact that shows it in motion.

Most recent first. New entries land on every ticket completion.

This file is **separate from** `docs/phase-summaries/` — those are
the end-of-phase hand-off summaries for the Wiki Agent (per
`CLAUDE.md`'s "Hand-off contract" section). This is the working
journal.

---

## FXSW-005 · State machine skeletons
**Commit `49bde9a`**

Three XState 5 machines covering the bare slice we need before
wiring the blotter and ticket. `docs/03-trade-state-model.md §6`
and `CLAUDE.md` rule §7 are non-negotiable on this one: there are
**two machines per deal**, not one. RFS Trade Model and Sales
Intervention Trade Model run in parallel, coordinated by a parent
`dealMachine` actor. The Caplin docs are explicit about this and
collapsing them into one would lose the v2 path of swapping the
dummy feed for a real Caplin StreamLink integration.

What landed: `siMachine` does `Initial → PickUpSent → PickedUp`
with the 250ms simulated ack as an `after: { ackDelay }`
transition. `rfsMachine` does `Queued → PickedUp` on `PickUp`.
`dealMachine` is the parent — spawns one of each child on init,
both sharing the deal's id via context, and declares no-op
handlers for all 16 SI events from `docs/03 §2` so callers can
already `send({ type: 'Quote' })` etc. The real RFS↔SI
cross-model coordination from `docs/03 §3` is FXSW-010.

Two things worth flagging:

- `timings.ts` had to be an object (`{ ackDelayMs: 250 }`) not
  `const ackDelayMs = 250`. ES modules make `const` bindings
  read-only across module boundaries, and one of the TDD specs
  is "overriding `timings.ackDelayMs = 0` makes the transition
  synchronous." Object property assignment satisfies that.
- The delay is wired into the machine via a named `ackDelay`
  *delay function* (`delays: { ackDelay: () => timings.ackDelayMs }`).
  XState re-evaluates this lazily on state entry, so reassigning
  the timing from a test takes effect on subsequent transitions
  without rebuilding the machine.

Backlog ticket specified 7 TDD tests; wrote them first, watched
them go red, then implemented. All seven green. Gates: typecheck,
lint, test:run (106 pass / 8 todo). Next: FXSW-006 — first
visible UI.

---

## FXSW-004 · Prebuild reference-mids script
**Commit `1ca6d65`**

`docs/04-dummy-feed-spec.md §10` had this one fully scoped: bake
reference FX mids at *build* time from Frankfurter (free,
USD-based, no API key, no signup), write them to
`src/services/feed/referenceMids.json`, and let the PricingFeed
anchor its random walk on the result. No runtime network
dependency, no flaky API to break a demo mid-pitch.

Wrote the tests first per the backlog's TDD spec — `round`
precision, happy-path inversion shape, HTTP-non-OK → fallback,
fetch-throw → fallback. Used `vi.stubGlobal('fetch', ...)` and
`mkdtemp` for output path isolation so the tests can't clobber
the real generated file. Confirmed red, then implemented.

The interesting subtlety in the script: Frankfurter returns
USD-based rates where `rates.EUR = 0.85361` means "1 USD =
0.85361 EUR". For quote-style pairs (EURUSD, GBPUSD) the script
has to invert (`1 / data.rates.EUR`, 4dp); JPY/INR are taken
straight (2dp). One of the TDD specs was literally
`round(1/0.85361, 4) === 1.1715` — that's the assertion that
proves the inversion direction is right.

Two operational decisions:

- Guarded the direct-run with
  `import.meta.url === file://${process.argv[1]}` so vitest can
  `import { main, round, FALLBACK }` from the script without
  triggering a real fetch + write on import.
- Gitignored `referenceMids.json` — it's a build artifact,
  `prebuild` regenerates it on every dev/build, no need for
  noisy daily diffs.

Also: this container's egress policy blocks `api.frankfurter.dev`
(HTTP 403), so the only path I could observe end-to-end *here*
was the fallback. That's actually fine — the AC says "build never
breaks" on network failure, and the sandbox's behavior is the
exact failure mode the fallback exists for. The user confirmed
they'll test the happy path locally where the network is open.

Gates: typecheck, lint, test:run (99 pass / 11 todo), build all
green. Prebuild fires on `pnpm build` as expected.

---

## FXSW-003 · Folder structure
**Commit `04c4032`**

Pure structural ticket — bring the codebase shape in line with
`docs/06-tech-architecture.md §2` so subsequent tickets land in
the right place without any "where does this go" stalls. 65 new
files. TS/TSX got `export {};`, test files got
`it.todo('placeholder')`. That keeps typecheck happy, lint happy
(the `react-refresh/only-export-components` warn passes on an
empty re-export), and vitest reports `XX todo` rather than
errors.

Two judgement calls where the spec doc and the toolchain reality
disagreed:

- The architecture tree shows `public/index.html`, but Vite 5
  uses a *root* `index.html` (which FXSW-001 already created).
  Kept it at the root and made `public/` exist via `.gitkeep`.
  Treating Vite convention as the practical override on a
  documentation imprecision.
- Existing `tests/e2e/smoke.spec.ts` from FXSW-001 stayed put
  alongside the three e2e files the architecture lists.
  Smoke-as-canary is useful; no reason to lose it.

Path alias `@/` → `src/` was already wired by FXSW-001 (in
`tsconfig.app.json` and `vite.config.ts`), so the AC's
alias-existence check was a no-op.

No new tests — structural ticket, AC explicitly says so. Gates:
typecheck, lint, test:run (95 pass / 11 todo), e2e all green.

---

## FXSW-004's prereq: re-confirming the network policy

Worth noting because it's part of how the agent harness behaves:
the last session left a TODO that Playwright's chromium download
was blocked. First thing I did on resume was retry
`pnpm exec playwright install chromium` — the network policy had
been opened up between sessions and the install completed cleanly
(`/opt/pw-browsers/chromium-1194` shows up). That unblocked the
e2e gate for the rest of the work.

---

## FXSW-002 · Design tokens + Tailwind config
**Commit `f732331`**

Every CSS custom property from `docs/05-ui-ux-spec.md §1` lifted
into `src/styles/tokens.css` — backgrounds, borders, text, status
colors, the AI accent family (Cyan/Violet/Teal — used by the
SuggestionPanel later), functional colors, typography
(Geist + Geist Mono via `@fontsource`), spacing, radii, shadows,
easings. Tailwind theme extended with matching aliases so
`bg-bg-panel`, `text-text-dim`, `border-border`, `shadow-ai`
resolve. Hex values duplicated between `tokens.css` (runtime) and
`tailwind.config.ts` (build-time) so the FXSW-002 AC's hex
assertion has something to assert against.

The "non-obvious bit" worth calling out for the presentation: the
AC originally said "assert computed styles on a rendered probe
div", but **jsdom doesn't resolve Tailwind classes or CSS `var()`
references in `getComputedStyle`**. So the tests had to pivot to
file-content assertions instead (49 token cases) plus an
import-the-config-and-assert-the-shape approach for the Tailwind
side (45 cases). 94 token-related tests, all green.

Also moved `tailwind.config.ts` out of `tsconfig.node.json` and
into `tsconfig.app.json` so the test could import it under the
app's project boundary.

Gates: typecheck, lint, test:run (95 pass), all green.

---

## FXSW-001 · Project scaffolding
**Commit `6999625`**

Bootstrap. Vite 5 + React 18 + TypeScript 5 (strict, no `any`),
all dependency versions pinned exactly to
`docs/06-tech-architecture.md §1`. Full script set wired per
`CLAUDE.md`: `dev`, `build`, `preview`, `typecheck`, `lint`,
`test`, `test:run`, `test:e2e`, `test:e2e:ui`.

Configs landed in one go: project-reference `tsconfig` with
`@/` → `src/` alias, Vite with `VITE_BASE_PATH`-driven base for
the eventual GitHub Pages deploy, Tailwind 3 + PostCSS + Autoprefixer
(tokens hold til FXSW-002), Vitest with jsdom + globals +
testing-library/jest-dom matchers, Playwright chromium-only
single-worker pointing at the preview server on 4173, ESLint 8
with TypeScript + React + react-hooks + react-refresh + Prettier
disable, no-warnings policy, Prettier 3.

Smoke tests prove the plumbing: a unit test that asserts `App` is
a function (Vite + TS + Vitest pipeline works) and a Playwright
spec that loads the page and confirms `<body>` exists (preview
server + browser launch + assertion works). Both green.

Gates: typecheck, lint, test:run, e2e all green.

---

_Older entries (the spec pack and Phase 0 decisions) predate any
implementation work and live in the doc pack itself; see
`docs/BACKLOG.md` and the `00–09` design docs._
