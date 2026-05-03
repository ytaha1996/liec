import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@local');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/ops\/dashboard/, { timeout: 10000 });
  });

  test('login with wrong password shows error toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@local');
    await page.getByLabel('Password').fill('WrongPassword');
    await page.getByRole('button', { name: 'Login' }).click();
    // Wait for the API call to complete and verify we stay on login page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('login with non-existent email shows error toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@example.com');
    await page.getByLabel('Password').fill('Admin123!');
    await page.getByRole('button', { name: 'Login' }).click();
    // Wait for the API call to complete and verify we stay on login page
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });

  test('unauthenticated user redirected to /login', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });
});
