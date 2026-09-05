import { test, expect } from '@playwright/test';

test.describe('communications', () => {
  test('messaging logs page renders (empty campaigns on a fresh DB)', async ({ page }) => {
    await page.goto('/comms/messaging-logs');
    await expect(page.getByRole('heading', { name: 'Messaging Logs', level: 1 })).toBeVisible();
    await expect(page.getByText('Campaigns').first()).toBeVisible();
    // No Twilio sends have happened — table shows the empty cell.
    await expect(page.getByText('No data')).toBeVisible();
  });

  test('group helper export shows caution + gated buttons for admin', async ({ page }) => {
    await page.goto('/comms/group-helper-export');
    await expect(page.getByRole('heading', { name: 'Group Helper Export', level: 1 })).toBeVisible();
    await expect(page.getByText(/reveal phone numbers/i)).toBeVisible();
    // Buttons render for canExport roles (clicks hit Azure Blob — not exercised).
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export VCF' })).toBeVisible();
  });
});
