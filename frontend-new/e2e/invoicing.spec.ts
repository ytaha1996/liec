import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API, confirmDialog, expectToast, pickDate, pickSelect } from './helpers';

// Stage 1 of the accounting layer (ACC-01 … ACC-08, ACC-14, ACC-16).
// Dedicated DXB→CHN route so invoice numbers for this container are unambiguous.
test.describe.serial('invoicing', () => {
  let shipmentId = 0;
  let refCode = '';
  let firstPackageId = 0;

  async function auth(page: Page): Promise<Record<string, string>> {
    const token = await page.evaluate(() => localStorage.getItem('token'));
    return { Authorization: `Bearer ${token}` };
  }

  async function addPackage(request: APIRequestContext, headers: Record<string, string>,
                            customerId: number, charge: number, fee = 0, discount = 0) {
    const pkg = await (await request.post(`${API}/api/shipments/${shipmentId}/packages`, {
      headers,
      data: { customerId, provisionMethod: 'CustomerProvided', supplyOrderId: null, weightKg: 285, cbm: 2 },
    })).json();
    // Drive the money to a known figure so the invoice total is predictable.
    await request.post(`${API}/api/packages/${pkg.id}/pricing-override`, {
      headers, data: { overrideType: 'TotalCharge', newValue: charge, reason: 'E2E fixed price' },
    });
    if (fee || discount) {
      await request.patch(`${API}/api/packages/${pkg.id}/adjustments`, {
        headers,
        data: {
          feeAmount: fee, feeReason: fee ? 'Customs declaration' : null,
          discountAmount: discount, discountReason: discount ? 'Rounding' : null,
        },
      });
    }
    return pkg.id as number;
  }

  test('set up a container with two customers', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await pickSelect(page, 'Origin Warehouse', /Dubai/);
    await pickSelect(page, 'Destination Warehouse', /China/);
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /created/i);

    const headers = await auth(page);
    const list = await (await request.get(`${API}/api/shipments`, { headers })).json();
    const rows = Array.isArray(list) ? list : list.items;
    const mine = rows.filter((s: { refCode: string; status: string }) =>
      s.refCode.startsWith('DXB-') && s.status === 'Draft').sort((a: { id: number }, b: { id: number }) => b.id - a.id)[0];
    shipmentId = mine.id;
    refCode = mine.refCode;

    const customers = await (await request.get(`${API}/api/customers`, { headers })).json();
    // 1,306,250 freight + 69,750 customs fee = 1,376,000, a real 925 figure.
    firstPackageId = await addPackage(request, headers, customers[0].id, 1_306_250, 69_750);
    await addPackage(request, headers, customers[1].id, 312_500);
  });

  test('generating produces one draft invoice per customer', async ({ page, request }) => {
    // ACC-03 and ACC-04: grouped by customer, and never posted by generation.
    await page.goto(`/ops/shipments/${shipmentId}`);
    await page.getByRole('button', { name: 'Generate Invoices' }).click();
    await confirmDialog(page);
    await expectToast(page, /2 draft invoice\(s\) created for 2 package\(s\)/i);

    const headers = await auth(page);
    const invoices = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    expect(invoices).toHaveLength(2);
    for (const inv of invoices) expect(inv.state).toBe('Draft');
  });

  test('the numbers restart per container and count up', async ({ page, request }) => {
    // ACC-07.
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const invoices = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    const numbers = invoices.map((i: { number: string }) => i.number).sort();
    expect(numbers).toEqual([`INV/${refCode}/001`, `INV/${refCode}/002`]);
  });

  test('the total is freight plus fee less discount', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const invoices = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    const totals = invoices.map((i: { grandTotal: number }) => i.grandTotal).sort((a: number, b: number) => a - b);
    expect(totals).toEqual([312_500, 1_376_000]);

    // ACC-16: the tax fields exist and resolve to zero until Finance decides.
    for (const inv of invoices) {
      expect(inv.taxTotal).toBe(0);
      expect(inv.untaxedTotal + inv.taxTotal).toBe(inv.grandTotal);
    }
  });

  test('the line shows the arithmetic and carries its currency', async ({ page, request }) => {
    // ACC-06 and ACC-14.
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const invoices = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    const detail = await (await request.get(`${API}/api/invoices/${invoices[0].id}`, { headers })).json();

    expect(detail.lines.length).toBeGreaterThan(0);
    expect(detail.lines[0].label).toMatch(/CBM/);
    expect(detail.lines[0].label).toMatch(/kg/);
    expect(detail.lines[0].amount.currency).toBe('XAF');
  });

  test('pressing generate again creates nothing', async ({ page, request }) => {
    // ACC-05: the operator will do this.
    await page.goto(`/ops/shipments/${shipmentId}`);
    await page.getByRole('button', { name: 'Generate Invoices' }).click();
    await confirmDialog(page);
    await expectToast(page, /already invoiced/i);

    const headers = await auth(page);
    const invoices = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    expect(invoices).toHaveLength(2);
  });

  test('a package added later gets its own invoice, leaving the first alone', async ({ page, request }) => {
    // ACC-05 again: it must not duplicate or overwrite.
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const before = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    const firstTotal = before.find((i: { number: string }) => i.number.endsWith('/001')).grandTotal;

    const customers = await (await request.get(`${API}/api/customers`, { headers })).json();
    await addPackage(request, headers, customers[2].id, 120_000);

    await page.goto(`/ops/shipments/${shipmentId}`);
    await page.getByRole('button', { name: 'Generate Invoices' }).click();
    await confirmDialog(page);
    await expectToast(page, /1 draft invoice\(s\) created/i);

    const after = await (await request.get(`${API}/api/shipments/${shipmentId}/invoices`, { headers })).json();
    expect(after).toHaveLength(3);
    expect(after.map((i: { number: string }) => i.number)).toContain(`INV/${refCode}/003`);
    expect(after.find((i: { number: string }) => i.number.endsWith('/001')).grandTotal).toBe(firstTotal);
  });

  test('the customs invoice refuses to invent a declared value', async ({ page, request }) => {
    // ACC-01: a plausible fabricated number is how wrong figures reach customs.
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const goodTypes = await (await request.get(`${API}/api/good-types`, { headers })).json();
    await request.post(`${API}/api/packages/${firstPackageId}/items`, {
      headers, data: { goodTypeId: goodTypes[0].id, quantity: 5, unit: 'Crt' },
    });

    const res = await request.post(`${API}/api/exports/shipments/${shipmentId}/commercial-documents`, {
      headers, data: {},
    });
    expect(res.ok()).toBeFalsy();
    expect(await res.text()).toContain('no declared value');
  });

  test('with declared values the customs invoice exports', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    const headers = await auth(page);
    const detail = await (await request.get(`${API}/api/packages/${firstPackageId}`, { headers })).json();
    const goodTypes = await (await request.get(`${API}/api/good-types`, { headers })).json();

    for (const item of detail.items) {
      const res = await request.put(`${API}/api/packages/${firstPackageId}/items/${item.id}`, {
        headers,
        data: {
          goodTypeId: item.goodTypeId ?? goodTypes[0].id,
          quantity: item.quantity,
          unit: item.unit,
          declaredValue: 120,
          declaredValueCurrency: 'USD',
          hsCode: '2106.90',
        },
      });
      expect(res.ok(), await res.text()).toBeTruthy();
    }

    const res = await request.post(`${API}/api/exports/shipments/${shipmentId}/commercial-documents`, {
      headers, data: {},
    });
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('the invoices appear on the shipment page', async ({ page }) => {
    await page.goto(`/ops/shipments/${shipmentId}`);
    await expect(page.getByText('Customer Invoices')).toBeVisible();
    await expect(page.getByText(`INV/${refCode}/001`)).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Draft' }).first()).toBeVisible();
  });
});
