import { expect, test } from '@playwright/test';

// v4 (FXSW-078/079) — inject a scenario as an NDF and exercise the points-only
// ticket. Gated behind ?dev=v4 (a superset of v3); the bare URL and ?dev=v3 have
// no instrument selector.

test('v4 NDF injection — points-only ticket: no spot margin, no markup toggle, ndf-note', async ({
  page,
}) => {
  test.setTimeout(20_000);

  await page.addInitScript(() => {
    (window as Window & { __seedFeed?: number }).__seedFeed = 42;
    (window as Window & { __zeroAckDelay?: boolean }).__zeroAckDelay = true;
  });

  await page.goto('/?dev=v4');

  // The v4 instrument selector is present; choose NDF. No tenor override — the
  // injector/buildDeal coerces an NDF on a SPOT request to a forward tenor.
  const instrumentSelect = page.getByTestId('inject-instrument');
  await expect(instrumentSelect).toBeVisible();
  await instrumentSelect.selectOption('NDF');
  await page.getByTestId('inject-OFF_HOURS_INTERVENTION').click();

  const row = page.getByTestId('active-blotter-body').locator('[data-deal-id]').first();
  await expect(row).toBeVisible({ timeout: 1_000 });
  // FXSW-080: the v4-only instrument column shows the instrument on the row.
  await expect(row.getByTestId('deal-instrument')).toHaveText('NDF');
  await row.click();

  const panel = page.getByTestId('ticket-panel');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('data-instrument', 'NDF');
  await expect(page.getByTestId('ndf-note')).toBeVisible();

  // The Trader Rate cells stay (the spot still feeds the outright) but the
  // spot-margin steppers and the all-in/per-component toggle are gone.
  await expect(page.getByTestId('bid-cell')).toBeVisible();
  await expect(page.getByTestId('margin-input-bid')).toHaveCount(0);
  await expect(page.getByTestId('markup-mode-toggle')).toHaveCount(0);

  // Markup is taken on the forward points — those steppers remain, and the
  // two-sided points cells render.
  await expect(page.getByTestId('margin-input-fwd-bid')).toBeVisible();
  await expect(page.getByTestId('fwd-points-bid')).not.toHaveText('');
});
