import { test, expect } from '@playwright/test';

const API = 'http://localhost:51295';

test.describe('Commercial Invoice + Packing List export', () => {
  test('generates a workbook URL for an existing shipment', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const list = await page.request.get(`${API}/api/shipments?pageSize=1`, { headers });
    expect(list.status()).toBeLessThan(400);
    const body = await list.json();
    const shipmentId = (body?.items?.[0] ?? body?.[0])?.id;
    if (!shipmentId) test.skip(true, 'No shipment available');

    // Generate without overrides.
    const r1 = await page.request.post(`${API}/api/exports/shipments/${shipmentId}/commercial-documents`, {
      headers,
      data: {},
    });
    expect(r1.status()).toBeLessThan(400);
    const body1 = await r1.json();
    expect(body1.publicUrl).toBeTruthy();
    expect(String(body1.publicUrl)).toContain('.xlsx');

    // Re-generate with an inline rate override for EUR — should also succeed.
    const r2 = await page.request.post(`${API}/api/exports/shipments/${shipmentId}/commercial-documents`, {
      headers,
      data: { rateOverrides: { EUR: 1.10 } },
    });
    expect(r2.status()).toBeLessThan(400);
    const body2 = await r2.json();
    expect(body2.publicUrl).toBeTruthy();
  });
});
