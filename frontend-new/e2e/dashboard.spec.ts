import { test, expect } from '@playwright/test';

test.describe('dashboard', () => {
  test('renders stat cards from seed data', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    // Seed: 20 active customers
    const customersCard = page.locator('div').filter({ hasText: /^Customers/ }).last();
    await expect(page.getByText('Customers', { exact: true })).toBeVisible();
    await expect(customersCard.getByText('20', { exact: true }).first()).toBeVisible();

    await expect(page.getByText('Shipments', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Packages', { exact: true }).first()).toBeVisible();

    // Admin sees the financial card (Field must not — covered in rbac.spec)
    await expect(page.getByText('Pending Charges')).toBeVisible();
  });

  test('shows the low-container warning on a fresh database', async ({ page }) => {
    await page.goto('/ops/dashboard');
    // Fresh seed has 0 Draft/Scheduled shipments → warning shows
    await expect(page.getByText(/active container/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Shipment' })).toBeVisible();
  });
});
