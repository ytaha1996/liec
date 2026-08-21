import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickDate, pickSelect, submitForm } from './helpers';

test.describe.serial('shipments flow', () => {
  test('create shipment with validation', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByRole('button', { name: 'Create Shipment' }).click();

    await pickSelect(page, 'Origin Warehouse', /Beirut/);
    await pickSelect(page, 'Destination Warehouse', /Gabon/);
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    await submitForm(page);
    await expectToast(page, /created/i);

    // New ref code appears (BEI-…)
    await expect(page.getByText(/BEI-\d+/).first()).toBeVisible();
  });

  test('detail: edit TIIU then schedule', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(/BEI-\d+/).first().click();
    await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);
    await expect(page.getByText('Shipment Info')).toBeVisible();

    // Edit drawer: set a valid TIIU (required for scheduling)
    await page.getByRole('button', { name: 'Edit Info' }).click();
    await fillField(page, 'TIIU Code', 'ABCD12345');
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /updated/i);

    // Schedule transition
    await page.getByRole('button', { name: 'Schedule', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Scheduled').first()).toBeVisible();
  });

  test('add package with an inline item', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(/BEI-\d+/).first().click();

    await page.getByRole('button', { name: '+ Add Package' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Add Package to Shipment')).toBeVisible();

    await pickSelect(page, 'Customer', /#\d+/);
    await fillField(page, /^CBM/, '2');
    await fillField(page, /Weight \(kg\)/, '150');

    // First inline item row (three empty rows render — target the first)
    await page.getByRole('combobox', { name: 'Good Type' }).first().click();
    await page.getByRole('option', { name: /Electronics/ }).first().click();
    await dialog.getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /package created/i);

    // Package row lands in the table
    await expect(page.getByText('Packages in Shipment')).toBeVisible();
    await expect(page.getByRole('table').last().getByRole('row').nth(1)).toBeVisible();
  });

  test('bulk-select shows the action bar', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByText(/BEI-\d+/).first().click();
    await expect(page.getByText('Packages in Shipment')).toBeVisible();

    // Select the first package row
    const table = page.getByRole('table').last();
    await table.getByRole('row').nth(1).getByRole('checkbox').check();

    await expect(page.getByText(/1 selected/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Packages' })).toBeVisible();
    // Draft package → ready-to-ship not eligible (requires Packed)
    await expect(page.getByRole('button', { name: 'Mark Ready to Ship' })).toBeDisabled();
  });
});
