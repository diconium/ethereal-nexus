/**
 * @jest-environment node
 */
import {
  contentfulRequest,
  toContentfulError,
  getSpace,
  listContentTypes,
  ContentfulError,
  type ContentfulRequestResult,
} from './client';
import type { ContentfulConfig } from '../../config';

const config: ContentfulConfig = {
  name: 'Test',
  deliveryToken: 'CDA-token',
  managementToken: 'CFPAT-token',
  deliveryHost: 'https://cdn.contentful.com',
  apiHost: 'https://api.contentful.com',
  usePreview: false,
  spaceId: 'space123',
  environment: 'master',
  timeoutMs: 5000,
};

type MockResponse = {
  ok?: boolean;
  status?: number;
  jsonBody?: unknown;
  textBody?: string;
  responseHeaders?: Record<string, string>;
};

function mockFetch(impl: (url: string, init: RequestInit) => MockResponse) {
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const r = impl(String(url), (init ?? {}) as RequestInit);
    const text = r.textBody ?? (r.jsonBody ? JSON.stringify(r.jsonBody) : '');
    const headers = new Map(Object.entries(r.responseHeaders ?? {}));
    return {
      ok: r.ok ?? true,
      status: r.status ?? 200,
      headers: { get: (k: string) => headers.get(k.toLowerCase()) ?? null },
      text: async () => text,
    } as unknown as Response;
  }) as unknown as typeof fetch;
}

describe('contentfulRequest', () => {
  afterEach(() => jest.restoreAllMocks());

  it('sends the delivery Bearer token by default and parses JSON', async () => {
    let seenAuth: string | undefined;
    let seenUrl = '';
    mockFetch((url, init) => {
      seenUrl = url;
      seenAuth = (init.headers as Record<string, string>).Authorization;
      return { ok: true, status: 200, jsonBody: { hello: 'world' } };
    });
    const res = await contentfulRequest(config, `/spaces/${config.spaceId}`);
    expect(seenAuth).toBe('Bearer CDA-token');
    expect(seenUrl).toContain('cdn.contentful.com');
    expect(res.ok).toBe(true);
    expect(res.body).toEqual({ hello: 'world' });
  });

  it('sends the management Bearer token + api host when api="management"', async () => {
    let seenAuth: string | undefined;
    let seenUrl = '';
    mockFetch((url, init) => {
      seenUrl = url;
      seenAuth = (init.headers as Record<string, string>).Authorization;
      return { ok: true, status: 200, jsonBody: {} };
    });
    await contentfulRequest(config, '/x', { api: 'management' });
    expect(seenAuth).toBe('Bearer CFPAT-token');
    expect(seenUrl).toContain('api.contentful.com');
  });

  it('reads the X-Contentful-Version response header', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: {},
      responseHeaders: { 'x-contentful-version': '7' },
    }));
    const res = await contentfulRequest(config, '/x');
    expect(res.version).toBe(7);
  });

  it('captures Retry-After on 429', async () => {
    mockFetch(() => ({
      ok: false,
      status: 429,
      jsonBody: { message: 'slow down' },
      responseHeaders: { 'retry-after': '30' },
    }));
    const res = await contentfulRequest(config, '/x');
    expect(res.status).toBe(429);
    expect(res.retryAfter).toBe(30);
  });

  it('returns networkError (never throws) on fetch failure', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('boom');
    }) as unknown as typeof fetch;
    const res = await contentfulRequest(config, '/x');
    expect(res.networkError).toBe(true);
    expect(res.status).toBe(0);
    expect(res.errorMessage).toBe('boom');
  });

  it('maps AbortError to a timeout message', async () => {
    global.fetch = jest.fn(async () => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      throw err;
    }) as unknown as typeof fetch;
    const res = await contentfulRequest(config, '/x');
    expect(res.errorMessage).toBe('Request timed out');
  });
});

describe('toContentfulError', () => {
  const base: ContentfulRequestResult = { ok: false, status: 0, networkError: false };

  it('maps 401 to unauthorized', () => {
    const e = toContentfulError({ ...base, status: 401 }, 'Ctx');
    expect(e.code).toBe('unauthorized');
    expect(e.message).toMatch(/token is invalid/i);
  });

  it('maps 403 to forbidden', () => {
    expect(toContentfulError({ ...base, status: 403 }, 'Ctx').code).toBe('forbidden');
  });

  it('maps 404 to not_found', () => {
    expect(toContentfulError({ ...base, status: 404 }, 'Ctx').code).toBe('not_found');
  });

  it('maps 429 to rate_limited and includes retry hint', () => {
    const e = toContentfulError({ ...base, status: 429, retryAfter: 12 }, 'Ctx');
    expect(e.code).toBe('rate_limited');
    expect(e.message).toMatch(/retry after 12s/);
  });

  it('maps 422 and includes validation detail hints + requestId', () => {
    const e = toContentfulError(
      {
        ...base,
        status: 422,
        body: {
          message: 'Validation error',
          requestId: 'abc-123',
          details: {
            errors: [
              {
                name: 'unknownField',
                path: ['fields', 0, 'id'],
                details: { message: 'Field id is invalid' },
              },
            ],
          },
        },
      },
      'Create content type "x"',
    );
    expect(e.code).toBe('unprocessable');
    expect(e.message).toMatch(/validation failed/i);
    expect(e.message).toMatch(/fields\.0\.id: Field id is invalid/);
    expect(e.message).toMatch(/requestId: abc-123/);
  });

  it('maps network error to network/timeout', () => {
    expect(
      toContentfulError({ ...base, networkError: true, errorMessage: 'x' }, 'Ctx').code,
    ).toBe('network');
    expect(
      toContentfulError(
        { ...base, networkError: true, errorMessage: 'Request timed out' },
        'Ctx',
      ).code,
    ).toBe('timeout');
  });
});

describe('typed helpers throw ContentfulError on failure', () => {
  afterEach(() => jest.restoreAllMocks());

  it('getSpace throws on 401', async () => {
    mockFetch(() => ({ ok: false, status: 401, jsonBody: { message: 'no' } }));
    await expect(getSpace(config)).rejects.toBeInstanceOf(ContentfulError);
  });

  it('listContentTypes returns items on success', async () => {
    mockFetch(() => ({
      ok: true,
      status: 200,
      jsonBody: { items: [{ sys: { id: 'a', type: 'ContentType' }, name: 'A', fields: [] }], total: 1 },
    }));
    const cts = await listContentTypes(config);
    expect(cts).toHaveLength(1);
    expect(cts[0].sys.id).toBe('a');
  });
});
