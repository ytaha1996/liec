import { defineConfig, devices } from '@playwright/test';

// E2E stack is fully isolated: the backend boots on the EF InMemory provider
// (empty MySql connection string) with deterministic seed data — no Azure
// MySQL involved. Azure Blob / Twilio surfaces are only exercised by tests
// tagged @external, which are excluded by default (see grepInvert).
export default defineConfig({
  testDir: './e2e',
  // One shared backend instance holds all state — serial execution keeps
  // specs deterministic.
  workers: 1,
  fullyParallel: false,
  retries: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  grepInvert: process.env.E2E_EXTERNAL ? undefined : /@external/,

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      grepInvert: process.env.E2E_EXTERNAL ? /@mobile/ : /@external|@mobile/,
    },
    {
      // Phone-viewport smoke pass — only tests tagged @mobile.
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      grep: /@mobile/,
    },
  ],

  webServer: [
    {
      command:
        'dotnet run --no-build --project ../backend/ShippingPlatform.Api',
      url: 'http://localhost:53095/swagger/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        // Empty connection string → InMemory provider + EnsureCreated + seed.
        ConnectionStrings__MySql: '',
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: 'http://localhost:53095',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173/login',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: 'http://localhost:53095',
      },
    },
  ],
});
