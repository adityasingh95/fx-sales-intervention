import { expect, test } from '@playwright/test';

// docs/07-scenario-pack.md Scenario 5 — Release Path. The trader picks
// up an intervention ticket, decides not to price it, hands it back to
// the desk via Release. Row stays in the Active blotter, ticket closes,
// dealable flips back to true.
//
// No CLIENT_ACCEPT / TraderRejected follow-up — the deal stays live
// until something else terminates it. The E2E only asserts the
// pickup → release round-trip.

test('RELEASE_PATH — pickup then release; row stays Active, dealable returns', async ({ page }) => {
  test.setTimeout(15_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=1');
  const activeBody = page.getByTestId('active-blotter-body');

  await expect(activeBody.locator('[data-deal-id]')).toHaveCount(0);

  // Inject the Release Path scenario.
  await page.getByTestId('inject-RELEASE_PATH').click();

  // INTERVENE row for Polaris Holdings / USDINR.
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 500 });
  await expect(row).toHaveAttribute('data-display-status', 'INTERVENE');
  await expect(row).toContainText('Polaris Holdings');
  await expect(row).toContainText('USDINR');
  await expect(row).toHaveAttribute('data-dealable', 'true');

  const dealId = await row.getAttribute('data-deal-id');
  expect(dealId).toMatch(/^d_/);

  // Open the ticket. SI advances PickUp → PickedUp (ack zeroed). Row's
  // dealable becomes false; display status flips to PICKED UP.
  await row.click();
  const ticket = page.getByTestId('ticket-panel');
  await expect(ticket).toBeVisible();
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'PickedUp', { timeout: 1_000 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-dealable', 'false');
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-display-status', 'PICKED UP');

  // Click Release. The footer Release button fires Hold + closes the
  // ticket (FXSW-031). SI cycles HoldSent → Initial; dealable returns
  // to true; status flips back to INTERVENE.
  await page.getByTestId('btn-release').click();
  await expect(ticket).toHaveCount(0, { timeout: 1_500 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-si-state', 'Initial', { timeout: 1_500 });
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-dealable', 'true');
  await expect(
    activeBody.locator(`[data-deal-id="${dealId}"]`),
  ).toHaveAttribute('data-display-status', 'INTERVENE');

  // Row is still visible in Active (no removal — released ticket waits
  // for another trader to pick it up or for the deal feed to time it out).
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(1);
});
