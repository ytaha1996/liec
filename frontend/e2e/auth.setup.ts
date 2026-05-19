import { test as setup } from '@playwright/test';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('admin@local');
  await page.getByLabel('Password').fill('Admin123!');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/ops/dashboard');
  await page.context().storageState({ path: 'e2e/.auth/admin.json' });
});
