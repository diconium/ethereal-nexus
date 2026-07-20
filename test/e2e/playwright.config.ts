import { defineConfig } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'node:path';
import { STORAGE_STATE_PATH } from './dashboard/fixtures/constants';
dotenv.config(
  {
    path: [
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '.env.local')
    ]
  }
);

const environment = process.env.TEST_E2E_BASE_URL || 'http://localhost:3000';

export { STORAGE_STATE_PATH };

export default defineConfig({
  timeout: 30000,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    actionTimeout: 0,
    trace: 'on-first-retry',
    baseURL: environment,
  },
  projects: [
    // ── Step 1: log in once, save session to disk ─────────────────────────
    {
      name: 'setup',
      testMatch: '**/auth/global.setup.ts',
    },

    // ── Step 2: run all tests (auth tests control their own storageState) ─
    {
      name: 'dashboard',
      dependencies: ['setup'],
      testMatch: ['**/tests/**/*.spec.ts'],
    },
  ],
});
