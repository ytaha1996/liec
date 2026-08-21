import { test, expect } from '@playwright/test';
import { confirmDialog, expectToast, fillField, pickSelect, submitForm } from './helpers';

const STAMP = Date.now().toString().slice(-6);
const NEW_USER = `e2e-mgr-${STAMP}@e2e.local`;

test.describe.serial('user management', () => {
  test('create a Manager user', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Create User' }).click();

    await fillField(page, 'Email', NEW_USER);
    await fillField(page, /Password/, 'Manager123!e2e');
    await pickSelect(page, 'Role', 'Manager');
    await submitForm(page);
    await expectToast(page, /saved/i);

    const row = page.getByRole('row').filter({ hasText: NEW_USER });
    await expect(row.getByText('Manager')).toBeVisible();
  });

  test('edit: change role', async ({ page }) => {
    await page.goto('/admin/users');
    const row = page.getByRole('row').filter({ hasText: NEW_USER });
    await row.getByRole('button', { name: 'Edit' }).click();
    await pickSelect(page, 'Role', 'Accountant');
    await submitForm(page);
    await expectToast(page, /saved/i);
    await expect(row.getByText('Accountant')).toBeVisible();
  });

  test('self role change is rejected', async ({ page }) => {
    await page.goto('/admin/users');
    const selfRow = page.getByRole('row').filter({ hasText: 'admin@local' });
    await selfRow.getByRole('button', { name: 'Edit' }).click();
    await pickSelect(page, 'Role', 'Manager');
    await submitForm(page);
    await expectToast(page, /cannot change your own role/i);
  });

  test('deactivating the last active admin is rejected', async ({ page }) => {
    await page.goto('/admin/users');
    const selfRow = page.getByRole('row').filter({ hasText: 'admin@local' });
    await selfRow.getByRole('button', { name: 'Edit' }).click();
    // Keep role Admin, uncheck Active → LAST_ADMIN guard must block.
    await page.getByRole('dialog').getByLabel('Active').click();
    await submitForm(page);
    await expectToast(page, /last active admin/i);
  });

  test('self delete button is hidden; created user can be deleted', async ({ page }) => {
    await page.goto('/admin/users');
    const selfRow = page.getByRole('row').filter({ hasText: 'admin@local' });
    await expect(selfRow.getByRole('button', { name: 'Delete' })).toHaveCount(0);

    const row = page.getByRole('row').filter({ hasText: NEW_USER });
    await row.getByRole('button', { name: 'Delete' }).click();
    await confirmDialog(page, 'Delete');
    await expectToast(page, /deleted/i);
    await expect(page.getByText(NEW_USER)).toHaveCount(0);
  });
});
