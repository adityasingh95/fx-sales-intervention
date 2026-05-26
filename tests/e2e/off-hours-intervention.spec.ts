import { expect, test } from '@playwright/test';

// docs/07-scenario-pack.md Scenario 2 — Off-Hours Intervention, transcribed
// to Playwright. Assertions hit data-si-state + data-display-status +
// data-outcome per the test-fidelity rules in §"Notes on test fidelity".
//
// The Gherkin scenario also asserts on a top-right notification toast +
// document title prefix; those are notification-layer behaviour that
// lands in FXSW-028 and are intentionally omitted here.

test('OFF_HOURS_INTERVENTION — full trader-driven SI flow', async ({ page }) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=1');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  // Given the Active blotter is empty.
  await expect(activeBody.locator('[data-deal-id]')).toHaveCount(0);
  await expect(historicBody.locator('[data-deal-id]')).toHaveCount(0);

  // When the operator clicks "Inject: Off-Hours Intervention" …
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  // Then within 500ms a new row appears with status INTERVENE and the
  // right client/pair/reason.
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 500 });
  await expect(row).toHaveAttribute('data-display-status', 'INTERVENE');
  await expect(row).toContainText('Globex Industries');
  await expect(row).toContainText('USDJPY');
  await expect(row).toContainText('Outside trading window');

  // Capture dealId so we can scope assertions to this specific row.
  const dealId = await row.getAttribute('data-deal-id');
  expect(dealId).toMatch(/^d_/);

  // When the operator clicks the new row, the ticket panel slides in.
  await row.click();
  const ticket = page.getByTestId('ticket-panel');
  await expect(ticket).toBeVisible();
  await expect(ticket).toHaveAttribute('data-deal-id', dealId ?? '');

  // The Reasons Panel shows the OFF_HOURS label per docs/02 §4.1.
  await expect(page.getByTestId('reasons-panel')).toContainText(
    'Outside trading window',
  );

  // The Pricing Panel shows a streaming Bid and Ask for USDJPY (i.e. not
  // the em-dash placeholder).
  await expect(page.getByTestId('bid-cell')).not.toHaveText('—', { timeout: 1_000 });
  await expect(page.getByTestId('ask-cell')).not.toHaveText('—');

  // Margin field shows 3 (the dealFeed default per docs/04 §4.3).
  await expect(page.getByTestId('margin-input')).toHaveValue('3');

  // SI machine should have advanced past Initial (PickUp fired on open,
  // ack delay zeroed via __zeroAckDelay → straight to PickedUp).
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'PickedUp', { timeout: 1_000 });

  // When the operator clicks Send Stream and holds for 600ms (the
  // hold-to-confirm window for Reject + Send Stream per docs/02 §4.7).
  // Playwright's click({ delay }) holds the pointer for that duration.
  await page.getByTestId('btn-send-stream').click({ delay: 700 });

  // Then the row's SI state transitions through QuoteSent to Quoted
  // (the QuoteSent ack delay is zeroed) and the displayed status flips
  // to STREAMING.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'Quoted',
    { timeout: 1_500 },
  );
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-display-status',
    'STREAMING',
  );

  // The ticket footer now shows Withdraw + Reject (Send Stream + Send
  // Quote hidden in the Quoted state).
  await expect(page.getByTestId('btn-withdraw')).toBeVisible();
  await expect(page.getByTestId('btn-reject')).toBeVisible();
  await expect(page.getByTestId('btn-send-stream')).toHaveCount(0);

  // When 1.5 seconds pass — the scripted CLIENT_ACCEPT fires
  // (OFF_HOURS_INTERVENTION schedules it after 1500ms once SI reaches
  // Quoted, per docs/04 §5.2). The bootstrap forwards CLIENT_ACCEPT
  // into the deal machine as a TradeConfirmed event.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'TradeConfirmed',
    { timeout: 3_000 },
  );
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-display-status',
    'DONE',
  );

  // When 5 seconds pass — the blotter-removal rule fires (the siMachine
  // transitions to Removed via after: removalDelay, which the
  // dealsStore observes and archives).
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(0, {
    timeout: 6_000,
  });
  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Executed',
  );
});
