import { expect, test } from '@playwright/test';

// docs/07-scenario-pack.md Scenario 1 transcribed to Playwright. Assertions
// hit the data-* attributes the FXSW-012 row exposes (data-deal-id,
// data-display-status) rather than text/colour, per the test-fidelity
// note in §Notes on test fidelity.
test('HAPPY_PATH_ESP — ESP deal flows from inject → AUTO → DONE → Historic', async ({
  page,
}) => {
  // Pin the pricing-feed RNG seed + zero the *Sent ack delays before the
  // app boots, per the test-fidelity rules in 07-scenario-pack.md.
  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  // Given the Active blotter is empty.
  await expect(activeBody.locator('[data-deal-id]')).toHaveCount(0);
  await expect(historicBody.locator('[data-deal-id]')).toHaveCount(0);

  // When the operator clicks "Inject: Happy Path ESP"…
  await page.getByTestId('inject-HAPPY_PATH_ESP').click();

  // Then within 500ms a new row appears with status AUTO + the expected
  // client/pair/amount.
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 500 });
  await expect(row).toHaveAttribute('data-display-status', 'AUTO');
  await expect(row).toContainText('Acme Corp');
  await expect(row).toContainText('EURUSD');
  await expect(row).toContainText('1,000,000');
  await expect(row).toContainText('EUR');

  // After 2 seconds (the scripted CLIENT_ACCEPT) the row's status is DONE.
  await expect(row).toHaveAttribute('data-display-status', 'DONE', { timeout: 3000 });

  // Capture the dealId so we can check Historic for it after the 5s rule.
  const dealId = await row.getAttribute('data-deal-id');
  expect(dealId).toMatch(/^d_/);

  // After 5 more seconds (the blotter-removal rule) the row leaves Active
  // and lands in Historic with outcome=Executed.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(0, {
    timeout: 6000,
  });
  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Executed',
  );
});
