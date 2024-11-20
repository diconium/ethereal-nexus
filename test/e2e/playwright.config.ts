import { defineConfig } from '@playwright/test';

import dotenv from 'dotenv';
import path from 'node:path';
dotenv.config(
  {
    path: [
      path.resolve(__dirname, '.env'),
      path.resolve(__dirname, '.env.local')
    ]
  }
);

const environment = process.env.TEST_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  timeout: 6000,
  expect: {
    timeout: 2000
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
});
