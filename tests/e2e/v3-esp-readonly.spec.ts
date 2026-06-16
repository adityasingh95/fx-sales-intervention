import { expect, test } from '@playwright/test';

// v3 (FXSW-069/070) — a happy auto-priced (ESP) deal needs no intervention, so
// opening it shows a read-only view (no PickUp, no pricing controls) and its
// timeline records an AUTO_PRICE waypoint rather than a trader PRICE_BACK.
// Gated behind ?dev=v3; on the bare GA URL clicking an ESP row still picks up.

test('v3 ESP — happy auto-priced deal opens read-only and logs AUTO_PRICE', async ({
  page,
}) => {
  test.setTimeout(25_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v3');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  await page.getByTestId('inject-HAPPY_PATH_ESP').click();
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  await expect(row).toHaveAttribute('data-display-status', 'AUTO');
  const dealId = await row.getAttribute('data-deal-id');

  // Opening the AUTO deal shows the read-only view: no PickUp fires (SI stays
  // Initial), and the manual pricing panel + footer are absent.
  await row.click();
  const ticket = page.getByTestId('ticket-panel');
  await expect(ticket).toBeVisible();
  await expect(ticket).toHaveAttribute('data-readonly', 'true');
  await expect(page.getByTestId('auto-priced-note')).toBeVisible();
  await expect(page.getByTestId('pricing-panel')).toHaveCount(0);
  await expect(page.getByTestId('ticket-footer')).toHaveCount(0);
  // The deal was not pulled into manual handling.
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'Initial',
  );

  // Close the read-only view; the scripted CLIENT_ACCEPT confirms the trade.
  await page.keyboard.press('Escape');
  await expect(ticket).toHaveCount(0);

  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Executed',
    { timeout: 12_000 },
  );

  // The historic detail timeline reads Auto-priced, not Priced back.
  await historicBody.locator(`[data-deal-id="${dealId}"]`).click();
  const detail = page.getByTestId('historic-detail-panel');
  await expect(detail).toBeVisible();
  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline.locator('[data-phase="AUTO_PRICE"]')).toHaveCount(1);
  await expect(timeline.locator('[data-phase="PRICE_BACK"]')).toHaveCount(0);
  await expect(page.getByTestId('markup-reason')).toContainText('Auto-priced');
});
