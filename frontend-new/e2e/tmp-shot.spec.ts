import { test, expect } from '@playwright/test';
import { API } from './helpers';
test('reports page shots', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto('/ops/shipments');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const wh = await (await request.get(`${API}/api/warehouses`, { headers })).json();
  const cust = await (await request.get(`${API}/api/customers`, { headers })).json();
  const gt = await (await request.get(`${API}/api/good-types`, { headers })).json();
  const mkShip = async (dep: string) => (await (await request.post(`${API}/api/shipments`, {
    headers, data: { originWarehouseId: wh[0].id, destinationWarehouseId: wh[1].id,
      plannedDepartureDate: dep, plannedArrivalDate: dep, maxCbm: 76, maxWeightKg: 29000 } })).json());
  const mkPkg = async (sid: number, ci: number, kg: number, cbm: number) => (await (await request.post(
    `${API}/api/shipments/${sid}/packages`, { headers, data: {
      customerId: cust[ci].id, provisionMethod: 'CustomerProvided', supplyOrderId: null, weightKg: kg, cbm,
      items: [{ goodTypeId: gt[0].id, quantity: 1, unit: 'Crt' }] } })).json());
  const s1 = await mkShip('2026-07-15');
  const s2 = await mkShip('2026-08-20');
  const p = await mkPkg(s1.id, 0, 285, 2);
  await mkPkg(s1.id, 1, 625, 0.75);
  await mkPkg(s2.id, 2, 4943, 11.25);
  await mkPkg(s2.id, 0, 1184, 3.5);
  await request.patch(`${API}/api/packages/${p.id}/adjustments`, { headers, data: {
    feeAmount: 70000, feeReason: 'Customs', discountAmount: 500, discountReason: 'Rounding' } });

  await page.goto('/ops/reports');
  await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();
  await expect(page.getByText('Total Billed').first()).toBeVisible();
  await page.screenshot({ path: 'rep-customer.png', fullPage: true });

  await page.getByRole('button', { name: /Container Utilisation/ }).click();
  await expect(page.getByText('% Full (CBM)')).toBeVisible();
  await page.screenshot({ path: 'rep-container.png', fullPage: true });
});
