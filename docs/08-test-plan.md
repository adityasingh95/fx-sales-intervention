# 08 — Test Plan

Three layers: unit, component, end-to-end. Each layer answers a different question.

| Layer | Tool | Question it answers |
|---|---|---|
| Unit | Vitest | Does this pure function compute the right number? |
| Component | Vitest + React Testing Library | Does this component render the right thing for given props/state? |
| E2E | Playwright | Does the user's journey work? |

Total target: **>80% line coverage on `/src/lib` and `/src/state/machines`**, **smoke coverage on each visible component**, **all five scenarios passing as Playwright tests**.

## 1. Unit tests (Vitest)

Run with `pnpm test:run`. File pattern: colocated `*.test.ts` next to the file under test (for `/lib` and `/state`), plus `*.test.tsx` for component logic that needs DOM.

### Targets

**`/lib/pips.ts`** — `pipSize(pair)`, `addPips(rate, pair, pips)`, `applyMargin(bid, ask, pair, marginPips)`. These are the most error-prone functions in any FX UI; cover JPY-pair (2-decimal) and non-JPY (4-decimal) cases explicitly.

```typescript
describe('pipSize', () => {
  it('returns 0.0001 for EURUSD', () => expect(pipSize('EURUSD')).toBe(0.0001));
  it('returns 0.01 for USDJPY', () => expect(pipSize('USDJPY')).toBe(0.01));
  it('returns 0.01 for EURJPY', () => expect(pipSize('EURJPY')).toBe(0.01));
});

describe('applyMargin', () => {
  it('widens spread by 2*marginPips', () => {
    const { bid, ask } = applyMargin(1.08495, 1.08505, 'EURUSD', 3);
    expect(bid).toBeCloseTo(1.08465, 5);
    expect(ask).toBeCloseTo(1.08535, 5);
  });

  it('handles JPY pair correctly', () => {
    const { bid, ask } = applyMargin(149.495, 149.505, 'USDJPY', 3);
    expect(bid).toBeCloseTo(149.465, 3);
    expect(ask).toBeCloseTo(149.535, 3);
  });
});
```

**`/lib/format.ts`** — `formatAmount(1_000_000, 'EUR')` → `"1,000,000 EUR"`, `formatRate(1.085, 'EURUSD')` → `"1.0850"`, etc. Cover thousands separators, JPY rate decimals, time formatting.

**`/state/machines/dealMachine.ts`** — exhaustively test all transitions for both child machines:
- SI: `Initial` + `PickUp` → `PickUpSent` → (after 250ms) → `PickedUp`.
- Cross-model: when SI enters `PickedUp`, RFS receives `PickUp` event and transitions `Queued` → `PickedUp`.
- SI: `PickedUp` + `Hold` → `HoldSent` → `Initial` with `Dealable=true`; RFS reverts `PickedUp` → `Queued`.
- SI: `PickedUp` + `Quote` → `QuoteSent` → `Quoted`; RFS receives `PriceUpdate` → `Executable`.
- SI: `Quoted` + `Withdraw` → `WithdrawSent` → `PickedUp`; RFS reverts `Executable` → `PickedUp`.
- SI: `Quoted` + `ClientReject` → `ClientRejected` (terminal).
- SI: `Quoted` + `TradeConfirmed` → `TradeConfirmed` (terminal); RFS also `TradeConfirmed`.
- SI: `Reject` from any non-terminal state → `RejectSent` → `TraderRejected`.
- Terminal states reject all subsequent events.
- The `after: 5000 → removed` transition fires for each SI terminal state.

Use XState's testing utilities (`createActor`, `actor.send`, `actor.getSnapshot`) and zero the ack delay via `timings.ackDelayMs = 0` in test setup.

**`/services/feed/pricingFeed.ts`** — seeded determinism, subscribe/unsubscribe correctness, no leaks on stop().

**`/services/feed/dealFeed.ts`** — `inject(scenarioId)` plays the right events in the right order; `reset()` cancels pending events.

**`/services/scenarios/player.ts`** — given a scenario definition, plays events at the right delays.

**`/services/suggestion/engine.ts`** — pure rule engine. Most-tested file in the codebase.
- Snapshot tests per named client × per scenario shape (5 × 5 = 25 cases minimum).
- Branch coverage at 100% on the rule engine: every notional band, every volatility/liquidity branch, every behavior flag, every rejection-reason path.
- `CREDIT_LIMIT` returns the credit-decline shape (no suggestedPips, `state === 'credit-decline'`).
- `factors` array sums + base equals `suggestedPips` (algebraic invariant).
- `confidence` calculation: each branch covered.

**`/services/suggestion/rationale.ts`** — natural-language builder.
- Output ≤ 120 chars under all inputs.
- Output ends with "— suggesting {N} pips." for non-credit-decline cases.
- Fewer factors → shorter sentence, no awkward joins.

## 2. Component tests (Vitest + RTL)

Run alongside unit tests. File pattern: `Foo.test.tsx` next to `Foo.tsx`.

### Targets

- **`StatusCell.test.tsx`** — renders the right pill label & color for each status.
- **`RateCell.test.tsx`** — flash class applied on value change; cleared after 60ms.
- **`PricingPanel.test.tsx`** — most complex component:
  - Renders streaming bid/ask from feed.
  - +/− buttons increment/decrement margin field.
  - Clicking Bid box enters fixed mode (data attribute or class assertion).
  - Refresh button only visible in fixed mode.
  - Client summary updates when margin changes.
  - Margin field animates in response to a programmatic update from the SuggestionPanel's Apply.
- **`SuggestionPanel.test.tsx`** — second-most complex:
  - Renders the suggested pips, rationale, and confidence badge from a mocked engine output.
  - Shows "Recomputing…" shimmer state for the first 800ms after opening.
  - Apply button updates the deal's `marginPips` and collapses the panel to "Applied N pips · Undo".
  - Undo button restores the previous margin and re-expands the panel.
  - "Why?" button toggles the factors table.
  - Credit-decline state renders the Reject shortcut button instead of Apply.
- **`TicketFooter.test.tsx`** — correct buttons visible per state; hold-to-confirm works (use `fireEvent` with timers).
- **`MuteToggle.test.tsx`** — toggles `settingsStore.muted`; icon switches.
- **`ReasonsPanel.test.tsx`** — renders one chip per reason with the correct explanation text.

### Smoke

A `App.smoke.test.tsx` that renders the whole app and asserts no console errors, blotters present, dev injector hidden by default, visible at `?dev=1` (use `window.history.pushState` in the test).

## 3. E2E tests (Playwright)

Run with `pnpm test:e2e`. File: `tests/e2e/scenarios.spec.ts`. One `test()` per scenario in `07-scenario-pack.md`.

### Setup

```typescript
// tests/e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as any).__seedFeed = 42;     // deterministic prices
    });
    await page.goto('/?dev=1');
    await page.click('body');               // unlock audio for the mute test
    await use(page);
  },
});

export { expect };
```

### Tests

Direct port of each Gherkin scenario in `07-scenario-pack.md`. Use `data-testid` and `data-deal-status` for assertions, not text.

```typescript
test('Off-Hours Intervention end-to-end', async ({ page }) => {
  await page.getByTestId('inject-off-hours').click();

  const row = page.locator('[data-testid="active-blotter"] [data-si-state="Initial"][data-dealable="true"]').first();
  await expect(row).toBeVisible();
  await expect(row.locator('[data-testid="cell-client"]')).toHaveText('Globex Industries');

  // toast appears
  await expect(page.locator('[data-testid="toast"]').first()).toContainText('Globex Industries');

  // open ticket — pickup in-flight, then PickedUp
  await row.click();
  await expect(row).toHaveAttribute('data-si-state', 'PickedUp');

  const ticket = page.locator('[data-testid="ticket-panel"]');
  await expect(ticket).toBeVisible();
  await expect(ticket.locator('[data-testid="reasons-panel"]')).toContainText('Outside trading window');

  // hold-to-confirm Send Stream → QuoteSent → Quoted
  const sendBtn = ticket.locator('[data-testid="btn-send-stream"]');
  await sendBtn.dispatchEvent('pointerdown');
  await page.waitForTimeout(650);
  await sendBtn.dispatchEvent('pointerup');

  await expect(row).toHaveAttribute('data-si-state', 'Quoted');

  // client accepts after 1.5s scripted delay → TradeConfirmed
  await expect(row).toHaveAttribute('data-si-state', 'TradeConfirmed', { timeout: 3000 });

  // 5-second removal rule
  await expect(row).toBeHidden({ timeout: 6000 });

  // lands in historic
  await expect(
    page.locator('[data-testid="historic-blotter"] [data-testid="cell-client"]')
      .filter({ hasText: 'Globex Industries' })
  ).toBeVisible();
});
```

### Notification tests

Separate spec file `tests/e2e/notifications.spec.ts`:
- Mute toggle persists across reload (via `sessionStorage`).
- Muted: visual elements (`toast`, row flash) still appear; no `<audio>` plays.
- Unmuted: spy on `AudioContext.prototype.resume` and `OscillatorNode` creation to assert a sound was scheduled.

## 4. Visual / a11y (optional v1)

Out of scope for v1 testing infrastructure, but the implementation must keep the door open:

- All interactive elements have `data-testid` or stable selectors.
- `aria-label` on icon-only buttons (`MuteToggle`, `CloseTicket`).
- Color contrast verified by hand against tokens in `05-ui-ux-spec.md`.

## 5. Test data fixtures

Centralised in `tests/e2e/fixtures.ts` and `src/services/scenarios/definitions.ts`. The two files share the same client names, accounts, notional values — single source of truth in `definitions.ts`, imported by both tests and the app code.

## 6. CI configuration

`.github/workflows/ci.yml`:

```yaml
name: ci
on: [push, pull_request]
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
      - run: pnpm typecheck
      - run: pnpm lint
      - run: pnpm test:run
      - run: pnpm exec playwright install --with-deps chromium
      - run: pnpm test:e2e
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-trace
          path: test-results/
```

Total budget: 5 minutes per run.

## 7. Acceptance criteria (per scenario)

A scenario is considered "passing" when:

1. Its Playwright test runs green without retries on a clean checkout.
2. Manually running the same scenario via the Dev Injector produces visually identical behavior.
3. No console errors or unhandled promise rejections during the run.
4. The deal appears in Historic with the correct outcome label.

## 8. Coverage targets

These are floors, not ceilings:

| Area | Floor |
|---|---|
| `/src/lib/` | 90% lines |
| `/src/state/machines/` | 90% lines |
| `/src/services/feed/` | 80% lines |
| `/src/services/scenarios/` | 80% lines |
| `/src/services/suggestion/engine.ts` | **100% branches** |
| `/src/services/suggestion/rationale.ts` | 90% lines |
| `/src/features/ticket/PricingPanel.tsx` | 80% lines |
| `/src/features/ticket/SuggestionPanel.tsx` | 80% lines |
| Other components | smoke test only |
| E2E | All 5 scenarios + notifications spec + AI-suggestion spec |

`pnpm test:run --coverage` produces the report; CI does not fail on coverage (yet).

## 9. Out of scope for v1 testing

- Visual regression (Percy/Chromatic) — propose for v2.
- Load testing — not relevant for a single-user prototype.
- Cross-browser E2E — Chromium only in v1.
- A11y automated audit (axe-core) — manual contrast check is sufficient for v1.
- Mutation testing — disproportionate effort for prototype scope.
