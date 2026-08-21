import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickDate, pickSelect } from './helpers';

// Full shipment lifecycle on a dedicated GAB→CHN route (no other spec uses it,
// so ref-code lookups stay unambiguous). Serial: each test builds on the last.
// Runs alphabetically BEFORE packages/shipments specs, so during this spec the
// only GAB-origin shipments are ours.
let refCode = '';
let cancelledRef = '';

async function createGabShipment(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/ops/shipments');
  await page.getByRole('button', { name: 'Create Shipment' }).click();
  await pickSelect(page, 'Origin Warehouse', /Gabon/);
  await pickSelect(page, 'Destination Warehouse', /China/);
  await pickDate(page, /Planned Departure Date/);
  await pickDate(page, /Planned Arrival Date/);
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
  await expectToast(page, /created/i);
}

async function addPackageWithItem(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('button', { name: '+ Add Package' }).click();
  const dialog = page.getByRole('dialog');
  await pickSelect(page, 'Customer', /#\d+/);
  await fillField(page, /^CBM/, '1');
  await fillField(page, /Weight \(kg\)/, '100');
  await page.getByRole('combobox', { name: 'Good Type' }).first().click();
  await page.getByRole('option', { name: /Electronics/ }).first().click();
  await dialog.getByRole('button', { name: 'Submit' }).click();
  await expectToast(page, /package created/i);
}

test.describe.serial('shipment full lifecycle', () => {
  test('create + set TIIU + schedule', async ({ page }) => {
    await createGabShipment(page);
    refCode = (await page.getByText(/GAB-\d+/).first().innerText()).trim();

    await page.getByText(refCode).click();
    await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);

    await page.getByRole('button', { name: 'Edit Info' }).click();
    await fillField(page, 'TIIU Code', 'GABC12345');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /updated/i);

    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Scheduled').first()).toBeVisible();
  });

  test('add two packages, receive + pack each', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(refCode).click();
    await addPackageWithItem(page);
    await addPackageWithItem(page);

    // Receive + Pack each package via its detail page.
    for (let i = 0; i < 2; i++) {
      await page.goto('/ops/shipments');
      await page.getByText(refCode).click();
      const table = page.getByRole('table').last();
      // Row order: id desc — nth(1) is the newest; process rows 1 and 2.
      await table.getByRole('row').nth(i + 1).getByRole('button').first().click();
      await expect(page).toHaveURL(/\/ops\/packages\/\d+/);

      await page.getByRole('button', { name: 'Receive', exact: true }).click();
      await confirmDialog(page);
      await expectToast(page, /updated/i);

      await page.getByRole('button', { name: 'Pack', exact: true }).click();
      await confirmDialog(page);
      await expectToast(page, /updated/i);
      await expect(page.getByText('Packed').first()).toBeVisible();
    }
  });

  // NOTE: the pipeline beyond Packed is photo-gated (receiving photos unlock
  // ready-to-ship; departure photos unlock depart). Photo upload hits Azure
  // Blob, so the happy path past this point lives behind @external. What we
  // CAN verify without photos is that the gates actually block — which is the
  // business rule that matters.

  test('bulk Mark Ready to Ship is blocked by the receiving-photo gate', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(refCode).click();
    const table = page.getByRole('table').last();

    // Select all rows via the header checkbox
    await table.getByRole('checkbox').first().check();
    await expect(page.getByText(/2 selected/)).toBeVisible();

    const rts = page.getByRole('button', { name: 'Mark Ready to Ship' });
    await expect(rts).toBeEnabled();
    await rts.click();
    await confirmDialog(page);
    // All-or-nothing validation: no package has a receiving photo → blocked.
    await expectToast(page, /receiving photo/i);
    await expect(table.getByText('Packed').first()).toBeVisible();
  });

  test('bulk Cancel executes on one package', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(refCode).click();
    const table = page.getByRole('table').last();

    await table.getByRole('row').nth(1).getByRole('checkbox').check();
    await expect(page.getByText(/1 selected/)).toBeVisible();

    const cancel = page.getByRole('button', { name: 'Cancel Packages' });
    await expect(cancel).toBeEnabled();
    await cancel.click();
    await confirmDialog(page);
    await expectToast(page, /1 package\(s\) updated/i);
    await expect(table.getByText('Cancelled').first()).toBeVisible();
  });

  test('Ready To Depart is blocked while no package is Ready to Ship', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(refCode).click();

    await page.getByRole('button', { name: 'Ready To Depart' }).click();
    // Preview endpoint reports canProceed=false → error toast, no dialog.
    await expectToast(page, /ready to ship|cannot proceed|at least/i);
    await expect(page.getByText('Scheduled').first()).toBeVisible();
  });

  test('FX snapshots section renders (empty state pre-departure)', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(refCode).click();
    await expect(page.getByText('FX Rate Snapshots')).toBeVisible();
    await expect(page.getByText(/No FX snapshots captured yet/)).toBeVisible();
  });

  test('cancel a Draft shipment', async ({ page }) => {
    await createGabShipment(page);
    // Two GAB rows now — pick the one that isn't our lifecycle shipment.
    const refs = await page.getByText(/GAB-\d+/).allInnerTexts();
    cancelledRef = refs.map((r) => r.trim()).find((r) => r !== refCode)!;
    expect(cancelledRef).toBeTruthy();

    await page.getByText(cancelledRef).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Cancelled').first()).toBeVisible();
  });
});
