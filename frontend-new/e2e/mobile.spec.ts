import { test, expect } from '@playwright/test';

// Phone-viewport smoke (@mobile → runs only in the `mobile` project, Pixel 7).
// Read-only assertions: layout integrity + mobile navigation affordances.
test.describe('mobile viewport @mobile', () => {
  test('dashboard renders without horizontal page scroll', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('hamburger sheet navigates within the current app', async ({ page }) => {
    await page.goto('/ops/dashboard');
    // Hamburger is the first header button on mobile
    await page.locator('header').getByRole('button').first().click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByText('Operations')).toBeVisible();
    await sheet.getByRole('link', { name: 'Shipments' }).click();
    await expect(page).toHaveURL(/\/ops\/shipments/);
  });

  test('app launcher goes full-screen and navigates across apps', async ({ page }) => {
    await page.goto('/ops/dashboard');
    await page.getByRole('button', { name: 'Open app launcher' }).click();
    const launcher = page.getByRole('dialog');
    await expect(launcher.getByText('App Launcher')).toBeVisible();
    await launcher.getByText('Customers').click();
    await expect(page).toHaveURL(/\/master\/customers/);
  });

  test('tables scroll inside their own container, not the page', async ({ page }) => {
    await page.goto('/master/customers');
    await expect(page.getByRole('table')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('dialogs go full-screen on phones', async ({ page }) => {
    await page.goto('/master/customers');
    await page.getByRole('button', { name: 'Create Customer' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const { width } = page.viewportSize()!;
    const box = await dialog.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(width - 2);
  });
});
