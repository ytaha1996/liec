import { test, expect } from '@playwright/test';
import { API } from './helpers';

test('report catalogue smoke', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.goto('/ops/shipments');
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const headers = { Authorization: `Bearer ${token}` };
  const wh = await (await request.get(`${API}/api/warehouses`, { headers })).json();
  const cust = await (await request.get(`${API}/api/customers`, { headers })).json();
  const gt = await (await request.get(`${API}/api/good-types`, { headers })).json();

  const mkShip = async (dep: string, max: number) => (await (await request.post(`${API}/api/shipments`, {
    headers, data: { originWarehouseId: wh[0].id, destinationWarehouseId: wh[1].id,
      plannedDepartureDate: dep, plannedArrivalDate: dep, maxCbm: max, maxWeightKg: 29000 } })).json());
  const mkPkg = async (sid: number, ci: number, kg: number, cbm: number) => (await (await request.post(
    `${API}/api/shipments/${sid}/packages`, { headers, data: {
      customerId: cust[ci].id, provisionMethod: 'CustomerProvided', supplyOrderId: null, weightKg: kg, cbm,
      items: [{ goodTypeId: gt[0].id, quantity: 1, unit: 'Crt' }] } })).json());

  const s1 = await mkShip('2026-07-15', 76);
  const s2 = await mkShip('2026-08-20', 76);
  const p1 = await mkPkg(s1.id, 0, 285, 2);
  await mkPkg(s1.id, 1, 625, 0.75);
  await mkPkg(s2.id, 0, 4943, 11.25);
  await request.patch(`${API}/api/packages/${p1.id}/adjustments`, { headers, data: {
    feeAmount: 70000, feeReason: 'Customs', discountAmount: 500, discountReason: 'Rounding' } });

  const cat = await (await request.get(`${API}/api/reports`, { headers })).json();
  console.log('catalogue:', cat.map((c: {key:string}) => c.key).join(', '));

  for (const key of cat.map((c: {key:string}) => c.key)) {
    const r = await (await request.get(`${API}/api/reports/${key}`, { headers })).json();
    console.log(`\n--- ${r.title} (${r.currency}) ---`);
    console.log('cols:', r.columns.map((c: {key:string}) => c.key).join(','));
    for (const row of r.rows.slice(0, 4))
      console.log('  ', r.columns.map((c: {key:string}) => `${c.key}=${row[c.key]}`).join(' '));
    console.log('  TOTALS:', JSON.stringify(r.totals));
    const ex = await request.post(`${API}/api/exports/reports/${key}`, { headers, data: {} });
    console.log('  export:', ex.status(), ex.ok() ? String((await ex.json()).publicUrl).split('/').pop() : await ex.text());
    expect(ex.ok()).toBeTruthy();
  }

  const bad = await request.get(`${API}/api/reports/nope`, { headers });
  console.log('\nunknown key ->', bad.status());
  expect(bad.status()).toBe(404);
});
