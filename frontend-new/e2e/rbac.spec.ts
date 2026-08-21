import { test, expect } from '@playwright/test';

test.describe('RBAC — Field user', () => {
  test.use({ storageState: 'e2e/.auth/field.json' });

  test('deep links to forbidden modules redirect to the dashboard', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/ops\/dashboard/);

    await page.goto('/master/pricing-configs');
    await expect(page).toHaveURL(/\/ops\/dashboard/);

    await page.goto('/comms/group-helper-export');
    await expect(page).toHaveURL(/\/ops\/dashboard/);
  });

  test('financial card is hidden on the dashboard', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    await expect(page.getByText('Customers', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending Charges')).toHaveCount(0);
  });

  test('warehouses page is read-only (no create button)', async ({ page }) => {
    await page.goto('/master/warehouses');
    await expect(page.getByRole('heading', { name: 'Warehouses', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Warehouse' })).toHaveCount(0);
  });
});

test.describe('RBAC — Admin', () => {
  test('users page is reachable and lists the roster', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible();
    await expect(page.getByText('admin@local')).toBeVisible();
  });
});
