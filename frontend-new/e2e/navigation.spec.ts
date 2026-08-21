import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
  test('app launcher opens, filters, and navigates', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.getByRole('button', { name: 'Open app launcher' }).click();

    const launcher = page.getByRole('dialog');
    await expect(launcher.getByText('App Launcher')).toBeVisible();

    // Search filters the module tiles
    await launcher.getByPlaceholder('Search modules…').fill('ware');
    await expect(launcher.getByText('Warehouses')).toBeVisible();
    await expect(launcher.getByText('Shipments', { exact: true })).toHaveCount(0);

    await launcher.getByText('Warehouses').click();
    await expect(page).toHaveURL(/\/master\/warehouses/);
    await expect(page.getByRole('heading', { name: 'Warehouses', level: 1 })).toBeVisible();
  });

  test('header nav shows only current app modules', async ({ page }) => {
    await page.goto('/ops/dashboard');
    const nav = page.locator('header nav').first();
    await expect(nav.getByRole('link', { name: 'Shipments' })).toBeVisible();
    // Master-data module must not be in the ops nav
    await expect(nav.getByRole('link', { name: 'Warehouses' })).toHaveCount(0);

    await page.goto('/master/warehouses');
    await expect(nav.getByRole('link', { name: 'Warehouses' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Shipments' })).toHaveCount(0);
  });

  test('command palette (Ctrl+K) navigates to a module', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.keyboard.press('Control+k');
    const palette = page.getByRole('dialog');
    await expect(palette.getByPlaceholder(/Search pages/)).toBeVisible();

    await palette.getByPlaceholder(/Search pages/).fill('Good Types');
    await palette.getByRole('option', { name: /Good Types/ }).first().click();
    await expect(page).toHaveURL(/\/master\/good-types/);
  });
});
