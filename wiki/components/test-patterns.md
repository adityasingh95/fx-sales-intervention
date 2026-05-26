---
last_updated: 2026-05-26
sources:
  - docs/08-test-plan.md
  - docs/dev-log.md
status: stable
---

# Component — Test patterns

The recurring testing patterns this codebase uses. Each pattern is a paragraph + a worked example pointing at the canonical implementation in `src/`. Pattern choices are durable — they change rarely, even as test cases churn — so this page is intended as a stable reference for engineers writing new tests.

The wider testing strategy lives in `docs/08-test-plan.md` §1-3 (unit vs component vs E2E layering) and is summarised in [onboarding.md](../onboarding.md) §8. This page covers the **how**, not the **what** or the **why**.

## 1. Deterministic pricing — seed pinning

The [pricing feed](pricing-feed.md) is a seeded random walk. Tests pin the seed so bid / ask / mid values are reproducible.

**Vitest** sets the seed before importing the feed module:

```typescript
beforeEach(() => {
  (window as { __seedFeed?: number }).__seedFeed = 42;
});

afterEach(() => {
  pricingFeed.stop();
});
```

**Playwright** uses `addInitScript` so the seed is set before the page's `main.tsx` runs:

```typescript
await page.addInitScript(() => {
  (window as { __seedFeed?: number; __zeroAckDelay?: boolean }).__seedFeed = 42;
  (window as { __seedFeed?: number; __zeroAckDelay?: boolean }).__zeroAckDelay = true;
});
await page.goto('/?dev=1');
```

**The seed-42 golden EURUSD sequence is `[1.1715, 1.1714, 1.1714, 1.1714, 1.1714]`** for the first 5 ticks (mid values). FXSW-007 locks this in `pricingFeed.test.ts`. Any change to the PRNG, Box-Muller sampling, or per-tick step would break this assertion — by design.

### Watch for half-spread rounding asymmetry

Tick 1 of EURUSD seed-42: `mid_float` lands in `[1.17145, 1.171475)`. The mid rounds to `1.1715`, but `bid_float = mid_float - 0.000025` lands below `1.17145` and rounds to `1.1714`. The golden sequence locked the mid only — the bid / ask asymmetry surfaces at the rounding boundary.

Test fix in `PricingPanel.test.tsx`: when asserting bid / ask from seed-42, use the actual rounded values (1.1714 / 1.1715), not what the mid sequence suggests. For "tick flash" tests, **use GBPUSD seed-42 tick 1→2** — both cells drop one pip, the cleanest down-flash setup. See `docs/dev-log.md` FXSW-017 entry for the full diagnostic.

## 2. Fake timers for `*Sent` ack delays

The [SI machine](si-machine.md) honours simulated ack delays via `after: { ackDelay: 'NextState' }` named delay functions ([ADR-0009](../decisions/ADR-0009-simulated-ack-delays.md)). Two patterns to drive through them in tests:

**Vitest unit tests** zero the delay so transitions are synchronous:

```typescript
import { timings } from '@/state/machines/timings';

beforeEach(() => {
  timings.ackDelayMs = 0;
});

afterEach(() => {
  timings.ackDelayMs = 250;
});
```

`timings.ackDelayMs` is an **object property**, not a `const`, deliberately — ES module `const` bindings are read-only across module boundaries, which would break this exact override (FXSW-005). The named delay function `delays: { ackDelay: () => timings.ackDelayMs }` re-evaluates on every state entry, so the reassignment takes effect immediately.

**Vitest with fake timers** advances through a real-time delay without waiting wall-clock:

```typescript
import { vi } from 'vitest';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

actor.send({ type: 'PickUp' });
vi.advanceTimersByTime(timings.ackDelayMs);
expect(actor.getSnapshot().value).toBe('PickedUp');
```

Use the fake-timer approach when the test needs to observe an intermediate `*Sent` state; use the zero-delay approach when the test only cares about the post-ack state.

**Playwright** sets `window.__zeroAckDelay = true` via `addInitScript`. `main.tsx` reads it at boot and sets `timings.ackDelayMs = 0`. **The 5-second blotter-removal delay is NOT zeroed** — it's a real wall-clock UX behaviour the demo + tests both depend on (see [active-blotter.md](../features/active-blotter.md) §5-second-removal-rule).

## 3. Hold-to-confirm — pointer events + double-click fallback

The [ticket footer](../features/ticket.md#footer--actions-fxsw-020) `HoldButton` requires 600ms hold OR double-click to fire. Both interaction paths are real and tested.

**Component test (`fireEvent.pointerDown` + fake timers):**

```typescript
fireEvent.pointerDown(rejectBtn);
vi.advanceTimersByTime(700);
expect(onReject).toHaveBeenCalledTimes(1);
```

Pointer events normalise across mouse, touch, and pen — covers a future mobile-tap demo without a second code path. RTL's `fireEvent.pointerDown` works in jsdom (FXSW-020).

**Playwright E2E:**

```typescript
await page.getByTestId('btn-send-stream').click({ delay: 700 });
```

700ms gives a small margin against the timer-vs-pointerup race. Even if `pointerUp` arrives 1ms before the `setTimeout` fires, the hold-confirm still wins because the timer was already scheduled.

The double-click alternative path is one extra `onDoubleClick` handler on the same button — two single clicks (each cancelled by the immediate `pointerUp`) still register as a `dblclick` at the DOM level. No timing math needed; the browser fires `dblclick` after two `click`s within ~500ms.

## 4. Harness pattern — testing components that consume lifted state

After FXSW-019 lifted `pricingMode` / `fixedSide` / `frozenTick` / `marginPips` from `PricingPanel` to `TicketPanel`, the panel-level tests needed to mirror that wiring. Two harness shapes recur:

**Mirroring-state harness** — a tiny wrapper that recreates the parent's state, used to test child components in isolation without re-mounting the full ticket:

```typescript
function Harness() {
  const [margin, setMargin] = useState(3);
  const [pricingMode, setPricingMode] = useState<'streaming' | 'fixed'>('streaming');
  const [frozenTick, setFrozenTick] = useState<PriceTick | null>(null);
  const liveTick = usePrice('EURUSD');
  const displayTick = pricingMode === 'fixed' ? frozenTick : liveTick;
  return <PricingPanel
    pair="EURUSD"
    margin={margin}
    onMarginChange={setMargin}
    pricingMode={pricingMode}
    displayTick={displayTick}
    {...} />;
}
```

**Integration harness for cross-component invariants** — `MarginGlowHarness` in `SuggestionPanel.test.tsx` wires SuggestionPanel + PricingPanel together to prove Apply triggers the `data-margin-glow` attribute on the margin input. This is a unit-level integration test — it doesn't need Playwright but verifies a contract between two components.

The harness pattern keeps the unit test honest to the production wiring without dragging in the full app shell.

## 5. State-gated vs time-gated scenario follow-ups

The [scenario player](scenario-player.md) supports two follow-up trigger kinds:

```typescript
{ trigger: { kind: 'delay', ms: 2000 }, event: 'CLIENT_ACCEPT' }
{ trigger: { kind: 'after-si-state', state: 'Quoted', delayMs: 1500 }, event: 'CLIENT_ACCEPT' }
```

Time-gated tests verify the `setTimeout` fires at the right delay; state-gated tests need to drive the SI machine to the gating state, then assert the event fires after the additional `delayMs`.

The state-gate's `state` field is typed as plain `string` (not the closed SI state union) so the player module doesn't depend on the not-yet-complete SI machine state set at the point of FXSW-008 (decision in `docs/dev-log.md` FXSW-008 entry). The `definitions.test.ts` round-trip is the practical guard against typos.

## 6. Subscribe-to-children, not parent — XState v5

The parent [`dealMachine`](deal-machine.md) runs in a single `Running` state — its snapshot never changes when child machines transition. A parent-only subscription would miss every SI / RFS state change.

The [`dealsStore`](deals-store.md) pulls the spawned `rfs` and `si` child actors out of the parent's context and subscribes to **both children**, mirroring their state names into the store entry's `siState` / `rfsState` fields. React selectors read from the store — no component calls `getSnapshot()` directly.

```typescript
const dealActor = createActor(dealMachine, { input: { dealId } }).start();
const { si, rfs } = dealActor.getSnapshot().context;
si.subscribe((snap) => replaceEntry(dealId, { siState: snap.value as SiState }));
rfs.subscribe((snap) => replaceEntry(dealId, { rfsState: snap.value as RfsState }));
```

Tests follow the same pattern. The store's `useActiveDeals()` selector is the user-facing surface; tests for components that consume the store mock-or-real the store, never the actors directly.

## 7. `queueMicrotask` to defer `actor.stop()` past the subscription callback

When the SI machine reaches `Removed`, the store's subscriber calls `removeDeal(dealId)`, which calls `actor.stop()`. Calling `stop()` synchronously inside the subscription callback would stop the actor mid-transition. Defer one microtask:

```typescript
si.subscribe((snap) => {
  if (snap.value === 'Removed') {
    queueMicrotask(() => removeDeal(dealId));
  }
});
```

This is the smallest-possible delay that lets the current transition settle. Tests that assert post-removal state need to `await Promise.resolve()` (or `await vi.runAllTimersAsync()` if fake timers are active) before reading the store.

## 8. Cell-testid scoping — number + unit composition

FXSW-027's `size-limit-margin-tune` E2E first failed with `expect(suggestionPips).toHaveText('4')` matching the combined text `"4pips"`. The DOM had:

```jsx
<div data-testid="suggestion-pips">
  {suggestion.suggestedPips}<span>pips</span>
</div>
```

Resolution: lift the unit label to a **sibling** of the testid'd element:

```jsx
<div className="row">
  <span data-testid="suggestion-pips">{suggestion.suggestedPips}</span>
  <span>pips</span>
</div>
```

**Pattern:** when wiring a testid around a number + unit composition, scope the testid to the **value-only** child. The unit label should be a sibling. Same lesson applies to margin display, estimated profit, and any other "N units" cell.

## 9. Throwaway debug-spec pattern

Twice in the build (FXSW-017 PricingPanel rendering, FXSW-027 SuggestionPanel testid scoping), a real test failure was best diagnosed by writing a temporary spec that **dumped state to the console** rather than asserting:

- Subscribe to the feed with `console.log` callbacks; render the component; print its computed values.
- Or for E2E: `console.log(await page.locator('[data-testid="ticket-panel"]').innerHTML())` to dump live DOM.

Run once, read the output, identify the cause, then **delete the spec before commit**. The diagnostic is a tool, not a deliverable; checked-in `*.debug.test.tsx` files create noise and decay fast.

If the discovery is generalisable, capture the **lesson** in a comment alongside the real test (e.g. the seed-42 bid/ask asymmetry comment in `PricingPanel.test.tsx`).

## 10. `data-*` attributes over text or color for E2E assertions

Per `docs/07-scenario-pack.md` "Notes on test fidelity":

> Tests should assert on `data-si-state` / `data-rfs-state` attributes and `data-testid` values, not on text or color. Text and color may change; the testids and canonical state names should not.

E2E assertion style:

```typescript
await expect(row).toHaveAttribute('data-si-state', 'Quoted');
await expect(row).toHaveAttribute('data-display-status', 'STREAMING');
await expect(row).toHaveAttribute('data-outcome', 'Executed');
```

The full attribute set per component lives in each feature's "Test contract" section.

## 11. Idempotent setup / teardown

Both `pricingFeed.start()` and `dealFeed.subscribe()` are idempotent — repeat calls don't double-fire. Tests can rely on this without tracking call state. `pricingFeed.stop()` clears subscriptions as part of stopping, so the dev injector's Reset flow (`stop()` then `start()`) lands in a clean state.

The `dealsBootstrap.wireDealFeedToStore()` function returns an unsubscribe function. Tests use it for tear-down between cases; production calls it once at boot and never tears down. Returning the teardown adds zero cost in production and saves a parallel `getInternalUnsubscribeForTests()` API.

## See also

- `docs/08-test-plan.md` — the testing strategy (layers, tools, coverage floors, CI shape)
- [onboarding.md](../onboarding.md) §8 — the testing summary for new engineers
- Each component/feature page has a `## Tests` section listing the actual test files + case counts
