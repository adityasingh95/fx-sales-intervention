import { expect, test } from '@playwright/test';

// v4 (FXSW-082/085) — inject a forward-forward swap and exercise the two-layer
// pricing panel: per-leg component markup (SwapLegsSection) + all-in net markup
// (side tiles), per-leg points, the component-net row, and the one-sided lock.
// Gated behind ?dev=v4.

test('v4 swap injection — two-layer ticket: per-leg + all-in markup, side tiles', async ({
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

  // Legs section: per-leg bid/ask points + prominent component net.
  await expect(page.getByTestId('swap-panel')).toBeVisible();
  await expect(page.getByTestId('swap-legs-section')).toBeVisible();
  await expect(page.getByTestId('leg-near-points-bid')).not.toHaveText('');
  await expect(page.getByTestId('leg-far-points-ask')).not.toHaveText('');
  await expect(page.getByTestId('swap-net-bid')).not.toHaveText('');
  await expect(page.getByTestId('swap-net-ask')).not.toHaveText('');

  // Layer 1: per-component steppers (near + far, bid + ask) always visible.
  await expect(page.getByTestId('margin-input-near-bid')).toBeVisible();
  await expect(page.getByTestId('margin-input-far-ask')).toBeVisible();

  // Layer 2: all-in net steppers in the side tiles, no mode toggle.
  await expect(page.getByTestId('margin-input-net-bid')).toBeVisible();
  await expect(page.getByTestId('margin-input-net-ask')).toBeVisible();
  await expect(page.getByTestId('swap-markup-mode')).toHaveCount(0);

  // Side tiles.
  await expect(page.getByTestId('swap-side-bid')).toBeVisible();
  await expect(page.getByTestId('swap-side-ask')).toBeVisible();
});

test('v4 swap — legs-adjusted note on far ≤ near; margins reset across injections (FXSW-091 F-1/F-3)', async ({
  page,
}) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v4');
  const activeBody = page.getByTestId('active-blotter-body');

  // Deal A — an out-of-order request (near 6M, far 1M) is coerced and flagged.
  await page.getByTestId('inject-instrument').selectOption('SWAP');
  await page.getByTestId('forward-tenor-select').selectOption('6M');
  await page.getByTestId('inject-far-tenor').selectOption('1M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const rowA = activeBody.locator('[data-deal-id]').first();
  await expect(rowA).toBeVisible({ timeout: 1_000 });
  const aId = await rowA.getAttribute('data-deal-id');
  await rowA.click();
  await expect(page.getByTestId('swap-adjust-note')).toBeVisible();

  // Mark up the net bid on A, then close the ticket.
  await page.getByTestId('margin-plus-net-bid').click();
  await expect(page.getByTestId('margin-input-net-bid')).toHaveValue('1');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('ticket-panel')).toHaveCount(0);

  // Deal B — a valid forward-forward (near 1M, far 6M).
  await page.getByTestId('forward-tenor-select').selectOption('1M');
  await page.getByTestId('inject-far-tenor').selectOption('6M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const rowB = activeBody.locator(`[data-deal-id]:not([data-deal-id="${aId}"])`).first();
  await expect(rowB).toBeVisible({ timeout: 1_000 });
  await rowB.click();
  // B opens with no adjust note and zero margins on both layers — A's markup did not leak.
  await expect(page.getByTestId('swap-adjust-note')).toHaveCount(0);
  await expect(page.getByTestId('margin-input-net-bid')).toHaveValue('0');
  await expect(page.getByTestId('margin-input-near-bid')).toHaveValue('0');
});

test('v4 swap lifecycle — archives to Historic; detail overlay lists per-leg + net (FXSW-086)', async ({
  page,
}) => {
  test.setTimeout(25_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v4');
  const activeBody = page.getByTestId('active-blotter-body');
  const historicBody = page.getByTestId('historic-blotter-body');

  await page.getByTestId('inject-instrument').selectOption('SWAP');
  await page.getByTestId('forward-tenor-select').selectOption('1M');
  await page.getByTestId('inject-far-tenor').selectOption('6M');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const row = activeBody.locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  const dealId = await row.getAttribute('data-deal-id');
  await row.click();

  await expect(page.getByTestId('ticket-panel')).toHaveAttribute('data-instrument', 'SWAP');
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'PickedUp',
    { timeout: 1_500 },
  );

  // Send the swap quote; the scripted CLIENT_ACCEPT confirms it, then it archives.
  await page.getByTestId('btn-send-stream').click({ delay: 700 });
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveAttribute(
    'data-si-state',
    'TradeConfirmed',
    { timeout: 4_000 },
  );
  await expect(activeBody.locator(`[data-deal-id="${dealId}"]`)).toHaveCount(0, { timeout: 7_000 });

  const historicRow = historicBody.locator(`[data-deal-id="${dealId}"]`);
  await expect(historicRow).toHaveAttribute('data-outcome', 'Executed');
  await historicRow.click();

  // The detail overlay lists both legs, the net differential, and the net used
  // for execution (captured swap margin).
  const detail = page.getByTestId('historic-detail-panel');
  await expect(detail).toBeVisible();
  await expect(page.getByTestId('swap-detail')).toBeVisible();
  await expect(page.getByTestId('swap-detail-near')).toContainText('1M');
  await expect(page.getByTestId('swap-detail-far')).toContainText('6M');
  await expect(page.getByTestId('swap-detail-net-bid')).not.toHaveText('');
  await expect(page.getByTestId('swap-detail-exec-bid')).toBeVisible();
});
