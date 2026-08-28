import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API } from './helpers';

// The report catalogue. Runs after the data-creating specs (alphabetical), so
// shipments, packages, fees and discounts already exist.
const KEYS = ['customer-summary', 'top-customers', 'revenue-by-month', 'container-utilisation'];

interface Report {
  key: string;
  title: string;
  currency: string;
  columns: { key: string; label: string; type: string }[];
  rows: Record<string, number | string | null>[];
  totals: Record<string, number>;
}

async function auth(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return { Authorization: `Bearer ${token}` };
}

async function run(request: APIRequestContext, headers: Record<string, string>, key: string, qs = '') {
  const res = await request.get(`${API}/api/reports/${key}${qs ? `?${qs}` : ''}`, { headers });
  expect(res.ok(), `${key} -> ${res.status()}`).toBeTruthy();
  return (await res.json()) as Report;
}

// Serial: the first test lays down a dedicated GAB→DXB shipment so the suite
// works standalone as well as in the full run.
test.describe.serial('reports', () => {
  test('set up cargo to report on', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const wh = await (await request.get(`${API}/api/warehouses`, { headers })).json();
    const cust = await (await request.get(`${API}/api/customers`, { headers })).json();
    const gab = wh.find((w: { code: string }) => w.code === 'GAB');
    const dxb = wh.find((w: { code: string }) => w.code === 'DXB');

    const ship = await (await request.post(`${API}/api/shipments`, {
      headers,
      data: {
        originWarehouseId: gab.id,
        destinationWarehouseId: dxb.id,
        plannedDepartureDate: '2026-07-15',
        plannedArrivalDate: '2026-08-15',
        maxCbm: 76,
        maxWeightKg: 29000,
      },
    })).json();

    // Two customers, one carrying a fee and a discount.
    const mk = async (customerId: number, weightKg: number, cbm: number) =>
      (await (await request.post(`${API}/api/shipments/${ship.id}/packages`, {
        headers,
        data: { customerId, provisionMethod: 'CustomerProvided', supplyOrderId: null, weightKg, cbm },
      })).json());
    const first = await mk(cust[0].id, 285, 2);
    await mk(cust[1].id, 625, 0.75);
    const adj = await request.patch(`${API}/api/packages/${first.id}/adjustments`, {
      headers,
      data: { feeAmount: 70000, feeReason: 'Customs', discountAmount: 500, discountReason: 'Rounding' },
    });
    expect(adj.ok()).toBeTruthy();
  });

  test('the catalogue advertises every report with its filters', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const headers = await auth(page);
    const cat = await (await request.get(`${API}/api/reports`, { headers })).json();
    expect(cat.map((c: { key: string }) => c.key).sort()).toEqual([...KEYS].sort());
    for (const def of cat) {
      expect(def.title, `${def.key} title`).toBeTruthy();
      expect(def.filters.length, `${def.key} filters`).toBeGreaterThan(0);
    }
    // Only reports that exist can be run.
    expect((await request.get(`${API}/api/reports/not-a-report`, { headers })).status()).toBe(404);
  });

  test('customer summary totals reconcile with its rows', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const r = await run(request, await auth(page), 'customer-summary');
    expect(r.rows.length).toBeGreaterThan(0);

    const sum = (f: string) => r.rows.reduce((a, row) => a + Number(row[f] ?? 0), 0);
    expect(r.totals.packages).toBe(sum('packages'));
    expect(r.totals.totalBilled).toBeCloseTo(sum('totalBilled'), 2);
    expect(r.totals.customers).toBe(r.rows.length);
    // Total Billed is freight plus fees less discounts, by construction.
    expect(r.totals.totalBilled).toBeCloseTo(r.totals.freight + r.totals.fees - r.totals.discounts, 2);
    for (const row of r.rows) {
      expect(Number(row.totalBilled)).toBeCloseTo(
        Number(row.freight) + Number(row.fees) - Number(row.discounts),
        2,
      );
    }
  });

  test('a customer filter narrows the report to that customer', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const headers = await auth(page);
    const all = await run(request, headers, 'customer-summary');
    const target = all.rows[0];

    const one = await run(request, headers, 'customer-summary', `customerId=${Number(target.id)}`);
    expect(one.rows).toHaveLength(1);
    expect(one.rows[0].customer).toBe(target.customer);
    expect(one.totals.totalBilled).toBeCloseTo(Number(target.totalBilled), 2);
  });

  test('revenue by month agrees with the customer summary on the grand total', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const headers = await auth(page);
    const byCustomer = await run(request, headers, 'customer-summary');
    const byMonth = await run(request, headers, 'revenue-by-month');
    expect(byMonth.totals.totalBilled).toBeCloseTo(byCustomer.totals.totalBilled, 2);
    expect(byMonth.totals.packages).toBe(byCustomer.totals.packages);
    // Months come back in chronological order.
    const months = byMonth.rows.map((r) => String(r.month));
    expect([...months].sort()).toEqual(months);
  });

  test('top customers ranks by billing and computes per-CBM correctly', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const r = await run(request, await auth(page), 'top-customers', 'limit=3');
    expect(r.rows.length).toBeLessThanOrEqual(3);

    let previous = Number.MAX_VALUE;
    for (const [i, row] of r.rows.entries()) {
      expect(row.rank).toBe(i + 1);
      const billed = Number(row.totalBilled);
      expect(billed).toBeLessThanOrEqual(previous);
      previous = billed;
      // Rate columns are null for zero-measure cargo, never Infinity.
      if (Number(row.cbm) > 0) {
        expect(Number(row.perCbm)).toBeCloseTo(billed / Number(row.cbm), 1);
      } else {
        expect(row.perCbm).toBeNull();
      }
    }
  });

  test('container utilisation matches the shipment it describes', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const headers = await auth(page);
    const r = await run(request, headers, 'container-utilisation');
    expect(r.rows.length).toBeGreaterThan(0);

    const row = r.rows[0];
    const detail = await (await request.get(`${API}/api/shipments/${row.id}/detail`, { headers })).json();
    expect(row.shipment).toBe(detail.shipment.refCode);
    const activeCbm = detail.packages
      .filter((p: { status: string }) => p.status !== 'Cancelled')
      .reduce((a: number, p: { cbm: number }) => a + Number(p.cbm), 0);
    expect(Number(row.cbm)).toBeCloseTo(activeCbm, 3);
    // Percent is only meaningful when the container has a configured maximum.
    if (Number(row.maxCbm) > 0) {
      expect(Number(row.cbmPct)).toBeCloseTo((Number(row.cbm) / Number(row.maxCbm)) * 100, 1);
    } else {
      expect(row.cbmPct).toBeNull();
    }
  });

  test('every report exports to a readably named file', async ({ page, request }) => {
    await page.goto('/ops/reports');
    const headers = await auth(page);
    for (const key of KEYS) {
      const res = await request.post(`${API}/api/exports/reports/${key}`, { headers, data: {} });
      expect(res.ok(), `${key} export -> ${res.status()}`).toBeTruthy();
      const name = String((await res.json()).publicUrl).split('/').pop();
      expect(name).toMatch(new RegExp(`^${key}-\\d{8}-\\d{6}\\.xlsx$`));
    }
  });

  test('the page switches reports and re-renders their columns', async ({ page }) => {
    await page.goto('/ops/reports');
    await expect(page.getByRole('heading', { name: 'Reports', level: 1 })).toBeVisible();

    // Customer Summary is the landing report.
    await expect(page.getByRole('columnheader', { name: 'Total Billed' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Customer' })).toBeVisible();

    await page.getByRole('button', { name: /Container Utilisation/ }).click();
    await expect(page.getByRole('columnheader', { name: '% Full (CBM)' })).toBeVisible();
    // …and the filter bar follows the report: shipment status replaces customer.
    await expect(page.getByText('Shipment status')).toBeVisible();

    await page.getByRole('button', { name: /Top Customers by Rate/ }).click();
    await expect(page.getByRole('columnheader', { name: 'Per Ton' })).toBeVisible();
    await expect(page.getByText('How many')).toBeVisible();
  });
});
