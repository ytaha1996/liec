import { test, expect } from '@playwright/test';

const API = 'http://localhost:51295';

test.describe('FX Snapshots', () => {
  test('manual override + delete via API on a fresh shipment', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.waitForLoadState('networkidle');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Find any existing shipment to test against (at least one is created by the manager-flow fixture).
    const list = await page.request.get(`${API}/api/shipments?pageSize=1`, { headers });
    expect(list.status()).toBeLessThan(400);
    const body = await list.json();
    const shipmentId = (body?.items?.[0] ?? body?.[0])?.id;
    if (!shipmentId) test.skip(true, 'No shipment available to test against');

    // Upsert a manual override for EUR.
    const upsert = await page.request.put(`${API}/api/shipments/${shipmentId}/fx-snapshots/EUR`, {
      headers,
      data: { rateToBase: 1.42 },
    });
    expect(upsert.status()).toBeLessThan(400);

    // Verify it shows up.
    const snapshots = await (await page.request.get(`${API}/api/shipments/${shipmentId}/fx-snapshots`, { headers })).json();
    const manual = (snapshots as any[]).find(s => s.event === 'Manual' && s.currencyCode === 'EUR');
    expect(manual).toBeTruthy();
    expect(Number(manual.rateToBase)).toBe(1.42);

    // Delete it.
    const del = await page.request.delete(`${API}/api/shipments/${shipmentId}/fx-snapshots/EUR`, { headers });
    expect(del.status()).toBeLessThan(400);

    const after = await (await page.request.get(`${API}/api/shipments/${shipmentId}/fx-snapshots`, { headers })).json();
    expect((after as any[]).find(s => s.event === 'Manual' && s.currencyCode === 'EUR')).toBeUndefined();
  });
});
