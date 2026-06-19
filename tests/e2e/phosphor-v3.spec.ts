import { test } from '@playwright/test';

test('phosphor v3 glass screenshot', async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem('si.theme', 'dark');
  });

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const offHours = page.getByRole('button', { name: 'Off Hours' });
  if (await offHours.isVisible()) await offHours.click();
  await page.waitForTimeout(500);

  const credit = page.getByRole('button', { name: 'Credit Breach' });
  if (await credit.isVisible()) await credit.click();
  await page.waitForTimeout(500);

  const esp = page.getByRole('button', { name: 'Happy ESP' });
  if (await esp.isVisible()) await esp.click();
  await page.waitForTimeout(700);

  // Open the Off Hours deal — shows INTERVENE with AI suggestion + rate cells
  const rows = page.locator('[data-testid="active-blotter-body"] button');
  if (await rows.count() >= 1) await rows.nth(0).click();
  await page.waitForTimeout(700);

  await page.screenshot({ path: '/tmp/theme-phosphor-v3.png', fullPage: true });
});
