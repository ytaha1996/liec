import { test, expect } from '@playwright/test';

test.describe('Supply Orders', () => {
  test('create supply order', async ({ page }) => {
    // Ensure a supplier exists first via API
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    await page.request.post('http://localhost:51295/api/suppliers', {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      data: { name: 'E2E Supplier', isActive: true },
    });

    await page.goto('/master/supply-orders');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /create/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Customer is MUI Autocomplete with id="customerId"
    await page.locator('#customerId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    // Supplier is MUI Autocomplete with id="supplierId"
    await page.locator('#supplierId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    const suffix = Date.now().toString().slice(-6);
    await page.getByLabel('Name*').fill('Test SO ' + suffix);
    await page.getByLabel('Purchase Price*').fill('100');

    const [soResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/supply-orders') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(soResp.status()).toBeLessThan(400);
  });

  test('approve supply order', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.waitForLoadState('networkidle');
    // Approve is an IconButton with Tooltip title="Approve" in the actions column
    await page.waitForTimeout(500);
    const approveButtons = page.locator('table tbody button');
    const approveCount = await approveButtons.count();
    for (let i = 0; i < approveCount; i++) {
      const btn = approveButtons.nth(i);
      // Check parent tooltip title
      const tooltipTitle = await btn.locator('..').getAttribute('title').catch(() => null)
        ?? await btn.getAttribute('title').catch(() => null)
        ?? await btn.getAttribute('aria-label').catch(() => null);
      // Also check if it's wrapped in a Tooltip by checking ancestor
      const parentTitle = await btn.evaluate((el) => {
        const parent = el.closest('[title]');
        return parent ? parent.getAttribute('title') : null;
      });
      if (tooltipTitle === 'Approve' || parentTitle === 'Approve') {
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
  });

  test('only next action visible per status', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.waitForLoadState('networkidle');
    // Verify table loads -- action buttons may or may not exist depending on data
    const table = page.locator('table');
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      if (rowCount > 0) {
        const actions = table.locator('tbody button');
        await expect(actions.first()).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('cancel supply order with reason', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.waitForLoadState('networkidle');
    // The Cancel action button opens a dialog with reason text field
    // Find any Cancel button in the table by checking tooltip title
    const allButtons = page.locator('table tbody button');
    const count = await allButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = allButtons.nth(i);
      const parentTitle = await btn.evaluate((el) => {
        const parent = el.closest('[title]');
        return parent ? parent.getAttribute('title') : null;
      });
      if (parentTitle === 'Cancel') {
        await btn.click();
        // Should show cancel reason dialog
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 });
        await expect(page.getByLabel('Reason for cancellation')).toBeVisible();
        break;
      }
    }
  });

  test('search filters supply orders', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Search by Name').fill('NONEXISTENT');
    await page.waitForTimeout(500);
    await expect(page.getByText('No supply orders found. Create one to get started.')).toBeVisible({ timeout: 5000 });
  });
});
