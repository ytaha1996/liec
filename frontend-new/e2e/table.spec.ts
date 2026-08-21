import { test, expect } from '@playwright/test';

// EnhancedTable behaviors: client-side search, sorting, SELECT filters,
// pagination. Runs after the data-creating specs (alphabetical order), so
// shipments (incl. a Cancelled one) and 20+ customers exist.
test.describe('table behaviors', () => {
  test('search filters rows', async ({ page }) => {
    await page.goto('/master/warehouses');
    const table = page.getByRole('table');
    // 4 seeded warehouses (+ possible E2E ones) → many rows initially. Poll:
    // the table paints its header before the loader resolves, so a bare count()
    // can land on the header-only frame.
    await expect.poll(async () => table.getByRole('row').count()).toBeGreaterThan(2);
    const initialRows = await table.getByRole('row').count();

    await page.getByPlaceholder('Search…').fill('Beirut');
    // header row + exactly one match
    await expect(table.getByRole('row')).toHaveCount(2);
    await expect(table.getByText('Beirut Warehouse')).toBeVisible();

    // Clearing restores the rows (>= to stay robust against rows created by
    // earlier specs in the same run)
    await page.getByPlaceholder('Search…').clear();
    await expect
      .poll(async () => table.getByRole('row').count())
      .toBeGreaterThanOrEqual(initialRows);
  });

  test('sorting flips row order', async ({ page }) => {
    await page.goto('/master/customers');
    const table = page.getByRole('table');
    const firstCell = () => table.getByRole('row').nth(1).getByRole('cell').nth(0);

    // Sort by Name ascending
    await page.getByRole('button', { name: 'Name', exact: true }).click();
    const asc = await firstCell().innerText();
    // Toggle to descending
    await page.getByRole('button', { name: 'Name', exact: true }).click();
    const desc = await firstCell().innerText();
    expect(asc).not.toBe(desc);
  });

  test('status SELECT filter narrows shipments', async ({ page }) => {
    await page.goto('/ops/shipments');
    // lifecycle.spec cancelled one shipment — filter down to it
    await page.getByRole('combobox').filter({ hasText: 'Status' }).first().click();
    await page.getByRole('option', { name: 'Cancelled' }).click();

    const table = page.getByRole('table');
    const rows = table.getByRole('row');
    const count = await rows.count();
    expect(count).toBeGreaterThan(1); // at least one match
    for (let i = 1; i < count; i++) {
      await expect(rows.nth(i).getByText('Cancelled')).toBeVisible();
    }
  });

  test('pagination pages through customers', async ({ page }) => {
    await page.goto('/master/customers');
    // Seed = 20 customers (+ E2E-created) at pageSize 10
    await expect(page.getByText(/1–10 of 2\d/)).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page.getByText(/11–20 of 2\d/)).toBeVisible();
    await page.getByRole('button', { name: 'Previous page' }).click();
    await expect(page.getByText(/1–10 of 2\d/)).toBeVisible();
  });
});
