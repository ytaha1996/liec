import { test, expect, type APIRequestContext, type Page } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { API, confirmDialog, expectToast, fillField, pickDate, pickSelect } from './helpers';

// Handing packages to the next shipment on a route, and cancelling a shipment
// (which cascades to its packages). Dedicated DXB→BEI route.
//
// Shipments are resolved through the API rather than by "first row in the
// list": the backend is shared across a run (and can be reused between runs),
// so row order alone is not a reliable identifier.
type ShipmentRow = { id: number; refCode: string; status: string };

async function authHeaders(page: Page): Promise<Record<string, string>> {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  return { Authorization: `Bearer ${token}` };
}

async function shipments(request: APIRequestContext, headers: Record<string, string>): Promise<ShipmentRow[]> {
  const body = await (await request.get(`${API}/api/shipments`, { headers })).json();
  return (Array.isArray(body) ? body : body.items) as ShipmentRow[];
}

async function addPackage(page: Page) {
  await page.getByRole('button', { name: '+ Add Package' }).click();
  const dialog = page.getByRole('dialog');
  await pickSelect(page, 'Customer', /#\d+/);
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expectToast(page, /package created/i);
  await expect(dialog).not.toBeVisible();
}

async function createDxbShipment(page: Page) {
  await page.goto('/ops/shipments');
  await page.getByRole('button', { name: 'Create Shipment' }).click();
  await pickSelect(page, 'Origin Warehouse', /Dubai/);
  await pickSelect(page, 'Destination Warehouse', /Beirut/);
  await pickDate(page, /Planned Departure Date/);
  await pickDate(page, /Planned Arrival Date/);
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expectToast(page, /created/i);
}

test.describe.serial('move packages to the next shipment', () => {
  let sourceId = 0;
  let targetId = 0;
  let targetRef = '';

  test('set up a Scheduled shipment with two packages', async ({ page, request }) => {
    await createDxbShipment(page);
    const headers = await authHeaders(page);
    const mine = (await shipments(request, headers))
      .filter((s) => s.refCode.startsWith('DXB-') && s.status === 'Draft')
      .sort((a, b) => b.id - a.id)[0];
    expect(mine, 'freshly created DXB Draft shipment').toBeTruthy();
    sourceId = mine.id;

    await page.goto(`/ops/shipments/${sourceId}`);
    await addPackage(page);
    await addPackage(page);

    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Scheduled').first()).toBeVisible();
  });

  test('moving one package creates the next shipment and leaves the rest', async ({ page, request }) => {
    await page.goto(`/ops/shipments/${sourceId}`);
    const table = page.getByRole('table').last();
    await expect(table.getByRole('row')).toHaveCount(3); // header + 2

    await table.getByRole('row').nth(1).getByRole('checkbox').check();
    await expect(page.getByText(/1 selected/)).toBeVisible();

    const move = page.getByRole('button', { name: 'Move to Next Shipment' });
    await expect(move).toBeEnabled();
    await move.click();
    await confirmDialog(page);
    await expectToast(page, /1 package\(s\) moved to DXB-\d+/);

    // One package left behind, shipment still Scheduled.
    await expect(table.getByRole('row')).toHaveCount(2); // header + 1
    await expect(page.getByText('Scheduled').first()).toBeVisible();

    const headers = await authHeaders(page);
    const target = (await shipments(request, headers))
      .filter((s) => s.refCode.startsWith('DXB-') && s.status === 'Draft' && s.id !== sourceId)
      .sort((a, b) => b.id - a.id)[0];
    expect(target, 'newly created target shipment').toBeTruthy();
    targetId = target.id;
    targetRef = target.refCode;
  });

  test('the moved package landed on the new Draft shipment', async ({ page }) => {
    await page.goto(`/ops/shipments/${targetId}`);
    await expect(page.getByText('Draft').first()).toBeVisible();
    await expect(page.getByRole('table').last().getByRole('row')).toHaveCount(2); // header + 1
  });

  test('moving the last package cancels the emptied shipment', async ({ page }) => {
    await page.goto(`/ops/shipments/${sourceId}`);
    const table = page.getByRole('table').last();

    await table.getByRole('row').nth(1).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Move to Next Shipment' }).click();
    await confirmDialog(page);
    // Reuses the Draft created above rather than making another one.
    await expectToast(page, new RegExp(`moved to ${targetRef}`));
    await expectToast(page, /cancelled \(no packages left\)/i);
    await expect(page.getByText('Cancelled').first()).toBeVisible();
  });

  test('cancelling a shipment warns that its packages go with it', async ({ page }) => {
    await page.goto(`/ops/shipments/${targetId}`);

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog.getByText(/every package under it that has not shipped will be cancelled/i))
      .toBeVisible();
    await dialog.getByRole('button').last().click();
    await expectToast(page, /updated/i);
    await expect(page.getByText('Cancelled').first()).toBeVisible();

    // The cascade reached the packages it was carrying.
    await expect(page.getByRole('table').last().getByText('Cancelled').first()).toBeVisible();
  });
});

// A 1×1 JPEG — enough to satisfy the receiving-photo gate.
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwc' +
    'KDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcI' +
    'CQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRol' +
    'JicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ip' +
    'qrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
  'base64',
);

// The demotion + the ReadyToDepart source path can only be reached once a
// package is ReadyToShip, which is gated on a receiving photo — and that upload
// goes to Azure Blob. Hence @external.
test.describe.serial('moving a ReadyToShip package @external', () => {
  test('reverts it to Packed on the next shipment', async ({ page, request }) => {
    // BEI→DXB: a route no other spec uses.
    await page.goto('/ops/shipments');
    // localStorage is only readable once the page is on the app's origin.
    const headers = await authHeaders(page);

    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await pickSelect(page, 'Origin Warehouse', /Beirut/);
    await pickSelect(page, 'Destination Warehouse', /Dubai/);
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /created/i);

    const mine = (await shipments(request, headers))
      .filter((s) => s.refCode.startsWith('BEI-') && s.status === 'Draft')
      .sort((a, b) => b.id - a.id)[0];
    expect(mine, 'freshly created BEI Draft shipment').toBeTruthy();
    const shipmentId = mine.id;

    // A packable package: weight, volume and an item.
    await page.goto(`/ops/shipments/${shipmentId}`);
    await page.getByRole('button', { name: '+ Add Package' }).click();
    const dialog = page.getByRole('dialog');
    await pickSelect(page, 'Customer', /#\d+/);
    await fillField(page, /^CBM/, '2');
    await fillField(page, /Weight \(kg\)/, '300');
    await page.getByRole('combobox', { name: 'Good Type' }).first().click();
    await page.getByRole('option', { name: /Electronics/ }).first().click();
    await dialog.getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /package created/i);

    const detail = await (await request.get(`${API}/api/shipments/${shipmentId}/detail`, { headers })).json();
    const pkgId = detail.packages[0].id;

    // Drive to ReadyToShip: schedule → receive → pack → receiving photo → ready.
    await request.post(`${API}/api/shipments/${shipmentId}/schedule`, { headers });
    await request.post(`${API}/api/packages/${pkgId}/receive`, { headers });
    await request.post(`${API}/api/packages/${pkgId}/pack`, { headers });
    const upload = await request.post(`${API}/api/packages/${pkgId}/media`, {
      headers,
      multipart: {
        Stage: 'Receiving',
        OperatorName: 'E2E',
        File: { name: 'receiving.jpg', mimeType: 'image/jpeg', buffer: TINY_JPEG },
      },
    });
    expect(upload.ok(), `media upload → ${upload.status()}`).toBeTruthy();

    const ready = await request.post(`${API}/api/packages/${pkgId}/ready-to-ship`, { headers });
    expect(ready.ok(), `ready-to-ship → ${ready.status()} ${await ready.text()}`).toBeTruthy();
    const rtd = await request.post(`${API}/api/shipments/${shipmentId}/ready-to-depart`, { headers });
    expect(rtd.ok(), `ready-to-depart → ${rtd.status()}`).toBeTruthy();

    // Move it out of the staged container, through the UI.
    await page.goto(`/ops/shipments/${shipmentId}`);
    const table = page.getByRole('table').last();
    await expect(table.getByText('Ready to Ship').first()).toBeVisible();
    await table.getByRole('row').nth(1).getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Move to Next Shipment' }).click();
    await confirmDialog(page);
    await expectToast(page, /reverted to Packed/i);

    // The package now sits on a Draft shipment, back at Packed.
    // GET /api/packages/{id} answers { package, items, media }.
    const { package: moved } = await (await request.get(`${API}/api/packages/${pkgId}`, { headers })).json();
    expect(moved.status).toBe('Packed');
    expect(moved.shipmentId).not.toBe(shipmentId);

    const targetDetail = await (await request.get(`${API}/api/shipments/${moved.shipmentId}/detail`, { headers })).json();
    expect(targetDetail.shipment.status).toBe('Draft');

    // …and the emptied container cancelled itself.
    const source = await (await request.get(`${API}/api/shipments/${shipmentId}`, { headers })).json();
    expect(source.status).toBe('Cancelled');
  });
});
