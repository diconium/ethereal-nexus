/**
 * Auth tests for internal-service routes.
 *
 * These endpoints use `ensureInternalServiceAccess()` which checks the
 * `x-internal-service-key` request header against `INTERNAL_SERVICE_SECRET`.
 *
 * Expected behaviour:
 *  - Missing header           → 401 Unauthorized
 *  - Wrong header value       → 401 Unauthorized
 *  - Correct header value     → not 401
 */
import { test, expect } from '@playwright/test';
import { envData } from '../../fixtures/env';

const { internalServiceSecret } = envData;

// All internal service routes (POST only).
const INTERNAL_ROUTES = [
  '/api/internal/analytics/chatbots/cleanup',
  '/api/internal/analytics/chatbots/finalize-sessions',
  '/api/internal/analytics/chatbots/process-unmatched',
];

// ── No internal-service header → 401 ────────────────────────────────────
test.describe('Internal service routes — missing header → 401', () => {
  for (const path of INTERNAL_ROUTES) {
    test(`POST ${path} → 401 without x-internal-service-key`, async ({ request }) => {
      const response = await request.post(path, { data: {} });
      expect(response.status()).toBe(401);
    });
  }
});

// ── Wrong secret → 401 ──────────────────────────────────────────────────
test.describe('Internal service routes — wrong secret → 401', () => {
  for (const path of INTERNAL_ROUTES) {
    test(`POST ${path} → 401 with wrong x-internal-service-key`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { 'x-internal-service-key': 'wrong-secret' },
        data: {},
      });
      expect(response.status()).toBe(401);
    });
  }
});

// ── Correct secret → not 401 ────────────────────────────────────────────
test.describe('Internal service routes — correct secret is accepted', () => {
  for (const path of INTERNAL_ROUTES) {
    test(`POST ${path} → not 401 with correct x-internal-service-key`, async ({ request }) => {
      const response = await request.post(path, {
        headers: { 'x-internal-service-key': internalServiceSecret },
        data: {},
      });
      expect(response.status()).not.toBe(401);
      expect(response.status()).not.toBe(403);
    });
  }
});
