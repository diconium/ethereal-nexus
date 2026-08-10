/**
 * @jest-environment node
 */
import { ContentfulDiscoveryService } from './discovery';
import { ids } from './mapper';
import type { ContentfulConfig } from '../../config';

const config: ContentfulConfig = {
  name: 'Test',
  deliveryToken: 'CDA-token',
  managementToken: '',
  deliveryHost: 'https://cdn.contentful.com',
  apiHost: 'https://api.contentful.com',
  usePreview: false,
  spaceId: 'space123',
  environment: 'master',
  timeoutMs: 5000,
};

function jsonRes(body: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe('ContentfulDiscoveryService', () => {
  afterEach(() => jest.restoreAllMocks());

  it('discoverContentTypes emits model nodes + reference edges + asset usage', async () => {
    global.fetch = jest.fn(async () =>
      jsonRes({
        total: 2,
        items: [
          {
            sys: { id: 'hero', type: 'ContentType' },
            name: 'Hero',
            fields: [
              { id: 'title', name: 'Title', type: 'Symbol', required: true },
              { id: 'image', name: 'Image', type: 'Link', linkType: 'Asset' },
            ],
          },
          {
            sys: { id: 'page', type: 'ContentType' },
            name: 'Page',
            fields: [
              {
                id: 'hero',
                name: 'Hero',
                type: 'Link',
                linkType: 'Entry',
                validations: [{ linkContentType: ['hero'] }],
              },
            ],
          },
        ],
      }),
    ) as unknown as typeof fetch;

    const svc = new ContentfulDiscoveryService(config);
    const out = await svc.discoverContentTypes();

    const modelIds = out.nodes.filter((n) => n.kind === 'model').map((n) => n.externalId);
    expect(modelIds).toEqual([ids.contentType('hero'), ids.contentType('page')]);

    // page -> hero reference edge
    expect(out.edges).toContainEqual({
      fromExternalId: ids.contentType('page'),
      toExternalId: ids.contentType('hero'),
      type: 'references',
    });

    // asset usage produces an assetFolder node + uses edge
    expect(out.nodes.some((n) => n.kind === 'assetFolder')).toBe(true);
    expect(out.edges).toContainEqual({
      fromExternalId: ids.contentType('hero'),
      toExternalId: 'assetFolder:root',
      type: 'uses',
    });
    expect(out.totals?.model).toBe(2);
  });

  it('discoverLocales emits language nodes', async () => {
    global.fetch = jest.fn(async () =>
      jsonRes({
        total: 2,
        items: [
          { code: 'en-US', name: 'English (US)', default: true },
          { code: 'de-DE', name: 'German', default: false, fallbackCode: 'en-US' },
        ],
      }),
    ) as unknown as typeof fetch;

    const out = await new ContentfulDiscoveryService(config).discoverLocales();
    expect(out.nodes.map((n) => n.externalId)).toEqual([
      ids.locale('en-US'),
      ids.locale('de-DE'),
    ]);
    expect(out.nodes[0].kind).toBe('language');
  });
});
