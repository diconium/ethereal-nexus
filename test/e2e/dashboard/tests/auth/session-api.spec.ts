/**
 * Auth tests for session-authenticated API routes.
 *
 * These endpoints use `auth()` (NextAuth session).
 * Actual responses when unauthenticated vary by route (see comments).
 *
 * We use Playwright's `request` fixture (APIRequestContext) so tests run as
 * pure HTTP calls without a browser, keeping them fast.
 *
 * Two suites per route:
 *  1. No session  → expected status (401 or 403 depending on implementation)
 *  2. With session (cookies from saved storage state) → not 401/403
 */
import { test, expect } from '@playwright/test';
import { STORAGE_STATE_PATH } from '../../fixtures/constants';
import { envData } from '../../fixtures/env';

const { projectId } = envData;

// Routes and the expected status when called without a session.
const SESSION_API_ROUTES: Array<{ method: string; path: string; body?: object; unauthStatus: number }> = [
  // /api/chat — 404 when OPENAI_API_KEY is not set (notFound() is called first)
  {
    method: 'POST',
    path: '/api/chat',
    body: { messages: [] },
    unauthStatus: 404,
  },
  // /api/events/query — 403 when unauthenticated
  {
    method: 'POST',
    path: '/api/events/query',
    body: { projectId, type: 'view' },
    unauthStatus: 403,
  },
  // /api/v1/cli/apikeys — 401 when unauthenticated (correctly returns 401)
  {
    method: 'GET',
    path: '/api/v1/cli/apikeys',
    unauthStatus: 401,
  },
  // /api/projects/[id]/environments — 403 when unauthenticated
  {
    method: 'GET',
    path: `/api/projects/${projectId}/environments`,
    unauthStatus: 403,
  },
  // /api/projects — 401 (auth check delegated to data layer which returns "No user provided.")
  {
    method: 'GET',
    path: '/api/projects',
    unauthStatus: 401,
  },
];

// ── Unauthenticated: expect the documented error status ───────────────────
test.describe('Session API routes — unauthenticated requests are rejected', () => {
  for (const route of SESSION_API_ROUTES) {
    test(`${route.method} ${route.path} → ${route.unauthStatus} when no session`, async ({ request }) => {
      const response = await request[route.method.toLowerCase() as 'get' | 'post'](
        route.path,
        route.body ? { data: route.body } : undefined,
      );
      expect(response.status()).toBe(route.unauthStatus);
    });
  }
});

// ── Authenticated: expect NOT 401/403 ────────────────────────────────────
// Routes that return 4xx for reasons other than auth (e.g. missing env vars) are excluded
// from the "authenticated = 2xx" check. We only verify no auth-specific rejection.
const AUTHENTICATED_ROUTES = SESSION_API_ROUTES.filter(r =>
  // /api/chat always returns 404 when OPENAI_API_KEY is not set — skip auth check
  r.path !== '/api/chat'
);
test.describe('Session API routes — authenticated requests are accepted', () => {
  test.use({ storageState: STORAGE_STATE_PATH });

  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route.method} ${route.path} → not 401/403 with valid session`, async ({ request }) => {
      const response = await request[route.method.toLowerCase() as 'get' | 'post'](
        route.path,
        route.body ? { data: route.body } : undefined,
      );
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });
  }
});
