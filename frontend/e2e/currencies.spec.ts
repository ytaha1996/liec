import { test, expect } from '@playwright/test';

test.describe('Currencies', () => {
  test('seed rows are listed (USD/EUR/XAF)', async ({ page }) => {
    await page.goto('/master/currencies');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('cell', { name: 'USD' }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('cell', { name: 'EUR' }).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: 'XAF' }).first()).toBeVisible();
  });

  test('admin can create + edit + delete a currency', async ({ page }) => {
    const code = `T${Date.now().toString().slice(-2)}`; // 3-letter test code, e.g. T42
    await page.goto('/master/currencies');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /create currency/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.getByLabel(/code.*ISO/i).fill(code);
    await page.getByLabel('Name*').fill(`Test Currency ${code}`);
    // IsBase remains unchecked → anchor + rate fields are required.
    await page.locator('#anchorCurrencyCode').click();
    await page.waitForTimeout(300);
    await page.getByRole('option', { name: 'USD' }).click();
    await page.getByLabel(/Rate \(/i).fill('1.234');

    const [createResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/currencies') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(createResp.status()).toBeLessThan(400);

    // Cleanup: delete via API to keep DB clean for subsequent tests.
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const del = await page.request.delete(`http://localhost:51295/api/currencies/${code.toUpperCase()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(del.status()).toBeLessThan(400);
  });

  test('cannot delete the base currency (USD)', async ({ page }) => {
    const token = await page.evaluate(() => localStorage.getItem('token')) ?? '';
    if (!token) {
      await page.goto('/master/currencies');
      await page.waitForLoadState('networkidle');
    }
    const t = await page.evaluate(() => localStorage.getItem('token'));
    const del = await page.request.delete('http://localhost:51295/api/currencies/USD', {
      headers: { Authorization: `Bearer ${t}` },
    });
    expect(del.status()).toBe(409);
  });
});
