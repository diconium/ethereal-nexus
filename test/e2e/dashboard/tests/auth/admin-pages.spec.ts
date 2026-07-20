/**
 * Auth tests for admin-only UI pages (the `(session)/(admin)` route group).
 *
 * The admin layout calls `notFound()` for non-admins, so:
 *  - Unauthenticated → parent (session) layout catches first → redirect to /auth/signin
 *  - Authenticated non-admin → 404
 *  - Authenticated admin → page loads
 *
 * The test user (TEST_E2E_VALID_USERNAME) is an admin, so we can only verify
 * the unauthenticated and authenticated-admin scenarios here.
 * Non-admin testing requires a separate user account (add TEST_E2E_NON_ADMIN_* vars
 * if/when a non-admin test user is available).
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from '../../fixtures/constants';

const ADMIN_PAGES = [
  '/users',
  '/users/new',
];

// ── Unauthenticated: redirect to sign-in (caught by parent session layout) ─
test.describe('Admin pages — unauthenticated access redirects to sign-in', () => {
  test.use({ storageState: undefined });

  for (const url of ADMIN_PAGES) {
    test(`GET ${url} → redirects to /auth/signin`, async ({ page }) => {
      await page.goto(url);
      await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 10000 });
    });
  }
});

// ── Authenticated admin: page loads ──────────────────────────────────────
test.describe('Admin pages — authenticated admin access reaches the page', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  for (const url of ADMIN_PAGES) {
    test(`GET ${url} → does not redirect to /auth/signin`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      await expect(page).not.toHaveURL(/\/auth\/signin/);
      // Admin pages return 404 for non-admins — confirm we are NOT on a 404 page
      await expect(page).not.toHaveURL(/\/404/);
    });
  }
});
