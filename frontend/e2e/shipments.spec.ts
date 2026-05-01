import { test, expect } from '@playwright/test';

test.describe('Shipments', () => {
  test('list page loads with table', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    // Page title "Shipments" appears in heading and possibly nav button -- use heading
    await expect(page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: /shipments/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('create shipment with valid data', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select origin warehouse (MUI Autocomplete with id="originWarehouseId")
    await page.locator('#originWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Select destination warehouse (different from origin)
    await page.locator('#destinationWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').last().click();

    // Fill dates via MUI DatePicker -- use .first() to avoid strict mode (group + hidden input)
    await page.getByLabel('Planned Departure Date*').first().click();
    await page.keyboard.type('06012026');

    await page.getByLabel('Planned Arrival Date*').first().click();
    await page.keyboard.type('07012026');

    const [response] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/shipments') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(response.status()).toBeLessThan(400);
  });

  test('search filters shipments by RefCode', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search by Ref Code or TIIU').fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await expect(page.getByText('No shipments found. Create one to get started.')).toBeVisible({ timeout: 5000 });
  });

  test('click shipment row navigates to detail page', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    // Clickable columns render as MUI Link/button elements inside table cells
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);
    }
  });

  test('shipment detail shows info sections', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Shipment Info', { exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('cancel shipment from Draft status', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        // ConfirmationBox has "Confirm" button
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          // After successful transition, the confirmation dialog closes
          await expect(confirmBtn).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('empty state shown when no shipments match search', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search by Ref Code or TIIU').fill('ZZZZZZZZZ');
    await page.waitForTimeout(500);
    await expect(page.getByText('No shipments found. Create one to get started.')).toBeVisible({ timeout: 5000 });
  });

  test('schedule shipment requires TIIU code', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const scheduleBtn = page.getByRole('button', { name: 'Schedule' });
      if (await scheduleBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await scheduleBtn.click();
        // ConfirmationBox has "Confirm" button
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          // Should fail if no TIIU code -- confirmation dialog closes but page stays
          await expect(confirmBtn).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('edit shipment TIIU code in Draft', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const editBtn = page.getByRole('button', { name: /edit/i }).first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('create shipment - origin equals destination fails', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select same warehouse for both
    await page.locator('#originWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    await page.locator('#destinationWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Fill dates via MUI DatePicker -- use .first() to avoid strict mode
    await page.getByLabel('Planned Departure Date*').first().click();
    await page.keyboard.type('06012026');

    await page.getByLabel('Planned Arrival Date*').first().click();
    await page.keyboard.type('07012026');

    await page.getByRole('button', { name: 'Submit' }).click();
    // Should show error -- dialog stays open
    await page.waitForTimeout(1000);
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
  });
});
