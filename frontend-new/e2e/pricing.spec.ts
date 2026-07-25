import { test, expect } from '@playwright/test';
import { expectToast, fillField, pickDate, pickSelect, submitForm } from './helpers';

test.describe('pricing configs', () => {
  test('create a config and activate it (previous Active retires)', async ({ page }) => {
    await page.goto('/master/pricing-configs');
    await expect(page.getByRole('heading', { name: 'Pricing Configs', level: 1 })).toBeVisible();

    // Seed ships one Active config
    await expect(page.getByText('Active', { exact: true }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Create Config' }).click();
    await fillField(page, /^Name/, 'E2E Rates 2026');
    await pickSelect(page, 'Currency', /XAF/);
    await pickDate(page, /Effective From/);
    await fillField(page, 'Default Rate Per CBM', '275000');
    await fillField(page, 'Default Rate Per Kg', '500');
    await submitForm(page);
    await expectToast(page, /created/i);

    const newRow = page.getByRole('row').filter({ hasText: 'E2E Rates 2026' });
    await expect(newRow.getByText('Draft')).toBeVisible();

    await newRow.getByRole('button', { name: 'Activate' }).click();
    await expectToast(page, /activated/i);
    await expect(newRow.getByText('Active')).toBeVisible();

    // Exactly one Active config remains
    await expect(page.getByRole('row').filter({ hasText: 'Active' })).toHaveCount(1);
  });
});
