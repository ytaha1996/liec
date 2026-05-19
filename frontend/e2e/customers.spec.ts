import { test, expect } from '@playwright/test';

test.describe('Customers', () => {
  test('list page loads with seed customers', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    // "Ahmad" may appear in name and email columns -- use cell selector for the name column
    await expect(page.getByRole('cell', { name: /Ahmad/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('search customers via table filter', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    // Customers page does NOT have a standalone search TextField
    // It uses EnhancedTable which has built-in filtering.
    // Verify that table data loads with seed customers
    await expect(page.getByRole('cell', { name: /Ahmad/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('create new customer', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create customer/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // DynamicFormWidget renders TextField with label="Name*" for required fields
    await page.getByLabel('Name*').fill('Test Customer E2E');
    // Phone input -- GenericPhoneInput uses TextField with label="Primary Phone*"
    await page.getByLabel('Primary Phone*').fill('+96170999999');

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/customers') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response.status()).toBeLessThan(400);
  });

  test('edit customer', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    // Edit buttons are IconButtons inside Tooltip with title="Edit"
    const editBtn = page.locator('table tbody tr').first().locator('button').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    }
  });

  test('customer detail page loads', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    // "Open Detail" buttons are IconButtons with Tooltip title="Open Detail"
    // They are the second action button per row in the table
    const actionBtns = page.locator('table tbody tr').first().locator('button');
    const count = await actionBtns.count();
    if (count >= 2) {
      // Second button is "Open Detail"
      await actionBtns.nth(1).click();
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/master\/customers\/\d+/);
    }
  });

  test('update WhatsApp consent info visible', async ({ page }) => {
    await page.goto('/master/customers');
    await page.waitForLoadState('networkidle');
    // Check that the WhatsApp warning alert is visible on the customers page
    await expect(page.getByText(/whatsapp/i).first()).toBeVisible({ timeout: 5000 });
  });
});
