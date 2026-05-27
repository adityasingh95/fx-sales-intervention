# 06 — Technical Architecture

Brand-neutral architecture note for **FX Sales Workstation**.

## 1. Purpose

The application is a static frontend prototype for FX sales manual-pricing intervention. It models the trading workflow using simulated feeds, local state, and deterministic state machines.

## 2. Stack

| Layer | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript strict |
| UI | React |
| Styling | Tailwind CSS and CSS variables |
| UI/data state | Zustand |
| Deal lifecycle | XState |
| Icons | lucide-react |
| Unit/component tests | Vitest and React Testing Library |
| E2E tests | Playwright |
| Package manager | pnpm |
| Static hosting | GitHub Pages |

## 3. Runtime shape

```text
Dev Injector
    │
    ▼
DealFeed ──► dealsStore ──► dealMachine
                           ├─► rfsMachine
                           └─► siMachine

PricingFeed ──► RateCell / PricingPanel

dealsStore selectors ──► Active Blotter / Historic Blotter / Ticket / Notifications
```

## 4. Service interfaces

The feed layer is the adapter seam. UI code consumes feed interfaces rather than a specific implementation. The current implementation is simulated; a later version could replace it with a production market-data and deal-event adapter while preserving most UI and state-machine logic.

## 5. State ownership

| Concern | Owner |
|---|---|
| Live prices | `PricingFeed` |
| Scenario playback | `DealFeed` |
| Deal collection and archive | `dealsStore` |
| RFS lifecycle | `rfsMachine` |
| Sales Intervention lifecycle | `siMachine` |
| Cross-machine coordination | `dealMachine` |
| Open ticket | `uiStore` |
| Notifications | `notificationsStore` |
| Mute setting | `settingsStore` |

## 6. Data flow

1. The user injects a scenario from the Dev Injector.
2. `DealFeed` emits a deal event.
3. `dealsStore` creates or updates a deal entry.
4. The parent `dealMachine` coordinates RFS and SI child machines.
5. React selectors render blotters, tickets, and notifications.
6. Ticket actions dispatch events back to the deal machine.
7. Terminal transitions archive rows to Historic after the grace period.

## 7. Build and deploy

The app builds to static assets and can be hosted by GitHub Pages or another static host. The demo URL uses `?dev=1` to expose the scenario injector.

## 8. Test architecture

- Pure logic: unit tests.
- Components: React Testing Library.
- User flows: Playwright.
- CI: typecheck, lint, unit tests, E2E tests, and build.

## 9. Brand-neutrality

No vendor names should appear in this architecture document, committed source, generated build output, wiki/raw content, or user-visible UI.
