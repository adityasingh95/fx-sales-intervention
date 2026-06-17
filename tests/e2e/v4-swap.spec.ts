import { expect, test } from '@playwright/test';

// v4 (FXSW-082/085) — inject a forward-forward swap and exercise the two-leg
// pricing panel: per-leg points, the net-differential row, the markup-mode
// toggle, and the one-sided lock. Gated behind ?dev=v4.

test('v4 swap injection — two-leg ticket: per-leg points, net row, markup-mode toggle', async ({
  page,
}) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v4');

  // Choose SWAP — the far-leg tenor selector appears. Near leg = 1M, far = 6M.
  await page.getByTestId('inject-instrument').selectOption('SWAP');
  await expect(page.getByTestId('inject-far-tenor')).toBeVisible();
  await page.getByTestId('forward-tenor-select').selectOption('1M');
  await page.getByTestId('inject-far-tenor').selectOption('6M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const row = page.getByTestId('active-blotter-body').locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  await expect(row.getByTestId('deal-instrument')).toHaveText('SWAP');
  await row.click();

  const panel = page.getByTestId('ticket-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-instrument', 'SWAP');

  // Two-leg panel with per-leg points and the net differential row.
  await expect(page.getByTestId('swap-panel')).toBeVisible();
  await expect(page.getByTestId('leg-near')).toHaveAttribute('data-tenor', '1M');
  await expect(page.getByTestId('leg-far')).toHaveAttribute('data-tenor', '6M');
  await expect(page.getByTestId('leg-near-points-bid')).not.toHaveText('');
  await expect(page.getByTestId('swap-net-bid')).not.toHaveText('');
  await expect(page.getByTestId('swap-net-ask')).not.toHaveText('');

  // Per-component is the default — a margin on each leg, no net-points margin.
  await expect(page.getByTestId('margin-input-near-bid')).toBeVisible();
  await expect(page.getByTestId('margin-input-far-ask')).toBeVisible();
  await expect(page.getByTestId('margin-input-net-bid')).toHaveCount(0);

  // Switching to Total swaps in a single net-points margin.
  await page.getByTestId('swap-markup-mode-total').click();
  await expect(page.getByTestId('margin-input-net-bid')).toBeVisible();
  await expect(page.getByTestId('margin-input-near-bid')).toHaveCount(0);
});
