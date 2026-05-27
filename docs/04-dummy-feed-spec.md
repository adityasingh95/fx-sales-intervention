# 04 — Dummy Feed Specification

This document defines the simulated pricing and deal feeds used by the frontend prototype.

## 1. Purpose

The dummy feed replaces real market-data, pricing, risk, and quote-handler backends for the prototype. It gives the UI deterministic live-looking data without any runtime external dependency.

## 2. Design goals

- Deterministic enough for tests.
- Live-looking enough for demos.
- Fast startup.
- No network calls at runtime.
- Scenario-driven deal injection.
- Resettable state for E2E tests.

## 3. PricingFeed

`PricingFeed` publishes ticks for configured currency pairs.

### 3.1 Tick shape

```ts
export type PriceTick = {
  pair: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: number;
};
```

### 3.2 Behaviour

- Uses seeded pseudo-random generation for deterministic tests.
- Emits ticks approximately every 300ms.
- Uses reference mids as the starting point.
- Applies small random movement around the mid.
- Maintains bid/ask spread around the mid.
- Offers `subscribe(pair, listener)` and `getLatest(pair)`.

### 3.3 Supported pairs

- `EURUSD`
- `GBPUSD`
- `USDJPY`
- `USDINR`

## 4. DealFeed

`DealFeed` emits scenario events into the application.

### 4.1 Event shape

```ts
export type DealEvent = {
  dealId: string;
  scenarioId: string;
  type: string;
  payload: unknown;
  at: number;
};
```

### 4.2 Behaviour

- Scenarios are injected manually from the Dev Injector.
- The feed supports subscribers.
- `reset()` clears pending timers and scenario state.
- State-gated follow-ups can wait until a deal reaches a target SI state.

## 5. Scenarios

Scenario definitions live in `docs/07-scenario-pack.md` and the implementation under `src/services/scenarios/`.

The core scenarios are:

1. `HAPPY_PATH_ESP`
2. `OFF_HOURS_INTERVENTION`
3. `CREDIT_BREACH`
4. `SIZE_LIMIT_MARGIN_TUNE`
5. `RELEASE_PATH`

## 6. Test hooks

The feed exposes deterministic hooks for E2E reliability:

- seeding the pricing generator,
- resetting deal state,
- reducing acknowledgement delay during tests,
- direct scenario injection through UI buttons.

## 7. Non-goals

- No live market-data integration.
- No backend quote handler.
- No persistence.
- No authentication.
- No real risk or credit engine.
