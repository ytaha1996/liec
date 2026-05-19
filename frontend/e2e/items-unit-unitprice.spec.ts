import { test, expect } from '@playwright/test';

const API = 'http://localhost:51295';

test.describe('Package items — Unit + UnitPrice', () => {
  test('add item with explicit unit + unit price', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Find any existing package in Draft/Received status.
    const list = await page.request.get(`${API}/api/packages?pageSize=10`, { headers });
    expect(list.status()).toBeLessThan(400);
    const body = await list.json();
    const items = (body?.items ?? body) as any[];
    const draft = items.find(p => p.status === 'Draft' || p.status === 'Received');
    if (!draft) test.skip(true, 'No editable package available to test against');

    await page.goto(`/ops/packages/${draft.id}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: /items/i }).click();
    await page.getByRole('button', { name: /add item/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.locator('#goodTypeId').click();
    await page.waitForTimeout(300);
    await page.getByRole('option').first().click();

    await page.getByLabel('Quantity*').fill('3');

    await page.locator('#unit').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: /pallet/i }).click();

    await page.getByLabel(/Unit Price/).fill('25.50');

    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(`/api/packages/${draft.id}/items`) && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(resp.status()).toBeLessThan(400);

    // Verify the unit and price render in the table.
    await expect(page.getByText('Pallet').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('$ 25.50').first()).toBeVisible();
  });
});
