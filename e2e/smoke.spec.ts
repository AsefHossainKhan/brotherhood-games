import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page.locator('text=Brotherhood Games')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('text=Connected')).toBeVisible({ timeout: 10_000 });
});
