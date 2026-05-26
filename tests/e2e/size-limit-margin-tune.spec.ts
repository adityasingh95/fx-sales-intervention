import { expect, test } from '@playwright/test';

// docs/07-scenario-pack.md Scenario 4 — Size Limit + Margin Tune. The
// AI-suggestion happy path: trader opens an intervention ticket, AI
// Margin Suggestion lands at 4 pips high-confidence, trader clicks
// Apply, margin updates, sends the stream, client accepts.
//
// Notification-layer assertions (toast, doc-title prefix) deferred to
// FXSW-028 per the OFF_HOURS spec convention.

test('SIZE_LIMIT_MARGIN_TUNE — AI suggestion Apply + Send Stream end-to-end', async ({ page }) => {
  test.setTimeout(25_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=1');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  await expect(activeBody.locator('[data-deal-id]')).toHaveCount(0);

  await page.getByTestId('inject-SIZE_LIMIT_MARGIN_TUNE').click();

  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 500 });
  await expect(row).toHaveAttribute('data-display-status', 'INTERVENE');
  await expect(row).toContainText('Northwind FX');
  await expect(row).toContainText('EURUSD');
  // Blotter chip uses the short label per src/features/blotter/ReasonsCell.tsx.
  await expect(row).toContainText('Size > auto-pricer band');

  const dealId = await row.getAttribute('data-deal-id');
  expect(dealId).toMatch(/^d_/);

  // Open the ticket; SI advances to PickedUp (ack zeroed).
  await row.click();
  const ticket = page.getByTestId('ticket-panel');
  await expect(ticket).toBeVisible();
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'PickedUp', { timeout: 1_000 });

  // Margin starts at the dealFeed default (3 pips).
  await expect(page.getByTestId('margin-input')).toHaveValue('3');

  // AI Suggestion Panel lands ready, high confidence, 4 pips.
  // (Computed after the first tick lands; allow up to 1s for the feed.)
  const panel = page.getByTestId('suggestion-panel');
  await expect(panel).toHaveAttribute('data-suggestion-state', 'ready', {
    timeout: 1_500,
  });
  await expect(page.getByTestId('suggestion-pips')).toHaveText('4');
  await expect(page.getByTestId('suggestion-confidence')).toHaveText(/high/i);
  const rationale = page.getByTestId('suggestion-rationale');
  // docs/09 §8 — the gold/12M EURUSD example. Match either fragment
  // per the FXSW-027 AC ("rationale contains 'Gold-tier' or '12M EURUSD'").
  await expect(rationale).toHaveText(/Gold-tier|12M EURUSD/);

  // Apply → margin animates to 4; panel collapses to "Applied 4 pips · Undo".
  await page.getByTestId('suggestion-apply').click();
  await expect(page.getByTestId('margin-input')).toHaveValue('4');
  await expect(panel).toHaveAttribute('data-suggestion-state', 'applied');
  await expect(panel).toContainText(/Applied 4 pips/);
  await expect(page.getByTestId('suggestion-undo')).toBeVisible();

  // Hold Send Stream for 600ms → SI cycles QuoteSent → Quoted; STREAMING.
  await page.getByTestId('btn-send-stream').click({ delay: 700 });

  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'Quoted', { timeout: 1_500 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-display-status', 'STREAMING');

  // After 2s, the scenario's CLIENT_ACCEPT follow-up fires → TradeConfirmed.
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'TradeConfirmed', { timeout: 3_500 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-display-status', 'DONE');

  // 5s removal → Historic with Executed.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(0, {
    timeout: 6_000,
  });
  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Executed',
  );
});
