import { test as setup, expect, request } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, FIELD_EMAIL, FIELD_PASSWORD, API } from './helpers';

// Paths are relative to the Playwright cwd (the config directory) — the
// package is ESM ("type": "module") so __dirname doesn't exist here.
const authDir = path.join('e2e', '.auth');

setup('authenticate admin + provision field user', async ({ page }) => {
  fs.mkdirSync(authDir, { recursive: true });

  // ── Admin: login through the UI once, persist storageState ──────────────
  await page.goto('/login');
  await page.getByLabel('Email').fill(ADMIN_EMAIL);
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/ops\/dashboard/);
  await page.context().storageState({ path: path.join(authDir, 'admin.json') });

  // Against the REAL database (local backend on Azure MySQL, or a deployed
  // API), stop here — don't provision the Field test user (a known-password
  // account) outside the throwaway InMemory stack.
  if (process.env.E2E_REAL || process.env.E2E_API) return;

  // ── Field user: create via API (idempotent), login via API, synthesize
  //    a storageState with the token in localStorage ───────────────────────
  const api = await request.newContext({ baseURL: API });
  const adminLogin = await api.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(adminLogin.ok()).toBeTruthy();
  const { token: adminToken } = await adminLogin.json();

  const createRes = await api.post('/api/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { email: FIELD_EMAIL, password: FIELD_PASSWORD, role: 'Field', isActive: true },
  });
  // 200/201 on fresh runs; conflict if the user survived a previous run.
  expect([200, 201, 409, 400]).toContain(createRes.status());

  const fieldLogin = await api.post('/api/auth/login', {
    data: { email: FIELD_EMAIL, password: FIELD_PASSWORD },
  });
  expect(fieldLogin.ok()).toBeTruthy();
  const { token: fieldToken } = await fieldLogin.json();

  // The app reads the JWT from localStorage key 'token'.
  fs.writeFileSync(
    path.join(authDir, 'field.json'),
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:5173',
          localStorage: [{ name: 'token', value: fieldToken }],
        },
      ],
    }),
  );
  await api.dispose();
});
