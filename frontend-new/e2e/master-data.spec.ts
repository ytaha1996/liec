import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickSelect, submitForm } from './helpers';

// Unique per run — a shared InMemory backend persists across retries, so
// created entities must not collide on unique fields (names, phone numbers).
const STAMP = Date.now().toString().slice(-6);
// 3-letter codes derived from the stamp (unique columns: Warehouse.Code, Currency.Code).
const LETTERS = STAMP.split('').map((d) => String.fromCharCode(65 + Number(d) * 2)).join('');
const WH_CODE = LETTERS.slice(0, 3);
const CCY_CODE = 'Z' + LETTERS.slice(3, 5);

test.describe('master data CRUD', () => {
  test('warehouse create + edit', async ({ page }) => {
    await page.goto('/master/warehouses');
    await page.getByRole('button', { name: 'Create Warehouse' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Create Warehouse')).toBeVisible();
    await fillField(page, /^Code/, WH_CODE);
    await fillField(page, /^Name/, `E2E WH ${STAMP}`);
    await fillField(page, /^City/, 'Testville');
    await fillField(page, /^Country/, 'Testland');
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(page.getByText(`E2E WH ${STAMP}`)).toBeVisible();

    // Edit
    const row = page.getByRole('row').filter({ hasText: `E2E WH ${STAMP}` });
    await row.getByRole('button', { name: 'Edit' }).click();
    await fillField(page, /^Name/, `E2E WH ${STAMP} v2`);
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(page.getByText(`E2E WH ${STAMP} v2`)).toBeVisible();
  });

  test('good type create (bilingual)', async ({ page }) => {
    await page.goto('/master/good-types');
    await page.getByRole('button', { name: 'Create Good Type' }).click();
    await fillField(page, 'Name (EN)', `E2E Widgets ${STAMP}`);
    await fillField(page, 'Name (AR)', 'أدوات اختبار');
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(page.getByText(`E2E Widgets ${STAMP}`)).toBeVisible();
  });

  test('supplier create', async ({ page }) => {
    await page.goto('/master/suppliers');
    await page.getByRole('button', { name: 'Create Supplier' }).click();
    await fillField(page, /^Name/, `E2E Supplies ${STAMP}`);
    await fillField(page, 'Email', 'supplies@e2e.local');
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(page.getByText(`E2E Supplies ${STAMP}`)).toBeVisible();
  });

  test('currency create requires anchor+rate for non-base', async ({ page }) => {
    await page.goto('/master/currencies');
    await page.getByRole('button', { name: 'Create Currency' }).click();

    await fillField(page, /Code/, CCY_CODE);
    await fillField(page, /^Name/, `E2E Pound ${STAMP}`);
    // Leave anchor/rate empty — the conditional-required rules must block submit
    await submitForm(page);
    await expect(page.getByRole('dialog')).toBeVisible(); // still open = validation held

    await pickSelect(page, 'Anchor Currency', /USD/);
    await fillField(page, /Rate/, '1.27');
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(page.getByText(`E2E Pound ${STAMP}`)).toBeVisible();

    // Delete it again (destructive confirm)
    const row = page.getByRole('row').filter({ hasText: `E2E Pound ${STAMP}` });
    await row.getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(page, 'Delete');
    await expectToast(page, /deleted/i);
    await expect(page.getByText(`E2E Pound ${STAMP}`)).toHaveCount(0);
  });

  test('customer create → detail → consent update', async ({ page }) => {
    await page.goto('/master/customers');
    await page.getByRole('button', { name: 'Create Customer' }).click();
    await fillField(page, /^Name/, `E2E Customer ${STAMP}`);
    await fillField(page, 'Primary Phone', `+9617${STAMP}0`);
    await submitForm(page);
    await expectToast(page, /created/i);

    // Open detail
    const row = page.getByRole('row').filter({ hasText: `E2E Customer ${STAMP}` });
    await row.getByRole('button', { name: 'Open Detail' }).click();
    await expect(page).toHaveURL(/\/master\/customers\/\d+/);
    await expect(page.getByRole('heading', { name: `E2E Customer ${STAMP}`, level: 1 })).toBeVisible();

    // Toggle a consent flag and save
    await page.getByLabel('Opt-in Status Updates').click();
    await page.getByRole('button', { name: 'Update Consent' }).click();
    await expectToast(page, /consent updated/i);
  });
});
