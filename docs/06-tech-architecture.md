# 06 — Technical Architecture

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Build tool | **Vite 5** | Fast HMR, no config for this scale |
| Language | **TypeScript 5, strict** | Catches FX precision bugs early |
| UI lib | **React 18** | Hooks + concurrent features cover everything we need |
| Styling | **Tailwind CSS 3** + tokens | Tokens give us the design system, Tailwind gives us velocity |
| State (UI/data) | **Zustand** | Tiny, no provider hell, plays nice with selectors |
| State (deal lifecycle) | **XState v5** | The trade model is a state machine — use the right tool |
| Data grid | **AG-Grid Community 31** | The de facto blotter component; community edition is free and enough |
| Icons | **lucide-react** | Clean, consistent, tree-shaken |
| Unit/component tests | **Vitest** + **React Testing Library** | Vite-native, same module graph as the app |
| E2E tests | **Playwright** | Best-in-class for finance UIs; auto-waits, deterministic |
| Package manager | **pnpm** | Fast, strict node_modules layout |
| Lint/format | **ESLint** + **Prettier** | standard |

### Versions to pin

```jsonc
{
  "react": "18.3.1",
  "react-dom": "18.3.1",
  "typescript": "5.4.5",
  "vite": "5.2.10",
  "tailwindcss": "3.4.3",
  "zustand": "4.5.2",
  "xstate": "5.13.0",
  "@xstate/react": "4.1.1",
  "ag-grid-community": "31.3.2",
  "ag-grid-react": "31.3.2",
  "lucide-react": "0.378.0",
  "clsx": "2.1.1",
  "vitest": "1.6.0",
  "@testing-library/react": "16.0.0",
  "@playwright/test": "1.44.0"
}
```

## 2. Folder structure

```
fx-sales-intervention/
├─ docs/                          # this doc pack
├─ public/
│  └─ index.html
├─ src/
│  ├─ components/                 # shared dumb components
│  │  ├─ Button.tsx
│  │  ├─ IconButton.tsx
│  │  ├─ Pill.tsx
│  │  ├─ Chip.tsx
│  │  ├─ NumberInput.tsx
│  │  ├─ Tooltip.tsx
│  │  └─ Toast.tsx
│  ├─ features/
│  │  ├─ blotter/
│  │  │  ├─ ActiveBlotter.tsx
│  │  │  ├─ HistoricBlotter.tsx
│  │  │  ├─ columns.ts
│  │  │  ├─ statusFromMachines.ts  # derives display label from (rfsState, siState)
│  │  │  ├─ StatusCell.tsx
│  │  │  ├─ RateCell.tsx
│  │  │  ├─ AmountCell.tsx
│  │  │  └─ ReasonsCell.tsx
│  │  ├─ ticket/
│  │  │  ├─ TicketPanel.tsx
│  │  │  ├─ ReasonsPanel.tsx
│  │  │  ├─ SummaryPanel.tsx
│  │  │  ├─ SuggestionPanel.tsx   # AI Margin Suggestion — see 09-suggestion-engine.md
│  │  │  ├─ SuggestionPanel.test.tsx
│  │  │  ├─ PricingPanel.tsx
│  │  │  ├─ ClientSummaryPanel.tsx
│  │  │  ├─ DealSummaryPanel.tsx
│  │  │  └─ TicketFooter.tsx
│  │  ├─ notifications/
│  │  │  ├─ ToastStack.tsx
│  │  │  ├─ MuteToggle.tsx
│  │  │  └─ useNotificationSound.ts
│  │  └─ dev-injector/
│  │     └─ DevInjector.tsx
│  ├─ services/
│  │  ├─ feed/
│  │  │  ├─ pricingFeed.ts
│  │  │  ├─ pricingFeed.test.ts
│  │  │  ├─ dealFeed.ts
│  │  │  ├─ dealFeed.test.ts
│  │  │  ├─ types.ts
│  │  │  └─ index.ts
│  │  ├─ scenarios/
│  │  │  ├─ definitions.ts        # the 5 scenarios as data
│  │  │  ├─ player.ts             # consumes definitions, fires events
│  │  │  └─ player.test.ts
│  │  └─ suggestion/
│  │     ├─ engine.ts             # pure rule engine — see 09-suggestion-engine.md
│  │     ├─ engine.test.ts
│  │     ├─ clientProfiles.ts     # the 5 seed client profiles
│  │     ├─ rationale.ts          # one-line rationale builder
│  │     ├─ rationale.test.ts
│  │     └─ types.ts
│  ├─ state/
│  │  ├─ stores/
│  │  │  ├─ dealsStore.ts         # Zustand: indexed by dealId
│  │  │  ├─ uiStore.ts            # Zustand: ticket open state, focus
│  │  │  └─ settingsStore.ts      # Zustand: mute, persisted
│  │  └─ machines/
│  │     ├─ rfsMachine.ts         # XState: RFS Trade Model (Queued, PickedUp, Executable, ...)
│  │     ├─ rfsMachine.test.ts
│  │     ├─ siMachine.ts          # XState: SI Trade Model (Initial, PickUpSent, PickedUp, Quoted, ...)
│  │     ├─ siMachine.test.ts
│  │     ├─ dealMachine.ts        # XState: parent actor spawning both, implementing RFS↔SI cross-sends
│  │     ├─ dealMachine.test.ts
│  │     └─ timings.ts            # ackDelayMs, quoteValidityMs — zeroable in tests
│  ├─ types/
│  │  ├─ deal.ts
│  │  ├─ pricing.ts
│  │  └─ scenario.ts
│  ├─ lib/
│  │  ├─ pips.ts                  # pipSize(pair), addPips, applyMargin
│  │  ├─ pips.test.ts
│  │  ├─ format.ts                # formatAmount, formatRate, formatTime
│  │  ├─ format.test.ts
│  │  └─ time.ts                  # settlement date calc, etc.
│  ├─ styles/
│  │  ├─ tokens.css
│  │  └─ global.css
│  ├─ App.tsx
│  └─ main.tsx
├─ tests/
│  └─ e2e/
│     ├─ scenarios.spec.ts        # the 4 demo scenarios
│     ├─ notifications.spec.ts
│     └─ fixtures.ts
├─ .eslintrc.cjs
├─ .prettierrc
├─ playwright.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ vite.config.ts
├─ vitest.config.ts
├─ pnpm-lock.yaml
├─ package.json
└─ README.md
```

## 3. Data flow

```
                ┌────────────────┐
                │  PricingFeed   │── 300ms tick ──┐
                └────────────────┘                │
                                                  ▼
┌──────────────┐    inject     ┌──────────────────────┐
│ DevInjector  │ ─────────────▶│   DealFeed (player)  │
└──────────────┘               └──────────┬───────────┘
                                          │ events
                                          ▼
                              ┌────────────────────────┐
                              │  dealsStore (Zustand)  │◀───┐
                              │  + dealMachine actors  │    │
                              │    (XState — one parent│    │
                              │     spawning rfsMachine│    │
                              │     + siMachine each)  │    │
                              └──────────┬─────────────┘    │
                                         │ snapshot          │
                                         ▼                   │ events
                              ┌──────────────────────┐       │ (Reject,
                              │  React components    │───────┘  Quote,
                              │  (Blotter, Ticket)   │          Hold, etc.)
                              └──────────┬───────────┘
                                         │ display
                                         ▼
                                      Browser
```

Key points:
- The **PricingFeed** is consumed directly by components that need live prices (RateCell, PricingPanel) via custom hooks, **not** routed through Zustand. Rationale: 300ms per tick × 4 pairs would thrash Zustand subscribers; better to subscribe each consuming component directly to the feed.
- The **DealFeed** events are consumed by `dealsStore`. Each new deal spins up an XState machine instance; subsequent events are forwarded to the right machine.
- React components read derived state from `dealsStore` (rows for the blotter, current deal for the ticket).
- User actions in the ticket (Send Stream, Reject, etc.) dispatch events to the machine; the machine emits transitions; the store re-renders.

## 4. Service interfaces

The interface is the seam — code in `/src` depends on the interface, not the implementation. This lets a future iteration swap in a real Caplin StreamLink-backed feed without touching the UI.

```typescript
// src/services/feed/types.ts
export interface PricingFeed {
  subscribe(pair: string, cb: (tick: PriceTick) => void): () => void;
  getLatest(pair: string): PriceTick | null;
  start(): void;
  stop(): void;
}

export interface DealFeed {
  subscribe(cb: (event: DealEvent) => void): () => void;
  inject(scenarioId: ScenarioId): void;
  reset(): void;
}
```

`src/services/feed/index.ts` exports a singleton `pricingFeed` and `dealFeed`. Tests can replace the singleton in module-level setup.

## 5. State management contract

### Zustand stores

- `dealsStore` — `Map<dealId, DealWithMachine>`. Methods: `addDeal`, `removeDeal`, `forwardEvent(dealId, event)`, selectors for active vs historic.
- `uiStore` — `{ openDealId: string | null }`. Methods: `openTicket(dealId)`, `closeTicket()`.
- `settingsStore` — `{ muted: boolean }`. Persisted to `sessionStorage`.

### XState machines

Defined in `src/state/machines/`. Three files per concern:
- `rfsMachine.ts` — RFS Trade Model. States: `Queued`, `PickedUp`, `Executable`, `ExecuteSent`, `TradeConfirmed`, `Expired`, `ClientClosed`.
- `siMachine.ts` — Sales Intervention Trade Model. States: `Initial`, `PickUpSent`, `PickedUp`, `QuoteSent`, `Quoted`, `WithdrawSent`, `HoldSent`, `RejectSent`, `TraderRejected`, `ClientRejected`, `TradeConfirmed`.
- `dealMachine.ts` — Parent actor. Spawns one of each child on deal creation and implements the cross-model relationships from `03-trade-state-model.md §3` as `entry`/`exit` actions that send into the sibling machine.

See `03-trade-state-model.md` for the full state graph and the canonical RFS↔SI relationship table. Each deal in `dealsStore` owns one parent `dealMachine` actor; the store creates it on `addDeal` and stops it on terminal-state cleanup.

## 6. Configuration

- `vite.config.ts` — base config, path alias `@/` → `src/`, server port 5173.
- `tailwind.config.ts` — content paths, theme extensions for tokens.
- `tsconfig.json` — strict, `"target": "ES2022"`, `"jsx": "react-jsx"`, `"baseUrl": "."`, `"paths": { "@/*": ["src/*"] }`.
- `playwright.config.ts` — `webServer` runs `pnpm preview` (production build), single worker, retries 0 locally / 2 in CI, trace on first retry.
- `vitest.config.ts` — `environment: 'jsdom'`, `setupFiles: ['./src/test-setup.ts']`.

## 7. Build & deploy

- `pnpm build` produces `dist/` — static assets only.
- The `prebuild` script (`scripts/fetch-reference-mids.ts`, per `04 §10`) runs first and fetches fresh reference mids from Frankfurter; the build then bakes them in. Every deployed build therefore has current mids.
- Deploy targets supported by this architecture: GitHub Pages (recommended for the prototype — see §7.1), Vercel, Netlify, Cloudflare Pages, or any static host that serves a folder.

### 7.1 GitHub Pages deployment

The architecture was chosen with static hosting in mind, so GitHub Pages is a first-class target. The deployed demo URL is:

```
https://<github-username>.github.io/fx-sales-workstation/?dev=1
```

The `?dev=1` keeps the dev injector visible — turning the live URL itself into a one-click demo artifact for screenshares, links in conversations, and async sharing.

**Three things to set up:**

#### a) `vite.config.ts` base path

GitHub Pages serves from `/<repo-name>/`, not root. Vite needs to know:

```ts
// vite.config.ts
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  // ...rest of config
});
```

Driving via env var (rather than hard-coding the repo name) means the repo can be renamed without a code change — the workflow sets `VITE_BASE_PATH` per environment.

#### b) `.github/workflows/deploy.yml`

Separate from `ci.yml` (which runs on PRs); `deploy.yml` runs on pushes to `main` only:

```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: VITE_BASE_PATH=/fx-sales-workstation/ pnpm build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

#### c) Repo settings

In the GitHub repo: **Settings → Pages → Source: GitHub Actions** (not "Deploy from a branch" — that's the legacy flow). First deploy lights up the URL within ~60 seconds.

#### Cost & visibility

- **Public repo:** GitHub Pages is free. The deployed URL is also public.
- **Private repo:** Pages requires a paid GitHub plan (Pro / Team / Enterprise). Deployed URL is access-controlled to repo collaborators.
- **Custom domain:** Optional — add a `public/CNAME` file containing your domain, configure DNS, set the domain in repo Settings → Pages. The base-path env var would change to `/` in that case.

#### What runs at deploy time, what doesn't

- ✅ Frankfurter fetch (build-time, in CI). Fresh rates on every deploy.
- ✅ Vite build, TypeScript compile, Tailwind purge.
- ❌ No CI tests block deploy in the workflow above — by design, since `ci.yml` already runs them on the PR. If you want belt-and-braces, add a `needs: test` step that re-runs `pnpm test:run` before the build.
- ❌ No Playwright in the deploy path — too slow and not Pages-relevant. Lives in `ci.yml`.

A typical end-to-end cycle: merge a PR → `ci.yml` is already green → `deploy.yml` triggers → build completes in ~90s → fresh URL live within ~30s after.

## 8. CI

GitHub Actions workflow on PR + push to `main`:

1. `pnpm install --frozen-lockfile`
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm test:run`
5. `pnpm exec playwright install --with-deps chromium`
6. `pnpm test:e2e`

Total CI budget: 5 minutes. Playwright is the long pole.

## 9. Performance budget

For a prototype, this is overkill, but it keeps us honest:

| Metric | Budget |
|---|---|
| Initial JS payload (gzipped) | < 400KB (AG-Grid is the bulk) |
| Time to interactive on M-class laptop | < 1.5s |
| Pricing tick → DOM update | < 100ms |
| Open ticket → fully rendered | < 100ms |
| Memory after 10 minutes of scenarios | No leak (< 50MB heap growth) |

## 10. Dependency hygiene

- No `lodash` (use native).
- No `date-fns` for v1 — we have `Intl.DateTimeFormat` and `Date` math (settlement is just T+2 weekdays).
- No `axios` — there are no HTTP calls.
- No `redux`, `mobx`, `recoil`, `jotai` — Zustand + XState is the boundary.
- No CSS-in-JS (`styled-components`, `emotion`) — Tailwind only.
