import { test, expect } from '@playwright/test';

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
});
