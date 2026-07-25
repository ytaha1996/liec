import { expect, type Page } from '@playwright/test';

export const ADMIN_EMAIL = 'admin@local';
export const ADMIN_PASSWORD = 'Admin123!';
export const FIELD_EMAIL = 'field@e2e.local';
export const FIELD_PASSWORD = 'Field123!e2e';
export const API = 'http://localhost:53095';

// Sonner renders toasts into [data-sonner-toast] nodes. StrictMode in dev can
// double-fire effects, so always match the first occurrence.
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(page.locator('[data-sonner-toast]').filter({ hasText: text }).first()).toBeVisible();
}

// Radix Select: trigger is a combobox button; options render in a portal.
export async function pickSelect(page: Page, label: string | RegExp, option: string | RegExp) {
  await page.getByRole('combobox', { name: label }).click();
  await page.getByRole('option', { name: option }).first().click();
}

// GenericDatePicker: labelled trigger button opens a Radix popover (NOT a
// dialog role) containing the shadcn calendar (`[data-slot="calendar"]`).
// Click today's day-number cell; `.first()` skips duplicate numbers from
// adjacent-month outside days.
export async function pickDate(page: Page, label: string | RegExp) {
  await page.getByRole('button', { name: label }).click();
  const calendar = page.locator('[data-slot="calendar"]').last();
  await expect(calendar).toBeVisible();
  // Day buttons are labelled "Saturday, July 25th, 2026" (react-day-picker).
  const now = new Date();
  const d = now.getDate();
  const suffix = d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th';
  const month = now.toLocaleString('en-US', { month: 'long' });
  await calendar
    .getByRole('button', { name: new RegExp(`${month} ${d}${suffix}, ${now.getFullYear()}`) })
    .first()
    .click();
}

// Global ConfirmationBox (AlertDialog). Confirm button text varies
// (Confirm / Delete / custom) — click the last action button.
export async function confirmDialog(page: Page, buttonText?: string | RegExp) {
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  if (buttonText) {
    await dialog.getByRole('button', { name: buttonText }).click();
  } else {
    await dialog.getByRole('button').last().click();
  }
  await expect(dialog).not.toBeVisible();
}

// Fill a labelled input inside the currently-open dialog (or page).
export async function fillField(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label).first().fill(value);
}

// Submit the DynamicFormWidget in the open dialog.
export async function submitForm(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Submit' }).click();
}
