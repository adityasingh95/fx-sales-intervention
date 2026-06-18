import { test } from '@playwright/test';
test('obsidian screenshot', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // Inject deals
  const esp = page.getByRole('button', { name: 'Happy ESP' });
  if (await esp.isVisible()) await esp.click();
  await page.waitForTimeout(600);
  const offHours = page.getByRole('button', { name: 'Off Hours' });
  if (await offHours.isVisible()) await offHours.click();
  await page.waitForTimeout(600);
  const credit = page.getByRole('button', { name: 'Credit Breach' });
  if (await credit.isVisible()) await credit.click();
  await page.waitForTimeout(800);
  // Click first deal to open ticket
  const row = page.locator('[data-testid="active-blotter-body"] button').first();
  if (await row.count() > 0) await row.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/theme-obsidian.png', fullPage: true });
});
