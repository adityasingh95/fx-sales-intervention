import { expect, test } from '@playwright/test';

// v3 (FXSW-057/059) — inject a scenario as a forward and exercise the forward
// pricing UI. Gated behind ?dev=v3; the bare URL has none of this.

test('v3 forward injection — forward points, all-in rates, component markup', async ({
  page,
}) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v3');

  // The external-feed indicator is present and OFF by default (no vendor name).
  await expect(page.getByTestId('external-feed-status')).toHaveAttribute(
    'data-feed-status',
    'off',
  );

  // Choose a 3M forward, then inject the off-hours scenario.
  await page.getByTestId('forward-tenor-select').selectOption('3M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const activeBody = page.getByTestId('active-blotter-body');
  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  // The blotter tenor column reflects the override.
  await expect(row).toContainText('3M');

  await row.click();
  await expect(page.getByTestId('ticket-panel')).toBeVisible();

  // The forward panel renders with points + all-in outright rates.
  const fwd = page.getByTestId('forward-points-panel');
  await expect(fwd).toBeVisible();
  await expect(fwd).toHaveAttribute('data-tenor', '3M');
  await expect(page.getByTestId('fwd-points')).not.toHaveText('');
  await expect(page.getByTestId('all-in-bid')).not.toHaveText('—', { timeout: 1_000 });

  // Component mode (default) shows the forward-points margin row.
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeVisible();

  // Toggling to all-in hides the forward-points margin row; back to component
  // restores it.
  await page.getByTestId('markup-mode-all-in').click();
  await expect(page.getByTestId('margin-input-fwd-bid')).toHaveCount(0);
  await page.getByTestId('markup-mode-component').click();
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeVisible();
});
