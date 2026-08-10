/**
 * @jest-environment node
 */

import {
  strapiRequest,
  toStrapiError,
  checkReachable,
  listContentTypes,
  listComponents,
  listLocales,
  StrapiError,
  type StrapiRequestResult,
} from './client';
import type { StrapiConfig } from '../../config';

const config: StrapiConfig = {
  name: 'Test Strapi',
  serverUrl: 'https://strapi.example.com',
  apiToken: 'test-api-token',
};

type MockResponse = {
  ok?: boolean;
  status?: number;
  jsonBody?: unknown;
  textBody?: string;
};

function mockFetch(impl: (url: string, init: RequestInit) => MockResponse) {
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const r = impl(String(url), (init ?? {}) as RequestInit);
    const text = r.textBody ?? (r.jsonBody !== undefined ? JSON.stringify(r.jsonBody) : '');
    return {
      ok: r.ok ?? (r.status !== undefined ? r.status < 400 : true),
      status: r.status ?? 200,
      text: async () => text,
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('strapiRequest', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends Bearer token and parses JSON body', async () => {
    let seenAuth: string | undefined;
    let seenUrl = '';
    mockFetch((url, init) => {
      seenUrl = url;
      seenAuth = (init.headers as Record<string, string>).Authorization;
      return { ok: true, status: 200, jsonBody: { data: [] } };
    });
    const res = await strapiRequest(config, '/api/content-type-builder/content-types');
    expect(seenAuth).toBe('Bearer test-api-token');
    expect(seenUrl).toBe('https://strapi.example.com/api/content-type-builder/content-types');
    expect(res.ok).toBe(true);
    expect(res.body).toEqual({ data: [] });
    expect(res.networkError).toBe(false);
  });

  it('trims trailing slash from serverUrl', async () => {
    const configWithSlash: StrapiConfig = { ...config, serverUrl: 'https://strapi.example.com/' };
    let seenUrl = '';
    mockFetch((url) => { seenUrl = url; return { ok: true, status: 200, jsonBody: {} }; });
    await strapiRequest(configWithSlash, '/api/');
    expect(seenUrl).toBe('https://strapi.example.com/api/');
  });

  it('returns networkError=true on network failure', async () => {
    global.fetch = jest.fn(async () => { throw new Error('ECONNREFUSED'); }) as unknown as typeof fetch;
    const res = await strapiRequest(config, '/api/');
    expect(res.networkError).toBe(true);
    expect(res.ok).toBe(false);
    expect(res.errorMessage).toBe('ECONNREFUSED');
  });

  it('returns networkError=true with "Request timed out" on AbortError', async () => {
    global.fetch = jest.fn(async () => {
      const err = new Error('AbortError');
      err.name = 'AbortError';
      throw err;
    }) as unknown as typeof fetch;
    const res = await strapiRequest(config, '/api/', { timeoutMs: 1 });
    expect(res.networkError).toBe(true);
    expect(res.errorMessage).toBe('Request timed out');
  });

  it('sends POST with JSON body and Content-Type header', async () => {
    let seenContentType: string | undefined;
    let seenBody: unknown;
    mockFetch((_, init) => {
      seenContentType = (init.headers as Record<string, string>)['Content-Type'];
      seenBody = JSON.parse(init.body as string);
      return { ok: true, status: 200, jsonBody: { data: {} } };
    });
    await strapiRequest(config, '/api/content-type-builder/content-types', {
      method: 'POST',
      body: { contentType: { kind: 'collectionType' } },
    });
    expect(seenContentType).toBe('application/json');
    expect(seenBody).toEqual({ contentType: { kind: 'collectionType' } });
  });
});

describe('toStrapiError', () => {
  const makeResult = (status: number, body?: unknown): StrapiRequestResult => ({
    ok: false,
    status,
    networkError: false,
    body,
  });

  it('maps 400 to bad_request', () => {
    const err = toStrapiError(makeResult(400, { error: { message: 'Invalid payload' } }), 'ctx');
    expect(err).toBeInstanceOf(StrapiError);
    expect(err.code).toBe('bad_request');
    expect(err.status).toBe(400);
    expect(err.message).toContain('Invalid payload');
  });

  it('maps 401 to unauthorized with guidance', () => {
    const err = toStrapiError(makeResult(401), 'ctx');
    expect(err.code).toBe('unauthorized');
    expect(err.message).toContain('API token');
  });

  it('maps 403 to forbidden with guidance', () => {
    const err = toStrapiError(makeResult(403), 'ctx');
    expect(err.code).toBe('forbidden');
    expect(err.message).toContain('Content-Type Builder');
  });

  it('maps 404 to not_found', () => {
    const err = toStrapiError(makeResult(404), 'ctx');
    expect(err.code).toBe('not_found');
    expect(err.status).toBe(404);
  });

  it('maps 409 to conflict', () => {
    const err = toStrapiError(makeResult(409), 'ctx');
    expect(err.code).toBe('conflict');
    expect(err.message).toContain('already exists');
  });

  it('maps 429 to rate_limited', () => {
    const err = toStrapiError(makeResult(429), 'ctx');
    expect(err.code).toBe('rate_limited');
  });

  it('maps unknown status to http_error', () => {
    const err = toStrapiError(makeResult(500), 'ctx');
    expect(err.code).toBe('http_error');
    expect(err.message).toContain('HTTP 500');
  });

  it('maps network error to network code', () => {
    const err = toStrapiError({ ok: false, status: 0, networkError: true, errorMessage: 'ECONNREFUSED' }, 'ctx');
    expect(err.code).toBe('network');
    expect(err.message).toContain('ECONNREFUSED');
  });

  it('maps timeout to timeout code', () => {
    const err = toStrapiError({ ok: false, status: 0, networkError: true, errorMessage: 'Request timed out' }, 'ctx');
    expect(err.code).toBe('timeout');
    expect(err.message).toContain('timed out');
  });
});

describe('checkReachable', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns true on any HTTP response (even 401)', async () => {
    mockFetch(() => ({ ok: false, status: 401 }));
    expect(await checkReachable(config)).toBe(true);
  });

  it('returns false on network error', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network'); }) as unknown as typeof fetch;
    expect(await checkReachable(config)).toBe(false);
  });
});

describe('listContentTypes', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns only api:: prefixed content types, normalizing schema wrapper', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: {
        data: [
          {
            uid: 'api::article.article', apiID: 'article',
            schema: { kind: 'collectionType', displayName: 'Article', singularName: 'article', pluralName: 'articles', attributes: {} },
          },
          {
            uid: 'plugin::upload.file', apiID: 'file',
            schema: { kind: 'collectionType', displayName: 'File', singularName: 'file', pluralName: 'files', attributes: {} },
          },
          {
            uid: 'admin::user', apiID: 'user',
            schema: { kind: 'collectionType', displayName: 'User', singularName: 'user', pluralName: 'users', attributes: {} },
          },
        ],
      },
    }));
    const cts = await listContentTypes(config);
    expect(cts).toHaveLength(1);
    expect(cts[0].uid).toBe('api::article.article');
    // Schema fields must be normalized to top-level
    expect(cts[0].kind).toBe('collectionType');
    expect(cts[0].info.displayName).toBe('Article');
  });

  it('throws StrapiError on 401', async () => {
    mockFetch(() => ({ ok: false, status: 401 }));
    await expect(listContentTypes(config)).rejects.toBeInstanceOf(StrapiError);
  });
});

describe('listComponents', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns all components, normalizing schema wrapper', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: {
        data: [
          {
            uid: 'shared.seo', category: 'shared', apiID: 'seo',
            schema: { displayName: 'Seo', attributes: {} },
          },
        ],
      },
    }));
    const comps = await listComponents(config);
    expect(comps).toHaveLength(1);
    expect(comps[0].uid).toBe('shared.seo');
    expect(comps[0].info.displayName).toBe('Seo');
  });
});

describe('listLocales', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns empty array when i18n plugin returns 404', async () => {
    mockFetch(() => ({ ok: false, status: 404 }));
    const locales = await listLocales(config);
    expect(locales).toEqual([]);
  });

  it('parses array response (Strapi v5 direct array)', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: [
        { id: 1, code: 'en', name: 'English', isDefault: true },
        { id: 2, code: 'de', name: 'German', isDefault: false },
      ],
    }));
    const locales = await listLocales(config);
    expect(locales).toHaveLength(2);
    expect(locales[0].code).toBe('en');
  });

  it('parses data-wrapped response', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: { data: [{ id: 1, code: 'fr', name: 'French', isDefault: true }] },
    }));
    const locales = await listLocales(config);
    expect(locales).toHaveLength(1);
    expect(locales[0].code).toBe('fr');
  });
});
