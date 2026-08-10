/**
 * @jest-environment node
 */
import { ContentfulProvisionService, topoSort } from './provision';
import type { ContentfulConfig } from '../../config';
import type { ProvisionContentType, ProvisionPlan } from '@/data/meta/provision/types';

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

function ct(
  key: string,
  extra: Partial<ProvisionContentType> = {},
): ProvisionContentType {
  return {
    key,
    name: key,
    role: 'component',
    fields: [{ key: 'title', name: 'Title', kind: 'text' }],
    ...extra,
  };
}

describe('topoSort', () => {
  it('orders referenced types before referencing types', () => {
    const page = ct('page', {
      role: 'layout',
      fields: [
        { key: 'title', name: 'Title', kind: 'text' },
        {
          key: 'hero',
          name: 'Hero',
          kind: 'reference',
          linkContentTypeKeys: ['hero'],
        },
      ],
    });
    const hero = ct('hero');
    const ordered = topoSort([page, hero]).map((t) => t.key);
    expect(ordered.indexOf('hero')).toBeLessThan(ordered.indexOf('page'));
  });

  it('does not loop on cycles', () => {
    const a = ct('a', {
      fields: [{ key: 'b', name: 'B', kind: 'reference', linkContentTypeKeys: ['b'] }],
    });
    const b = ct('b', {
      fields: [{ key: 'a', name: 'A', kind: 'reference', linkContentTypeKeys: ['a'] }],
    });
    const ordered = topoSort([a, b]).map((t) => t.key).sort();
    expect(ordered).toEqual(['a', 'b']);
  });
});

/* ------------------------- run() with mocked HTTP --------------------- */

type Call = { method: string; url: string; body?: unknown; version?: string };

function installFetch(calls: Call[]) {
  let version = 1;
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const i = (init ?? {}) as RequestInit;
    const headers = (i.headers ?? {}) as Record<string, string>;
    calls.push({
      method: i.method ?? 'GET',
      url: String(url),
      body: i.body ? JSON.parse(i.body as string) : undefined,
      version: headers['X-Contentful-Version'],
    });
    const u = String(url);

    // list content types (empty — nothing exists yet)
    if (u.includes('/content_types?') && (i.method ?? 'GET') === 'GET') {
      return jsonRes({ items: [], total: 0 });
    }
    // PUT content type (create) → return with a version header
    if (u.match(/\/content_types\/[^/]+$/) && i.method === 'PUT') {
      const id = u.split('/').pop() as string;
      version += 1;
      return jsonRes(
        { sys: { id, type: 'ContentType', version }, name: id, fields: [] },
        { 'x-contentful-version': String(version) },
      );
    }
    // publish
    if (u.endsWith('/published') && i.method === 'PUT') {
      const id = u.split('/').slice(-2, -1)[0];
      return jsonRes({ sys: { id, type: 'ContentType', version }, name: id, fields: [] });
    }
    return jsonRes({});
  }) as unknown as typeof fetch;
}

function jsonRes(body: unknown, headers: Record<string, string> = {}) {
  const map = new Map(Object.entries(headers));
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => map.get(k.toLowerCase()) ?? null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function plan(contentTypes: ProvisionContentType[], options = {}): ProvisionPlan {
  return { id: 'p1', name: 'Plan', projectId: 'proj', contentTypes, options };
}

describe('ContentfulProvisionService.run', () => {
  afterEach(() => jest.restoreAllMocks());

  it('provisions a single component directly as a content type (no wrapper)', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    const result = await svc.run(plan([ct('cta')]));

    expect(result.ok).toBe(true);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
    expect(result.failed).toBe(0);
    // Must NOT create the wrapper type — only the component itself
    expect(calls.some((c) => c.url.includes('etherealNexusWrapper'))).toBe(false);
    const puts = calls.filter((c) => c.method === 'PUT' && !c.url.endsWith('/published'));
    expect(puts).toHaveLength(1);
    expect(puts[0]?.url).toContain('/content_types/cta');
  });

  it('provisions multiple standalone components directly (no wrapper)', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    const result = await svc.run(plan([ct('hero'), ct('teaser')]));

    expect(result.ok).toBe(true);
    expect(result.created).toBe(2);
    expect(result.skipped).toBe(0);
    expect(calls.some((c) => c.url.includes('etherealNexusWrapper'))).toBe(false);
    const puts = calls.filter((c) => c.method === 'PUT' && !c.url.endsWith('/published'));
    expect(puts).toHaveLength(2);
  });

  it('applies wrapper strategy when components are referenced by a layout', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    const result = await svc.run(
      plan([
        ct('hero'),
        ct('page', { role: 'layout', usesTypeKeys: ['hero'], fields: [{ key: 'title', name: 'Title', kind: 'text' }] }),
      ]),
    );

    expect(result.ok).toBe(true);
    // hero is skipped (wrapped), page + wrapper are created
    expect(result.skipped).toBeGreaterThan(0);
    const wrapperPut = calls.find(
      (c) => c.method === 'PUT' && c.url.endsWith('/content_types/etherealNexusWrapper'),
    );
    expect(wrapperPut).toBeDefined();
  });

  it('fails when no Management token is configured (writes need CMA)', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService({ ...config, managementToken: '' });
    const result = await svc.run(plan([ct('hero')]));

    expect(result.ok).toBe(false);
    expect(result.failed).toBe(1);
    expect(result.operations[0].message).toMatch(/Management token/i);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
  });

  it('honors dryRun (no writes)', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    const result = await svc.run(plan([ct('hero')], { dryRun: true }));

    expect(result.dryRun).toBe(true);
    expect(result.created).toBe(1);
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
  });

  it('does not publish when publish=false', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    const result = await svc.run(plan([ct('hero')], { publish: false }));

    expect(result.created).toBe(1);
    expect(calls.some((c) => c.url.endsWith('/published'))).toBe(false);
  });

  it('adds a components slot for layouts with usesTypeKeys', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    await svc.run(
      plan([
        ct('hero'),
        ct('page', { role: 'layout', usesTypeKeys: ['hero'], fields: [{ key: 'title', name: 'Title', kind: 'text' }] }),
      ]),
    );
    const pagePut = calls.find(
      (c) => c.method === 'PUT' && c.url.endsWith('/content_types/page'),
    );
    const fields = (pagePut?.body as { fields: { id: string; type: string }[] }).fields;
    const slot = fields.find((f) => f.id === 'components');
    expect(slot).toBeDefined();
    expect(slot?.type).toBe('Array');
    const wrapperPut = calls.find(
      (c) => c.method === 'PUT' && c.url.endsWith('/content_types/etherealNexusWrapper'),
    );
    expect(wrapperPut).toBeDefined();
  });

  it('restricts wrapper componentType to mapped component keys when layout is present', async () => {
    const calls: Call[] = [];
    installFetch(calls);
    const svc = new ContentfulProvisionService(config);
    await svc.run(
      plan([
        ct('hero-banner'),
        ct('text-and-image'),
        ct('page', {
          role: 'layout',
          usesTypeKeys: ['hero-banner', 'text-and-image'],
          fields: [{ key: 'title', name: 'Title', kind: 'text' }],
        }),
      ]),
    );

    const wrapperPut = calls.find(
      (c) => c.method === 'PUT' && c.url.endsWith('/content_types/etherealNexusWrapper'),
    );
    const fields = (wrapperPut?.body as { fields: Array<{ id: string; validations?: Array<{ in?: string[] }> }> }).fields;
    const componentType = fields.find((f) => f.id === 'componentType');
    expect(componentType?.validations?.[0]?.in).toEqual([
      'hero-banner',
      'text-and-image',
    ]);
  });
});
