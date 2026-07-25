import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, expectToast } from './helpers';

// These tests exercise the login flow itself, so start logged-out.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('authentication', () => {
  test('rejects invalid credentials with an error toast', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('nobody@nowhere.test');
    await page.getByLabel('Password').fill('WrongPass123!');
    await page.getByRole('button', { name: 'Login' }).click();
    await expectToast(page, /invalid|credentials|failed|locked/i);
    await expect(page).toHaveURL(/\/login/);
  });

  test('logs in and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/ops\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
  });

  test('deep link is restored after the auth bounce', async ({ page }) => {
    await page.goto('/master/customers');
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/master\/customers/);
    await expect(page.getByRole('heading', { name: 'Customers', level: 1 })).toBeVisible();
  });

  test('malformed token is cleared at boot and redirects to login', async ({ page }) => {
    // Simulates a corrupted/expired session: the store bootstrap must treat an
    // undecodable token as logged-out instead of rendering the app and bouncing.
    await page.addInitScript(() => localStorage.setItem('token', 'not.a.valid-jwt'));
    await page.goto('/ops/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout returns to login', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill(ADMIN_EMAIL);
    await page.getByLabel('Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveURL(/\/ops\/dashboard/);

    // Avatar dropdown → Logout
    await page.locator('header button:has([data-slot="avatar"]), header button:has(.rounded-full)').last().click();
    await page.getByRole('menuitem', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});
