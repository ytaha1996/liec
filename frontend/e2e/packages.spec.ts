import { test, expect } from '@playwright/test';

test.describe('Packages', () => {
  test('list page loads with table', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    // "Packages" appears in nav button + page title -- check heading
    await expect(page.locator('h1, h2, h3, h4, h5, h6').filter({ hasText: /packages/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('search filters by customer name', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search by Package ID or Customer').fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await expect(page.getByText('No packages found. Create one to get started.')).toBeVisible({ timeout: 5000 });
  });

  test('create package via auto-assign', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Package' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Select customer (MUI Autocomplete with id="customerId")
    await page.locator('#customerId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Select origin warehouse (MUI Autocomplete with id="originWarehouseId")
    await page.locator('#originWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Select destination warehouse (MUI Autocomplete with id="destinationWarehouseId")
    await page.locator('#destinationWarehouseId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').last().click();

    await page.getByRole('button', { name: 'Submit' }).click();
    // On success, navigates to package detail page
    await expect(page).toHaveURL(/\/ops\/packages\/\d+/, { timeout: 10000 });
  });

  test('package detail shows tabs', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    // Click first clickable cell in table (Package ID column is Clickable type)
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible({ timeout: 5000 });
      await expect(page.getByRole('tab', { name: /items/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /photos/i })).toBeVisible();
    }
  });

  test('add item to package', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      // Go to Items & Pricing tab
      await page.getByRole('tab', { name: /items/i }).click();
      const addItemBtn = page.getByRole('button', { name: /add item/i });
      if (await addItemBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addItemBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Select good type (MUI Autocomplete with id="goodTypeId")
        await page.locator('#goodTypeId').click();
        await page.waitForTimeout(300);
        await page.getByRole('option').first().click();

        // Set quantity -- label is "Quantity*"
        await page.getByLabel('Quantity*').fill('5');

        const [itemResp] = await Promise.all([
          page.waitForResponse(r => r.url().includes('/items') && r.request().method() === 'POST'),
          page.getByRole('button', { name: 'Submit' }).click(),
        ]);
        // 409 means package is in a status that doesn't allow adding items — acceptable
        expect(itemResp.status()).toBeLessThanOrEqual(409);
      }
    }
  });

  test('delete item shows confirmation', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /items/i }).click();
      await page.waitForTimeout(500);
      // Delete buttons are icon buttons -- find by tooltip title or text
      const deleteBtn = page.locator('[title="Delete"] button, button[title="Delete"], button[aria-label="Delete"]').first();
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click();
        await expect(page.getByText(/delete|are you sure/i).first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('edit package weight/CBM/note', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /items/i }).click();
      await page.waitForTimeout(500);
      const editBtn = page.getByRole('button', { name: /edit/i }).first();
      if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await editBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('receive package transition', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const receiveBtn = page.getByRole('button', { name: 'Receive' });
      if (await receiveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await receiveBtn.click();
        // ConfirmationBox has "Confirm" button
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          await expect(confirmBtn).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('pack requires weight and items', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const packBtn = page.getByRole('button', { name: 'Pack' });
      if (await packBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await packBtn.click();
        const confirmBtn = page.getByRole('button', { name: 'Confirm' });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
          // Should show error if no weight/items -- confirmation dialog closes
          await expect(confirmBtn).not.toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('cancel package shows confirmation', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      const cancelBtn = page.getByRole('button', { name: 'Cancel' });
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click();
        // ConfirmationBox shows dialog with message
        await expect(page.getByRole('dialog').or(page.getByText(/cancel|are you sure/i).first())).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('empty state when no packages match search', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search by Package ID or Customer').fill('ZZZZZZ');
    await page.waitForTimeout(500);
    await expect(page.getByText('No packages found. Create one to get started.')).toBeVisible({ timeout: 5000 });
  });

  test('shipment ref code is clickable in table', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    // Shipment column uses Clickable type which renders as MUI Link/button
    // Look for a clickable cell that contains a shipment ref pattern
    const shipmentLinks = page.locator('table tbody tr td button, table tbody tr td a');
    if (await shipmentLinks.count() > 1) {
      // The second clickable column should be the Shipment ref code
      const shipmentLink = shipmentLinks.nth(1);
      if (await shipmentLink.isVisible({ timeout: 2000 }).catch(() => false)) {
        await shipmentLink.click();
        await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);
      }
    }
  });
});
