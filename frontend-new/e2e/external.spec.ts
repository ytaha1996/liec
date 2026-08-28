import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
import { API } from './helpers';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

// Tests touching external services (Azure Blob, Twilio). Excluded by default;
// run with:  E2E_EXTERNAL=1 npx playwright test --grep @external
test.describe('external integrations @external', () => {
  test('whatsapp campaign confirm dialog opens and cancels cleanly', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(/BEI-\d+/).first().click();

    const sendButton = page.getByRole('button', { name: 'Send', exact: true }).first();
    if (await sendButton.isVisible().catch(() => false)) {
      await sendButton.click();
      const dialog = page.getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      // Cancel — never actually send during tests
      await dialog.getByRole('button', { name: 'Cancel' }).click();
      await expect(dialog).not.toBeVisible();
    }
  });

  test('documents tab shows the upload affordance', async ({ page }) => {
    // The package list is hidden — reach a package through its shipment.
    await page.goto('/ops/shipments');
    await page.getByRole('row').nth(1).getByRole('link').first().click();
    await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);
    await page.getByRole('table').last().getByRole('row').nth(1).getByRole('button').first().click();
    await expect(page).toHaveURL(/\/ops\/packages\/\d+/);
    await page.getByRole('tab', { name: 'Photos' }).click();
    await expect(page.getByText('Documents')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
    // Actual upload hits Azure Blob — not exercised here.
  });

  // WhatsApp renders JPEG/PNG only and Twilio does not transcode, so whatever
  // lands in blob storage has to already be sendable.
  test('uploaded photos are stored in a format WhatsApp can render', async ({ page, request }) => {
    await page.goto('/ops/shipments');
    const token = await page.evaluate(() => localStorage.getItem('token'));
    const headers = { Authorization: `Bearer ${token}` };

    const wh = await (await request.get(`${API}/api/warehouses`, { headers })).json();
    const cust = await (await request.get(`${API}/api/customers`, { headers })).json();
    const ship = await (await request.post(`${API}/api/shipments`, {
      headers,
      data: {
        originWarehouseId: wh[0].id,
        destinationWarehouseId: wh[1].id,
        plannedDepartureDate: '2026-08-25',
        plannedArrivalDate: '2026-09-25',
      },
    })).json();
    const pkg = await (await request.post(`${API}/api/shipments/${ship.id}/packages`, {
      headers,
      data: {
        customerId: cust[0].id,
        provisionMethod: 'CustomerProvided',
        supplyOrderId: null,
        weightKg: 10,
        cbm: 0.1,
      },
    })).json();

    const upload = (name: string, mimeType: string, buffer: Buffer) =>
      request.post(`${API}/api/packages/${pkg.id}/media`, {
        headers,
        multipart: { Stage: 'Departure', File: { name, mimeType, buffer } },
      });

    // The watermarker re-encodes to JPEG — the stored type must follow the bytes,
    // or the blob claims image/png while holding JPEG.
    const png = await upload('shot.png', 'image/png', PNG_1PX);
    expect(png.ok(), await png.text()).toBeTruthy();
    const pngUrl = String((await png.json()).publicUrl);
    expect(pngUrl.endsWith('.jpg')).toBeTruthy();
    expect((await request.head(pngUrl)).headers()['content-type']).toBe('image/jpeg');

    // HEIC straight off an iPhone would upload happily and only fail at send time.
    const heic = await upload('IMG_0001.HEIC', 'image/heic', Buffer.from('ftypheic-not-really'));
    expect(heic.status()).toBe(400);
    expect(await heic.text()).toContain('cannot be sent over WhatsApp');
  });
});
