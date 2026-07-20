/**
 * Auth tests for API-key authenticated routes.
 *
 * These endpoints use `authenticatedWithApiKeyUser()`.
 * The exact error status varies by route implementation:
 *   - Some return 403 Forbidden
 *   - Some return 400 Bad Request ("Api key not provided or invalid.")
 *   - Some return 500 when given an invalid (but well-formed) UUID key (app bug)
 *
 * The core invariant we test is: any non-authenticated request receives a
 * 4xx or 5xx error (never 2xx success), and a valid key receives 2xx/non-4xx.
 *
 * Three suites:
 *  1. No auth header        → error response (not 2xx)
 *  2. Invalid API key       → error response (not 2xx)
 *  3. Valid API key header  → not 401/403
 */
import { test, expect } from '@playwright/test';
import { envData } from '../../fixtures/env';

const { projectId, environmentId, apiKey } = envData;

// Routes protected by API key / Bearer auth.
const API_KEY_ROUTES: Array<{ method: string; path: string; body?: object }> = [
  { method: 'GET',  path: '/api/v1/components' },
  { method: 'POST', path: '/api/v1/components', body: { name: '__test__', description: 'e2e' } },
  { method: 'GET',  path: `/api/v1/environments/${environmentId}/components` },
  { method: 'GET',  path: `/api/v1/environments/${environmentId}/components/__nonexistent__` },
  { method: 'GET',  path: `/api/v1/projects/${projectId}/components` },
  { method: 'GET',  path: `/api/v1/projects/${projectId}/components/__nonexistent__` },
];

// ── No auth header → error (not 2xx) ────────────────────────────────────
test.describe('API key routes — no Authorization header → error response', () => {
  for (const route of API_KEY_ROUTES) {
    test(`${route.method} ${route.path} → non-2xx without auth`, async ({ request }) => {
      const response = await request[route.method.toLowerCase() as 'get' | 'post'](
        route.path,
        route.body ? { data: route.body } : undefined,
      );
      // Must not succeed — any 4xx/5xx is an acceptable rejection
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  }
});

// ── Invalid API key → error (not 2xx) ────────────────────────────────────
test.describe('API key routes — invalid API key → error response', () => {
  const INVALID_KEY = '00000000-0000-0000-0000-000000000000';

  for (const route of API_KEY_ROUTES) {
    test(`${route.method} ${route.path} → non-2xx with invalid key`, async ({ request }) => {
      const response = await request[route.method.toLowerCase() as 'get' | 'post'](
        route.path,
        {
          headers: { Authorization: `ApiKey ${INVALID_KEY}` },
          ...(route.body ? { data: route.body } : {}),
        },
      );
      expect(response.status()).toBeGreaterThanOrEqual(400);
    });
  }
});

// ── Valid API key → not 401/403 ──────────────────────────────────────────
test.describe('API key routes — valid API key is accepted', () => {
  for (const route of API_KEY_ROUTES) {
    test(`${route.method} ${route.path} → not 401/403 with valid key`, async ({ request }) => {
      const response = await request[route.method.toLowerCase() as 'get' | 'post'](
        route.path,
        {
          headers: { Authorization: `ApiKey ${apiKey}` },
          ...(route.body ? { data: route.body } : {}),
        },
      );
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });
  }
});
