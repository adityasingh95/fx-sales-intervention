import { expect, test } from '@playwright/test';

// v3 (FXSW-060) — drive a deal to completion, then open the historical trade
// detail overlay from the (now clickable) Historic row and assert the timeline.

test('v3 historical detail — clickable historic row opens timeline overlay', async ({
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

  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  const dealId = await row.getAttribute('data-deal-id');

  // Open the ticket (fires PickUp) and send a stream price.
  await row.click();
  await expect(page.getByTestId('ticket-panel')).toBeVisible();
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'PickedUp',
    { timeout: 1_500 },
  );
  await page.getByTestId('btn-send-stream').click({ delay: 700 });

  // Scripted CLIENT_ACCEPT → TradeConfirmed → archived to Historic.
  await expect(historicBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-outcome',
    'Executed',
    { timeout: 12_000 },
  );

  // Click the historic row → the read-only detail overlay opens.
  await historicBody.locator(`[data-deal-id="${dealId}"]`).click();
  const detail = page.getByTestId('historic-detail-panel');
  await expect(detail).toBeVisible();
  await expect(detail).toHaveAttribute('data-deal-id', dealId ?? '');
  await expect(page.getByTestId('detail-outcome')).toHaveAttribute(
    'data-outcome',
    'Executed',
  );

  // FXSW-066: a Request ID and (since the deal executed) a Trade ID are shown.
  await expect(page.getByTestId('detail-request-id')).toHaveText(/^REQ-/);
  await expect(page.getByTestId('detail-trade-id')).toHaveText(/^TRD-/);

  // The timeline shows the lifecycle phases in order.
  const timeline = page.getByTestId('timeline-panel');
  await expect(timeline).toBeVisible();
  await expect(timeline.locator('[data-phase="REQUEST"]')).toHaveCount(1);
  await expect(timeline.locator('[data-phase="PICKUP"]')).toHaveCount(1);
  await expect(timeline.locator('[data-phase="PRICE_BACK"]')).toHaveCount(1);
  await expect(timeline.locator('[data-phase="RESPONSE"]')).toHaveCount(1);

  // The markup-reason block is present.
  await expect(page.getByTestId('markup-reason')).toBeVisible();

  // Esc closes the overlay.
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
});
