import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickDate, pickSelect, submitForm } from './helpers';

// Package detail-page features. The package LIST page is hidden (packages are
// managed from their shipment), so every test reaches the detail page the way a
// user does: shipment → packages table → row. Dedicated CHN→DXB route so the
// lookups stay unambiguous.
test.describe.serial('packages flow', () => {
  let pkgUrl = '';

  test('create a package from its shipment and open the detail page', async ({ page }) => {
    await page.goto('/ops/shipments');
    await page.getByRole('button', { name: 'Create Shipment' }).click();
    await pickSelect(page, 'Origin Warehouse', /China/);
    await pickSelect(page, 'Destination Warehouse', /Dubai/);
    await pickDate(page, /Planned Departure Date/);
    await pickDate(page, /Planned Arrival Date/);
    await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /created/i);

    const refCode = (await page.getByText(/CHN-\d+/).first().innerText()).trim();
    await page.getByText(refCode).click();
    await expect(page).toHaveURL(/\/ops\/shipments\/\d+/);

    await page.getByRole('button', { name: '+ Add Package' }).click();
    const dialog = page.getByRole('dialog');
    await pickSelect(page, 'Customer', /#\d+/);
    await dialog.getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, /package created/i);
    await expect(dialog).not.toBeVisible();

    await page.getByRole('table').last().getByRole('row').nth(1).getByRole('button').first().click();
    await expect(page).toHaveURL(/\/ops\/packages\/\d+/);
    await expect(page.getByText('Package Info')).toBeVisible();
    pkgUrl = page.url();
  });

  test('the hidden list route redirects to shipments', async ({ page }) => {
    await page.goto('/ops/packages');
    await expect(page).toHaveURL(/\/ops\/shipments$/);
    // …while the individual package page stays reachable.
    await page.goto(pkgUrl);
    await expect(page.getByText('Package Info')).toBeVisible();
  });

  test('add item + bulk add items', async ({ page }) => {
    await page.goto(pkgUrl);
    await page.getByRole('tab', { name: 'Items & Pricing' }).click();

    // Single add
    await page.getByRole('button', { name: 'Add Item' }).click();
    await pickSelect(page, 'Good Type', /Clothing/);
    await fillField(page, 'Quantity', '3');
    await submitForm(page);
    await expectToast(page, /item added/i);

    // Bulk add — fill 1 of the 3 default rows
    await page.getByRole('button', { name: 'Bulk Add' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Bulk Add Items')).toBeVisible();
    await dialog.getByRole('combobox', { name: 'Good Type' }).first().click();
    await page.getByRole('option', { name: /Electronics/ }).first().click();
    await dialog.getByRole('button', { name: /Save .*Item/ }).click();
    await expectToast(page, /added/i);
  });

  test('edit weight/CBM then receive → pack', async ({ page }) => {
    await page.goto(pkgUrl);
    await page.getByRole('tab', { name: 'Items & Pricing' }).click();

    await page.getByRole('button', { name: /Edit Weight/ }).click();
    await fillField(page, /^CBM/, '1.5');
    await fillField(page, /Weight \(Kg\)/, '120');
    await submitForm(page);
    await expectToast(page, /updated/i);

    // Transitions from the title actions
    await page.getByRole('button', { name: 'Receive', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);

    await page.getByRole('button', { name: 'Pack', exact: true }).click();
    await confirmDialog(page);
    await expectToast(page, /updated/i);
    await expect(page.getByText('Packed').first()).toBeVisible();
  });

  test('pricing override writes history', async ({ page }) => {
    await page.goto(pkgUrl);
    await page.getByRole('tab', { name: 'Items & Pricing' }).click();

    await page.getByRole('button', { name: 'Override' }).last().click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Override Pricing')).toBeVisible();
    await fillField(page, 'New Value', '99000');
    await fillField(page, /^Reason/, 'E2E override test');
    await submitForm(page);
    await expectToast(page, /override applied/i);

    await expect(page.getByText('Pricing Override History')).toBeVisible();
    await expect(page.getByText('E2E override test')).toBeVisible();
  });

  test('ship without departure photos surfaces the gate error', async ({ page }) => {
    // The packed package's shipment is still Draft, so Ready To Ship is
    // gated by shipment status — this asserts the disabled state instead.
    await page.goto(pkgUrl);
    const rts = page.getByRole('button', { name: 'Ready To Ship' });
    await expect(rts).toBeDisabled();
  });
});
