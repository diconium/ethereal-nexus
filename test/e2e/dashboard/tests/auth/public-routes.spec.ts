/**
 * Tests for routes and pages that are intentionally public (no auth required).
 *
 * We assert:
 *  - Auth flow pages (`/auth/*`) return 200 without a session
 *  - Public API endpoints return 200 (or a non-auth error) without credentials
 *
 * Note: The `(iframe)` route group pages (`/components/[id]/versions/[versionId]/preview-new-window`)
 * appear to be public at the layout level but their underlying data actions call `auth()`,
 * so they redirect to sign-in for unauthenticated users. They are covered in session-pages.spec.ts.
 */
import { test, expect } from '@playwright/test';

// All tests here use a fresh browser with no stored session
test.use({ storageState: undefined });

// ── Auth flow pages ──────────────────────────────────────────────────────
test.describe('Auth flow pages — accessible without session', () => {
  const AUTH_PAGES = [
    '/auth/signin',
    '/auth/signup',
    '/auth/email',
  ];

  for (const url of AUTH_PAGES) {
    test(`GET ${url} → 200 without session`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response?.status()).toBe(200);
      // Must NOT show an error redirect (e.g. /auth/signin?error=...)
      await expect(page).not.toHaveURL(/\/auth\/signin\?error/);
    });
  }
});

// ── Public API routes ────────────────────────────────────────────────────
test.describe('Public API routes — accessible without credentials', () => {
  test('POST /api/logs → accepts log entries without auth', async ({ request }) => {
    const response = await request.post('/api/logs', {
      data: [{ level: 'info', message: 'e2e test log', timestamp: Date.now() }],
    });
    expect(response.status()).not.toBe(401);
    expect(response.status()).not.toBe(403);
  });

  test('POST /api/logs → 400 on non-array body (validation error, not auth error)', async ({ request }) => {
    const response = await request.post('/api/logs', {
      data: { not: 'an array' },
    });
    expect(response.status()).toBe(400);
  });

  test('GET /api/v1/[catalogueSlug] → public catalogue endpoint returns non-auth response', async ({ request }) => {
    const response = await request.get('/api/v1/nonexistent-catalogue-slug');
    expect(response.status()).not.toBe(401);
    expect(response.status()).not.toBe(403);
  });
});
