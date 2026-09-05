import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickSelect, submitForm } from './helpers';

const STAMP = Date.now().toString().slice(-6);
const SO_NAME = `E2E SO ${STAMP}`;
const SO_CANCEL = `E2E SO Cancel ${STAMP}`;

test.describe.serial('supply orders', () => {
  test('create a supply order', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.getByRole('button', { name: 'Create Supply Order' }).click();

    await pickSelect(page, 'Customer', /#\d+/);
    await pickSelect(page, 'Supplier', /.+/);
    await fillField(page, /^Name/, SO_NAME);
    await fillField(page, 'Purchase Price', '1500');
    await submitForm(page);
    await expectToast(page, /created/i);

    const row = page.getByRole('row').filter({ hasText: SO_NAME });
    await expect(row.getByText('Draft')).toBeVisible();
  });

  test('lifecycle: approve → order → deliver; pack blocked without a linked package', async ({ page }) => {
    await page.goto('/master/supply-orders');
    const row = page.getByRole('row').filter({ hasText: SO_NAME });

    await row.getByRole('button', { name: 'Approve' }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Approved')).toBeVisible();

    await row.getByRole('button', { name: 'Order', exact: true }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Ordered')).toBeVisible();

    await row.getByRole('button', { name: 'Deliver to Warehouse' }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Delivered to Warehouse')).toBeVisible();

    // Pack requires a linked package — backend must reject.
    await row.getByRole('button', { name: 'Pack into Package' }).click();
    await expectToast(page, /package must be linked/i);
  });

  test('link a package via edit, then pack → close', async ({ page }) => {
    await page.goto('/master/supply-orders');
    const row = page.getByRole('row').filter({ hasText: SO_NAME });

    await row.getByRole('button', { name: 'Edit' }).click();
    await pickSelect(page, 'Package', /Package #\d+/);
    await submitForm(page);
    await expectToast(page, /updated/i);

    await row.getByRole('button', { name: 'Pack into Package' }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Packed into Package')).toBeVisible();

    await row.getByRole('button', { name: 'Close', exact: true }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Closed')).toBeVisible();

    // Terminal state: no more lifecycle actions on the row
    await expect(row.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  });

  test('cancel with a reason', async ({ page }) => {
    await page.goto('/master/supply-orders');
    await page.getByRole('button', { name: 'Create Supply Order' }).click();
    await pickSelect(page, 'Customer', /#\d+/);
    await pickSelect(page, 'Supplier', /.+/);
    await fillField(page, /^Name/, SO_CANCEL);
    await fillField(page, 'Purchase Price', '10');
    await submitForm(page);
    await expectToast(page, /created/i);

    const row = page.getByRole('row').filter({ hasText: SO_CANCEL });
    await row.getByRole('button', { name: 'Cancel', exact: true }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Cancel Supply Order')).toBeVisible();
    await dialog.getByLabel(/Reason/).fill('E2E cancellation');
    await dialog.getByRole('button', { name: 'Confirm Cancel' }).click();
    await expectToast(page, /updated/i);
    await expect(row.getByText('Cancelled')).toBeVisible();
  });
});
