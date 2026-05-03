import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('header navigates to operations modules', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Shipments', exact: true }).click();
    await expect(page).toHaveURL(/\/ops\/shipments/);
    await page.getByRole('button', { name: 'Packages', exact: true }).click();
    await expect(page).toHaveURL(/\/ops\/packages/);
  });

  test('header navigates to master data modules', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: /customers/i }).first()).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Warehouses', exact: true }).click();
    await expect(page).toHaveURL(/\/master\/warehouses/);
  });

  test('command palette opens on Ctrl+K', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    await expect(page.getByPlaceholder('Search shipments, packages, customers...')).toBeVisible();
  });

  test('command palette search finds results', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    await page.keyboard.press('Control+k');
    await page.getByPlaceholder('Search shipments, packages, customers...').fill('Ahmad');
    // Wait for debounced search (300ms) + network
    await page.waitForTimeout(1500);
    // Should show customer results as ListItemButton elements inside the dialog
    const results = page.locator('[role="dialog"] .MuiListItemButton-root');
    await expect(results.first()).toBeVisible({ timeout: 5000 });
  });
});
