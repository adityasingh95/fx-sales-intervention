# FX Sales Workstation

A frontend prototype of a sales-trader workstation for FX manual pricing
intervention. Single-page React + XState app, simulated pricing feed, no
backend.

**[Live demo →](https://adityasingh95.github.io/fx-sales-intervention/?dev=1)**
(the `?dev=1` exposes the dev injector so you can run the scenario pack
directly from the deployed URL).

## Stack

- Vite 5 + TypeScript 5 (strict)
- React 18 + Tailwind CSS 3
- Zustand (UI / transient state) + XState 5 (deal lifecycle)
- AG-Grid Community 31 (blotters)
- Vitest + React Testing Library (unit / component)
- Playwright (E2E)

## Commands

```bash
pnpm install
pnpm dev         # vite dev server on :5173
pnpm build       # production build (writes to dist/)
pnpm preview     # serve the production build on :4173
pnpm test        # vitest watch
pnpm test:run    # vitest single run (used by CI)
pnpm test:e2e    # playwright headless
pnpm test:e2e:ui # playwright UI mode
pnpm typecheck
pnpm lint
```

The `predev` and `prebuild` scripts fetch the latest reference FX mids from
Frankfurter and write `src/services/feed/referenceMids.json`. On network
failure they fall back to hard-coded values — builds never break.

## Docs

The full spec pack lives in [`docs/`](./docs/):

- [`BACKLOG.md`](./docs/BACKLOG.md) — the ticket-shaped roadmap.
- [`dev-log.md`](./docs/dev-log.md) — chronological build journal with
  user-directed vs agent-directed decisions called out per ticket.
- [`02-functional-spec.md`](./docs/02-functional-spec.md) — what the UI
  does.
- [`03-trade-state-model.md`](./docs/03-trade-state-model.md) — the two
  parallel trade state machines (RFS + Sales Intervention).
- [`06-tech-architecture.md`](./docs/06-tech-architecture.md) — folder
  shape, data flow, deploy pipeline.

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via
`.github/workflows/deploy.yml`. To deploy from a feature branch, use the
**Actions** tab → **deploy** → **Run workflow** and pick the branch.
