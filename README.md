# FX Sales Workstation

A frontend prototype of a sales-trader workstation for FX manual pricing
intervention. Single-page React + XState app, simulated pricing feed, no
backend.

**[Live demo →](https://adityasingh95.github.io/fx-sales-intervention/?dev=1)**
(the `?dev=1` exposes the dev injector so you can run the scenario pack
directly from the deployed URL).

![CI](https://github.com/adityasingh95/fx-sales-intervention/actions/workflows/ci.yml/badge.svg?branch=main)
![Deploy](https://github.com/adityasingh95/fx-sales-intervention/actions/workflows/deploy.yml/badge.svg?branch=main)

## What it demonstrates

A sales trader's intervention workstation: parallel **RFS** and **Sales
Intervention** trade state machines per deal, a live blotter with a
5-second post-terminal removal rule, a glass-overlay ticket with
streaming/fixed pricing modes, an **AI Margin Suggestion** panel
(deterministic rule engine, not an LLM), and notifications layered on
top (toast + title flash + WebAudio chime, all mutable from the header).

Five canned scenarios drive the demo. Open the live URL with `?dev=1`
and click the injector buttons in the running order below:

| # | Scenario | What to look at |
|---|---|---|
| 1 | **Inject: Happy Path ESP** | Auto-priced EURUSD deal flows AUTO → DONE → Historic with no trader action. |
| 2 | **Inject: Off-Hours Intervention** | Toast appears, title prefixes with `●`, ticket panel slides in for Globex / USDJPY. AI suggests **5 pips**. Hold Send Stream 600ms → STREAMING → 1.5s wait → DONE. |
| 3 | **Inject: Size Limit + Margin Tune** | Northwind / EURUSD / 12M. AI suggests **4 pips** high confidence with the rationale "*Gold-tier client with strong recent acceptance, 12M EURUSD, above auto-pricer band — suggesting 4 pips.*" Click Apply → margin animates 3 → 4 → Send Stream → Executed. |
| 4 | **Inject: Credit Breach** | Halcyon / GBPUSD / 25M. AI panel flips to the credit-decline state — Apply replaced by a hold-to-confirm **Reject deal** shortcut. Hold 600ms → row archives to Historic as *Rejected by Trader*. |
| 5 | **Inject: Release Path** | Polaris / USDINR / 3M. Pick up the ticket, then Release — row stays in Active with dealable returning to true. |

Toggle the bell icon in the header to mute the chime. State persists to
`sessionStorage` for the session.

## Stack

- Vite 5 + TypeScript 5 (strict, no `any`)
- React 18 + Tailwind CSS 3 + lucide-react
- Zustand (UI / transient state) + XState 5 (deal lifecycle)
- AG-Grid Community 31 (blotters)
- Vitest + React Testing Library (unit / component)
- Playwright (E2E, chromium-only, single worker)

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

## CI

`.github/workflows/ci.yml` runs typecheck + lint + unit suite + Playwright
E2E on every push to `main` / `claude/**` and on every pull request.
Failed Playwright runs upload `test-results/` + `playwright-report/` as a
`playwright-trace` artifact for inspection.

## Demo recording

A 30–60s screen capture walking through the five scenarios above lives at
[`docs/demo.mp4`](./docs/demo.mp4) (or embed below once captured).

<!-- Once recorded:
https://github.com/adityasingh95/fx-sales-intervention/assets/...
-->

## Docs

The full spec pack lives in [`docs/`](./docs/):

- [`BACKLOG.md`](./docs/BACKLOG.md) — the ticket-shaped roadmap, 34 tickets
  across 5 phases.
- [`dev-log.md`](./docs/dev-log.md) — chronological build journal, with
  user-directed vs agent-directed decisions called out per ticket.
- [`phase-summaries/`](./docs/phase-summaries/) — end-of-phase hand-off
  briefs ingested by the Wiki Agent.
- [`01-prd.md`](./docs/01-prd.md) — product framing.
- [`02-functional-spec.md`](./docs/02-functional-spec.md) — what the UI does.
- [`03-trade-state-model.md`](./docs/03-trade-state-model.md) — the two
  parallel trade state machines (RFS + Sales Intervention).
- [`05-ui-ux-spec.md`](./docs/05-ui-ux-spec.md) — design tokens, component
  visual specs.
- [`06-tech-architecture.md`](./docs/06-tech-architecture.md) — folder shape,
  data flow, deploy pipeline.
- [`07-scenario-pack.md`](./docs/07-scenario-pack.md) — the five Gherkin
  scenarios that drive the demo and the E2E suite.
- [`09-suggestion-engine.md`](./docs/09-suggestion-engine.md) — the AI Margin
  Suggestion rule engine.

## Deploy

Pushes to `main` deploy automatically to GitHub Pages via
[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml). To deploy
from a feature branch, use the **Actions** tab → **deploy** →
**Run workflow** and pick the branch (requires that branch to be in the
`github-pages` environment's allow-list under Settings → Environments).
