import { test, expect } from '@playwright/test';
import { ADMIN_PASSWORD, expectToast } from './helpers';

test.describe.serial('profile', () => {
  test('shows account info', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
    await expect(page.getByText('Admin', { exact: true }).first()).toBeVisible();
  });

  test('wrong old password is rejected', async ({ page }) => {
    await page.goto('/profile');
    await page.getByLabel('Old Password').fill('definitely-wrong');
    await page.getByLabel('New Password').fill('SomethingNew123!');
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expectToast(page, /old password|incorrect|failed/i);
  });

  test('change password then restore it', async ({ page }) => {
    const TEMP = 'TempPass123!e2e';
    await page.goto('/profile');
    await page.getByLabel('Old Password').fill(ADMIN_PASSWORD);
    await page.getByLabel('New Password').fill(TEMP);
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expectToast(page, /updated/i);

    // Restore so nothing downstream depends on the temp password.
    await page.getByLabel('Old Password').fill(TEMP);
    await page.getByLabel('New Password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Update Password' }).click();
    await expectToast(page, /updated/i);
  });
});
