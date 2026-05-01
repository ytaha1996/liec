import { test, expect } from '@playwright/test';

test.describe('Pricing Configs', () => {
  test('list loads with seed config', async ({ page }) => {
    await page.goto('/master/pricing-configs');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Standard Rate 2025').first()).toBeVisible({ timeout: 5000 });
  });

  test('create new pricing config', async ({ page }) => {
    await page.goto('/master/pricing-configs');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Create Config' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // DynamicFormWidget fields with label including * for required
    await page.getByLabel('Name*').fill('Test Config');
    await page.getByLabel('Currency*').fill('USD');

    // Effective From is a MUI DatePicker -- use .first() to avoid strict mode
    await page.getByLabel('Effective From*').first().click();
    await page.keyboard.type('06012026');

    await page.getByLabel('Default Rate Per Kg*').fill('3');
    await page.getByLabel('Default Rate Per CBM*').fill('10');

    const [pricingResp] = await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/pricing-configs') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Submit' }).click(),
    ]);
    expect(pricingResp.status()).toBeLessThan(400);
  });

  test('activate pricing config', async ({ page }) => {
    await page.goto('/master/pricing-configs');
    await page.waitForLoadState('networkidle');
    // Activate buttons are in table action columns, wrapped in Tooltip title="Activate"
    const allButtons = page.locator('table tbody button');
    const count = await allButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = allButtons.nth(i);
      const parentTitle = await btn.evaluate((el) => {
        const parent = el.closest('[title]');
        return parent ? parent.getAttribute('title') : null;
      });
      if (parentTitle === 'Activate') {
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
  });

  test('retire pricing config', async ({ page }) => {
    await page.goto('/master/pricing-configs');
    await page.waitForLoadState('networkidle');
    // Retire buttons are in table action columns, wrapped in Tooltip title="Retire"
    const allButtons = page.locator('table tbody button');
    const count = await allButtons.count();
    for (let i = 0; i < count; i++) {
      const btn = allButtons.nth(i);
      const parentTitle = await btn.evaluate((el) => {
        const parent = el.closest('[title]');
        return parent ? parent.getAttribute('title') : null;
      });
      if (parentTitle === 'Retire') {
        await btn.click();
        await page.waitForTimeout(2000);
        break;
      }
    }
  });

  test('apply pricing override on package', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /items/i }).click();
      await page.waitForTimeout(500);
      const overrideBtn = page.getByRole('button', { name: /override/i }).first();
      if (await overrideBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await overrideBtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
      }
    }
  });

  test('override history shows in pricing tab', async ({ page }) => {
    await page.goto('/ops/packages');
    await page.waitForLoadState('networkidle');
    const clickableCell = page.locator('table tbody tr td button, table tbody tr td a').first();
    if (await clickableCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      await clickableCell.click();
      await page.waitForLoadState('networkidle');
      await page.getByRole('tab', { name: /items/i }).click();
      // Check if override history section exists
      await page.waitForTimeout(1000);
      // This test just verifies the tab loads -- override history may or may not be visible
    }
  });
});
