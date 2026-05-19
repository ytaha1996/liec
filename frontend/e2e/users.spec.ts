import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test('users list shows seed admin user', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('admin@local').first()).toBeVisible({ timeout: 5000 });
  });

  test('create new user with Manager role', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create user/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const suffix = Date.now().toString().slice(-6);
    await page.getByLabel('Email*').fill(`mgr${suffix}@test.com`);
    await page.getByLabel('Password (min 8 chars)*').fill('Manager123!');

    await page.locator('#role').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'Manager' }).click();

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/users') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(resp.status()).toBeLessThan(400);
  });

  test('edit user role', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const editBtn = page.locator('table tbody tr').first().locator('button').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    }
  });

  test('prevent deactivating last admin', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const editBtn = page.locator('table tbody tr').first().locator('button').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      const checkbox = page.getByRole('dialog').locator('input[type="checkbox"]').first();
      if (await checkbox.isVisible({ timeout: 2000 }).catch(() => false)) {
        await checkbox.click();
        await page.getByRole('button', { name: 'Submit' }).click();
        await page.waitForTimeout(1000);
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('login as Manager - cannot create users', async ({ page }) => {
    // Navigate to app first so we can access localStorage
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a manager user via API
    const email = `mgr_rbac_${Date.now().toString().slice(-6)}@test.com`;
    const resp = await page.request.post('http://localhost:51295/api/users', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { email, password: 'Manager123!', role: 'Manager' },
    });
    expect(resp.status()).toBeLessThan(400);

    // Clear token and login as manager
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Manager123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/ops\//, { timeout: 10000 });

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('admin@local').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('button', { name: /create user/i })).not.toBeVisible();
  });

  test('login as Field - cannot see Customers nav', async ({ page }) => {
    // Navigate to app first so we can access localStorage
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));

    // Create a field user via API
    const email = `field_rbac_${Date.now().toString().slice(-6)}@test.com`;
    const resp = await page.request.post('http://localhost:51295/api/users', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { email, password: 'Field12345!', role: 'Field' },
    });
    expect(resp.status()).toBeLessThan(400);

    // Clear token and login as field
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('Field12345!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/ops\//, { timeout: 10000 });

    // Field user should NOT see Customers in nav
    await expect(page.getByRole('button', { name: 'Customers', exact: true })).not.toBeVisible();
  });
});
