import { test, expect } from '@playwright/test';

test('app loads and body exists', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expect(page.locator('#root')).toContainText('FX Sales Workstation');
});
