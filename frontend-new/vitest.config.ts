import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests only. The Playwright suite owns anything that needs a browser and
// a live backend; these run in milliseconds and cover the logic underneath.
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // e2e/ is Playwright's; running it here would launch nothing and fail.
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
