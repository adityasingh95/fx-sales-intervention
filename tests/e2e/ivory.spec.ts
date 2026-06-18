import { test } from '@playwright/test';

test('ivory screenshot', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('si.theme', 'light');
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const esp = page.getByRole('button', { name: 'Happy ESP' });
  if (await esp.isVisible()) await esp.click();
  await page.waitForTimeout(500);

  const offHours = page.getByRole('button', { name: 'Off Hours' });
  if (await offHours.isVisible()) await offHours.click();
  await page.waitForTimeout(500);

  const credit = page.getByRole('button', { name: 'Credit Breach' });
  if (await credit.isVisible()) await credit.click();
  await page.waitForTimeout(700);

  // Open the INTERVENE deal to show AI suggestion panel in ticket
  const rows = page.locator('[data-testid="active-blotter-body"] button');
  if (await rows.count() >= 2) await rows.nth(1).click();
  else if (await rows.count() >= 1) await rows.nth(0).click();
  await page.waitForTimeout(600);

  await page.screenshot({ path: '/tmp/theme-ivory.png', fullPage: true });
});
