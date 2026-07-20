/**
 * Auth tests for session-protected UI pages (the `(session)` route group).
 *
 * Two scenarios per route:
 *  1. Unauthenticated → should redirect to /auth/signin
 *  2. Authenticated   → should NOT redirect to /auth/signin (page loads)
 *
 * Dynamic routes use IDs from the environment fixtures.
 * We do not assert the full page content — only that auth gating works correctly.
 */
import { test, expect, Page } from '@playwright/test';
import { STORAGE_STATE_PATH } from '../../fixtures/constants';
import { envData } from '../../fixtures/env';

const { projectId, environmentId } = envData;

// Representative sample of (session)-group pages — one per major section.
// Dynamic segments are filled with real IDs from the test environment.
const SESSION_PAGES = [
  '/',
  '/components',
  `/components/${projectId}`,
  '/projects',
  '/projects/new',
  `/projects/${projectId}`,
  `/projects/${projectId}/activity`,
  `/projects/${projectId}/settings`,
  `/projects/${projectId}/users`,
  `/projects/${projectId}/ai`,
  `/projects/${projectId}/ai/settings`,
  `/projects/${projectId}/ai/chatbots`,
  `/projects/${projectId}/ai/catalogues`,
  `/projects/${projectId}/ai/author-dialogs`,
  `/projects/${projectId}/ai/content-advisor`,
];

// ── Unauthenticated: redirect to sign-in ──────────────────────────────────
test.describe('Session pages — unauthenticated access redirects to sign-in', () => {
  // Fresh browser context, no stored session
  test.use({ storageState: undefined });

  for (const url of SESSION_PAGES) {
    test(`GET ${url} → redirects to /auth/signin`, async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  }
});

// ── Authenticated: page loads (no redirect to sign-in) ────────────────────
test.describe('Session pages — authenticated access reaches the page', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  for (const url of SESSION_PAGES) {
    test(`GET ${url} → does not redirect to /auth/signin`, async ({ page }) => {
      await page.goto(url);
      // Use 'domcontentloaded' — 'networkidle' can hang on pages with long-poll/websocket connections
      await page.waitForLoadState('domcontentloaded');
      await expect(page).not.toHaveURL(/\/auth\/signin/);
    });
  }
});
