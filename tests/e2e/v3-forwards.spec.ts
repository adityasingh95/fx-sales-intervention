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

  // Choose a 3M forward, then inject a two-sided inquiry (both bid + ask are
  // quotable, so the Balance/Zero shortcuts below are meaningful).
  await page.getByTestId('forward-tenor-select').selectOption('3M');
  await page.getByTestId('inject-BOTH_SIDED_INQUIRY').click();

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
  // FXSW-075: two-sided points — bid/mid/ask cells, each non-empty.
  await expect(page.getByTestId('fwd-points-bid')).not.toHaveText('');
  await expect(page.getByTestId('fwd-points-mid')).not.toHaveText('');
  await expect(page.getByTestId('fwd-points-ask')).not.toHaveText('');
  await expect(page.getByTestId('all-in-bid')).not.toHaveText('—', { timeout: 1_000 });

  // Component mode (default) shows the forward-points margin row + its own
  // Balance/Zero controls.
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeVisible();
  await expect(page.getByTestId('margin-balance-fwd')).toBeVisible();
  await expect(page.getByTestId('margin-zero-fwd')).toBeVisible();

  // Freeze the rate (fixed mode) so the all-in figure only moves on markup,
  // then confirm bumping the spot bid margin moves the all-in bid — i.e. the
  // markup is now reflected in the outright (FXSW-064).
  await page.getByTestId('bid-cell').click();
  const allInBid = page.getByTestId('all-in-bid');
  const beforeBid = await allInBid.textContent();
  await page.getByTestId('margin-plus-bid').click();
  await expect(allInBid).not.toHaveText(beforeBid ?? '');

  // Toggling to all-in hides the forward-points margin row + its Balance/Zero;
  // back to component restores them.
  await page.getByTestId('markup-mode-all-in').click();
  await expect(page.getByTestId('margin-input-fwd-bid')).toHaveCount(0);
  await expect(page.getByTestId('margin-balance-fwd')).toHaveCount(0);
  await page.getByTestId('markup-mode-component').click();
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeVisible();
});

test('v3 one-sided forward — off-side markup is locked, Balance/Zero hidden (FXSW-068)', async ({
  page,
}) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v3');

  // OFF_HOURS is a SELL on a base-dealt pair → the bank quotes the BID only.
  await page.getByTestId('forward-tenor-select').selectOption('3M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const row = page.getByTestId('active-blotter-body').locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  await row.click();
  await expect(page.getByTestId('ticket-panel')).toBeVisible();
  await expect(page.getByTestId('forward-points-panel')).toBeVisible();

  // Spot markup: bid editable, ask locked, Balance/Zero gone.
  await expect(page.getByTestId('margin-input-bid')).toBeEnabled();
  await expect(page.getByTestId('margin-input-ask')).toBeDisabled();
  await expect(page.getByTestId('margin-balance')).toHaveCount(0);
  await expect(page.getByTestId('margin-zero')).toHaveCount(0);

  // Forward-points markup mirrors the same lock.
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeEnabled();
  await expect(page.getByTestId('margin-input-fwd-ask')).toBeDisabled();
  await expect(page.getByTestId('margin-balance-fwd')).toHaveCount(0);
});
