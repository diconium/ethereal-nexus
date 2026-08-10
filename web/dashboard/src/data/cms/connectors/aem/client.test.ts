/**
 * @jest-environment node
 *
 * Tests for AEM authenticate() — verifies real HTTP probe behaviour.
 */

import { aemRequest } from './client';
import type { AemConfig } from '../../config';

const config: AemConfig = {
  name: 'Test AEM',
  authorUrl: 'https://aem.example.com',
  auth: { method: 'basic', username: 'admin', password: 'admin' },
  project: 'testsite',
  extraAppPaths: [],
  assetPaths: [],
  timeoutMs: 5000,
  allowSelfSignedSsl: false,
};

type MockResponse = { ok: boolean; status: number; text?: string };

function mockFetch(impl: (url: string) => MockResponse) {
  global.fetch = jest.fn(async (url: unknown) => {
    const r = impl(String(url));
    return {
      ok: r.ok,
      status: r.status,
      text: async () => r.text ?? '',
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('aemRequest — SSRF guard', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  beforeAll(() => {
    // Run SSRF tests in production mode so private IP blocks are active.
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });
  });

  afterAll(() => {
    Object.defineProperty(process.env, 'NODE_ENV', { value: ORIGINAL_ENV, writable: true });
  });

  it('blocks private IP endpoints in production', async () => {
    const privateCfg: AemConfig = { ...config, authorUrl: 'http://10.0.0.1' };
    const res = await aemRequest(privateCfg, '/test');
    expect(res.networkError).toBe(true);
    expect(res.ok).toBe(false);
    expect(res.errorMessage).toMatch(/disallowed/i);
  });

  it('blocks localhost in production', async () => {
    const localCfg: AemConfig = { ...config, authorUrl: 'http://localhost' };
    const res = await aemRequest(localCfg, '/test');
    expect(res.networkError).toBe(true);
    expect(res.errorMessage).toMatch(/disallowed/i);
  });

  it('always blocks cloud metadata endpoint', async () => {
    const metaCfg: AemConfig = { ...config, authorUrl: 'http://169.254.169.254' };
    const res = await aemRequest(metaCfg, '/test');
    expect(res.networkError).toBe(true);
    expect(res.errorMessage).toMatch(/disallowed/i);
  });

  it('allows public HTTPS endpoints', async () => {
    mockFetch(() => ({ ok: true, status: 200, text: '{}' }));
    const res = await aemRequest(config, '/bin/querybuilder.json');
    expect(res.ok).toBe(true);
    expect(res.networkError).toBe(false);
  });
});

describe('aemRequest — auth headers', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends Basic auth header', async () => {
    let capturedAuth = '';
    global.fetch = jest.fn(async (_url: unknown, init: unknown) => {
      capturedAuth = ((init as RequestInit).headers as Record<string, string>).Authorization ?? '';
      return { ok: true, status: 200, text: async () => '{}' } as unknown as Response;
    }) as unknown as typeof fetch;

    await aemRequest(config, '/test');
    expect(capturedAuth).toMatch(/^Basic /);
  });

  it('returns networkError on fetch throw', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    const res = await aemRequest(config, '/test');
    expect(res.networkError).toBe(true);
    expect(res.ok).toBe(false);
  });

  it('handles 401 Unauthorized', async () => {
    mockFetch(() => ({ ok: false, status: 401 }));
    const res = await aemRequest(config, '/test');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(401);
  });

  it('handles 403 Forbidden', async () => {
    mockFetch(() => ({ ok: false, status: 403 }));
    const res = await aemRequest(config, '/test');
    expect(res.ok).toBe(false);
    expect(res.status).toBe(403);
  });
});
