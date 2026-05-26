import { expect, test } from '@playwright/test';

// docs/07-scenario-pack.md Scenario 3 — Credit Breach. Asserts on
// data-si-state / data-display-status / data-outcome per the
// test-fidelity rules in §"Notes on test fidelity"; the FXSW-026
// credit-decline panel test-contract per docs/09 §13.
//
// Toast + document-title-prefix assertions are notification-layer
// behaviour landing in FXSW-028 and are intentionally omitted here.

test('CREDIT_BREACH — credit-decline suggestion + trader Reject end-to-end', async ({ page }) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=1');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  await expect(activeBody.locator('[data-deal-id]')).toHaveCount(0);

  // Inject the credit-breach scenario.
  await page.getByTestId('inject-CREDIT_BREACH').click();

  // A new INTERVENE row appears for Halcyon Capital / GBPUSD.
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 500 });
  await expect(row).toHaveAttribute('data-display-status', 'INTERVENE');
  await expect(row).toContainText('Halcyon Capital');
  await expect(row).toContainText('GBPUSD');
  // Blotter chip uses the short label; the ReasonsPanel inside the
  // ticket uses the longer one (asserted after the ticket opens).
  await expect(row).toContainText('Credit limit breach');

  const dealId = await row.getAttribute('data-deal-id');
  expect(dealId).toMatch(/^d_/);

  // Open the ticket. SI advances PickUp → PickedUp (ack zeroed).
  await row.click();
  const ticket = page.getByTestId('ticket-panel');
  await expect(ticket).toBeVisible();
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'PickedUp', { timeout: 1_000 });

  // ReasonsPanel inside the ticket shows the long label per docs/02 §4.1.
  await expect(page.getByTestId('reasons-panel')).toContainText(
    'Client credit limit would be breached',
  );

  // FXSW-026 credit-decline UI: data-suggestion-state="credit-decline",
  // §7 rationale text, Reject shortcut present, Apply absent.
  const panel = page.getByTestId('suggestion-panel');
  await expect(panel).toHaveAttribute('data-suggestion-state', 'credit-decline');
  await expect(panel).toContainText('recommend declining');
  await expect(page.getByTestId('suggestion-reject')).toBeVisible();
  await expect(page.getByTestId('suggestion-apply')).toHaveCount(0);

  // Hold the Reject shortcut for 600ms (hold-to-confirm per FXSW-026).
  // Playwright's click({ delay }) holds the pointer for the duration.
  await page.getByTestId('suggestion-reject').click({ delay: 700 });

  // SI cycles RejectSent → TraderRejected (ack zeroed); status REJECTED.
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'TraderRejected', { timeout: 1_500 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-display-status', 'REJECTED');

  // 5s removal rule fires; row migrates to Historic with the
  // "Rejected by Trader" outcome label.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(0, {
    timeout: 6_000,
  });
  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Rejected by Trader',
  );
});
