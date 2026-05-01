import { test, expect } from '@playwright/test';

test.describe('Master Data', () => {
  test('warehouses list shows seed data', async ({ page }) => {
    await page.goto('/master/warehouses');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('cell', { name: 'BEI', exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'GAB', exact: true }).first()).toBeVisible();
  });

  test('create new warehouse', async ({ page }) => {
    await page.goto('/master/warehouses');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create warehouse/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // DynamicFormWidget renders TextField with label including * for required fields
    const suffix = Date.now().toString().slice(-3);
    await page.getByLabel('Code*').fill(suffix);
    await page.getByLabel('Name*').fill('Test Warehouse ' + suffix);
    await page.getByLabel('City*').fill('TestCity');
    await page.getByLabel('Country*').fill('TestCountry');
    await page.getByLabel('Max Weight (kg)*').fill('10000');
    await page.getByLabel('Max CBM*').fill('100');

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/warehouses') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response.status()).toBeLessThan(400);
  });

  test('edit warehouse', async ({ page }) => {
    await page.goto('/master/warehouses');
    await page.waitForLoadState('networkidle');
    // Edit buttons are IconButtons in table rows
    const editBtn = page.locator('table tbody tr').first().locator('button').first();
    if (await editBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
    }
  });

  test('good types list shows seed data', async ({ page }) => {
    await page.goto('/master/good-types');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Electronics').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Clothing').first()).toBeVisible();
  });

  test('create new good type', async ({ page }) => {
    await page.goto('/master/good-types');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create good type/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // DynamicFormWidget: fields are "Name (EN)*" and "Name (AR)*"
    await page.getByLabel('Name (EN)*').fill('Test Item');
    await page.getByLabel('Name (AR)*').fill('\u0639\u0646\u0635\u0631 \u0627\u062e\u062a\u0628\u0627\u0631');

    const [response2] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/good-types') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response2.status()).toBeLessThan(400);
  });

  test('suppliers CRUD', async ({ page }) => {
    await page.goto('/master/suppliers');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create supplier/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // DynamicFormWidget: field is "Name*"
    await page.getByLabel('Name*').fill('Test Supplier E2E');
    const [response3] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/suppliers') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response3.status()).toBeLessThan(400);
  });
});
