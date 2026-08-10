/**
 * @jest-environment node
 *
 * Unit tests for StrapiProvisionService.
 * Network calls (createContentType, updateContentType, etc.) are mocked via jest.mock.
 */

import type { StrapiContentType, StrapiComponent, CreateContentTypePayload } from './client';
import type { StrapiConfig } from '../../config';
import type {
  ProvisionPlan,
  ProvisionContentType,
} from '@/data/meta/provision/types';

// Mock the entire client module before any imports that use it
jest.mock('./client', () => ({
  ...jest.requireActual('./client'),
  listContentTypes: jest.fn(),
  listComponents: jest.fn(),
  createContentType: jest.fn(),
  updateContentType: jest.fn(),
  createComponent: jest.fn(),
  updateComponent: jest.fn(),
}));

// Import after mock is set up
import { StrapiProvisionService, topoSort } from './provision';
import * as client from './client';

const config: StrapiConfig = {
  name: 'Test Strapi',
  serverUrl: 'https://strapi.example.com',
  apiToken: 'test-api-token',
};

const makeField = (key: string, kind: ProvisionContentType['fields'][number]['kind'] = 'text') => ({
  key,
  name: key,
  kind,
});

const makePlan = (contentTypes: ProvisionContentType[]): ProvisionPlan => ({
  id: 'test-plan',
  name: 'Test Plan',
  projectId: 'project-1',
  contentTypes,
});

describe('StrapiProvisionService', () => {
  const listContentTypesMock = client.listContentTypes as jest.MockedFunction<typeof client.listContentTypes>;
  const listComponentsMock = client.listComponents as jest.MockedFunction<typeof client.listComponents>;
  const createContentTypeMock = client.createContentType as jest.MockedFunction<typeof client.createContentType>;
  const updateContentTypeMock = client.updateContentType as jest.MockedFunction<typeof client.updateContentType>;
  const createComponentMock = client.createComponent as jest.MockedFunction<typeof client.createComponent>;
  const updateComponentMock = client.updateComponent as jest.MockedFunction<typeof client.updateComponent>;

  const stubContentType: StrapiContentType = {
    uid: 'api::stub.stub',
    apiID: 'stub',
    kind: 'collectionType',
    info: { displayName: 'Stub', singularName: 'stub', pluralName: 'stubs' },
    attributes: {},
  };
  const stubComponent: StrapiComponent = {
    uid: 'shared.stub',
    category: 'shared',
    apiID: 'stub',
    info: { displayName: 'Stub' },
    attributes: {},
  };

  beforeEach(() => {
    listContentTypesMock.mockResolvedValue([]);
    listComponentsMock.mockResolvedValue([]);
    createContentTypeMock.mockResolvedValue(stubContentType);
    updateContentTypeMock.mockResolvedValue(stubContentType);
    createComponentMock.mockResolvedValue(stubComponent);
    updateComponentMock.mockResolvedValue(stubComponent);
  });

  afterEach(() => jest.clearAllMocks());

  /* ---- dry run ---- */

  it('dry run: returns all operations as created without writing', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
      { key: 'hero', name: 'Hero', role: 'component', fields: [makeField('heading')] },
    ]);
    plan.options = { dryRun: true };

    const result = await service.run(plan);

    expect(result.dryRun).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.created).toBe(2);
    expect(result.operations.every((o) => o.message?.includes('Dry run'))).toBe(true);
    expect(createContentTypeMock).not.toHaveBeenCalled();
    expect(createComponentMock).not.toHaveBeenCalled();
  });

  /* ---- create new types ---- */

  it('creates new content type when not found in existing', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);

    const result = await service.run(plan);

    expect(createContentTypeMock).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
    expect(result.operations[0].status).toBe('created');
    expect(result.operations[0].targetId).toBe('api::article.article');
  });

  it('creates component when not found in existing', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'hero', name: 'Hero', role: 'component', fields: [makeField('heading')] },
    ]);

    const result = await service.run(plan);

    expect(createComponentMock).toHaveBeenCalledTimes(1);
    expect(result.created).toBe(1);
    expect(result.operations[0].targetId).toBe('shared.hero');
  });

  /* ---- onConflict: skip ---- */

  it('onConflict=skip: skips existing content type', async () => {
    listContentTypesMock.mockResolvedValue([
      { uid: 'api::article.article', apiID: 'article', kind: 'collectionType', info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' }, attributes: {} },
    ]);
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);
    plan.options = { onConflict: 'skip' };

    const result = await service.run(plan);

    expect(result.skipped).toBe(1);
    expect(result.created).toBe(0);
    expect(updateContentTypeMock).not.toHaveBeenCalled();
    expect(createContentTypeMock).not.toHaveBeenCalled();
  });

  it('onConflict=skip: skips existing component', async () => {
    listComponentsMock.mockResolvedValue([
      { uid: 'shared.hero', category: 'shared', apiID: 'hero', info: { displayName: 'Hero' }, attributes: {} },
    ]);
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'hero', name: 'Hero', role: 'component', fields: [makeField('heading')] },
    ]);
    plan.options = { onConflict: 'skip' };

    const result = await service.run(plan);

    expect(result.skipped).toBe(1);
    expect(updateComponentMock).not.toHaveBeenCalled();
  });

  /* ---- onConflict: update ---- */

  it('onConflict=update (default): updates existing content type', async () => {
    listContentTypesMock.mockResolvedValue([
      { uid: 'api::article.article', apiID: 'article', kind: 'collectionType', info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' }, attributes: {} },
    ]);
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);

    const result = await service.run(plan);

    expect(updateContentTypeMock).toHaveBeenCalledTimes(1);
    expect(result.updated).toBe(1);
    expect(createContentTypeMock).not.toHaveBeenCalled();
  });

  it('onConflict=update: updates existing component', async () => {
    listComponentsMock.mockResolvedValue([
      { uid: 'shared.hero', category: 'shared', apiID: 'hero', info: { displayName: 'Hero' }, attributes: {} },
    ]);
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'hero', name: 'Hero', role: 'component', fields: [makeField('heading')] },
    ]);

    const result = await service.run(plan);

    expect(updateComponentMock).toHaveBeenCalledTimes(1);
    expect(result.updated).toBe(1);
  });

  /* ---- onConflict: fail ---- */

  it('onConflict=fail: fails on existing content type', async () => {
    listContentTypesMock.mockResolvedValue([
      { uid: 'api::article.article', apiID: 'article', kind: 'collectionType', info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' }, attributes: {} },
    ]);
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);
    plan.options = { onConflict: 'fail' };

    const result = await service.run(plan);

    expect(result.failed).toBe(1);
    expect(result.ok).toBe(false);
    expect(createContentTypeMock).not.toHaveBeenCalled();
  });

  /* ---- component provisioned before content type ---- */

  it('provisions components before content types that reference them', async () => {
    const callOrder: string[] = [];
    createComponentMock.mockImplementation(async () => { callOrder.push('component'); return stubComponent; });
    createContentTypeMock.mockImplementation(async () => { callOrder.push('contentType'); return stubContentType; });

    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      {
        key: 'article',
        name: 'Article',
        role: 'contentType',
        fields: [makeField('title'), makeField('body', 'richText')],
      },
      { key: 'seo', name: 'SEO', role: 'component', fields: [makeField('metaTitle')] },
    ]);

    await service.run(plan);

    expect(callOrder[0]).toBe('component');
    expect(callOrder[1]).toBe('contentType');
  });

  /* ---- i18n ---- */

  it('adds i18n pluginOptions to content type when locales are present', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);
    plan.locales = ['en', 'de'];

    await service.run(plan);

    const call = createContentTypeMock.mock.calls[0][1] as client.CreateContentTypePayload;
    expect(call.contentType.pluginOptions).toEqual({ i18n: { localized: true } });
  });

  it('does not add i18n pluginOptions when no locales', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);

    await service.run(plan);

    const call = createContentTypeMock.mock.calls[0][1] as client.CreateContentTypePayload;
    expect(call.contentType.pluginOptions).toBeUndefined();
  });

  /* ---- layout strategy ---- */

  it('layout role defaults to collectionType', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'homepage', name: 'Homepage', role: 'layout', fields: [makeField('title')] },
    ]);

    await service.run(plan);

    const call = createContentTypeMock.mock.calls[0][1] as client.CreateContentTypePayload;
    expect(call.contentType.kind).toBe('collectionType');
  });

  it('layout role → singleType when layoutStrategy=singleType', async () => {
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'homepage', name: 'Homepage', role: 'layout', fields: [makeField('title')] },
    ]);
    (plan.options as Record<string, unknown>) = { layoutStrategy: 'singleType' };

    await service.run(plan);

    const call = createContentTypeMock.mock.calls[0][1] as client.CreateContentTypePayload;
    expect(call.contentType.kind).toBe('singleType');
  });

  /* ---- error handling ---- */

  it('returns failed operation when createContentType throws StrapiError', async () => {
    createContentTypeMock.mockRejectedValue(
      new client.StrapiError('Conflict', 409, 'conflict'),
    );
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);

    const result = await service.run(plan);

    expect(result.failed).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.operations[0].status).toBe('failed');
    expect(result.operations[0].message).toContain('Conflict');
  });

  it('returns full failure when listing existing types throws', async () => {
    listContentTypesMock.mockRejectedValue(new Error('DB connection failed'));
    const service = new StrapiProvisionService(config);
    const plan = makePlan([
      { key: 'article', name: 'Article', role: 'contentType', fields: [makeField('title')] },
    ]);

    const result = await service.run(plan);

    expect(result.ok).toBe(false);
    expect(result.failed).toBe(plan.contentTypes.length);
  });
});

/* ---- topoSort ---- */

describe('topoSort', () => {
  it('returns types in dependency-safe order', () => {
    const author: ProvisionContentType = {
      key: 'author', name: 'Author', role: 'contentType',
      fields: [makeField('name')],
    };
    const article: ProvisionContentType = {
      key: 'article', name: 'Article', role: 'contentType',
      fields: [{ ...makeField('author', 'reference'), linkContentTypeKeys: ['author'] }],
    };
    // article depends on author — author must come first
    const sorted = topoSort([article, author]);
    expect(sorted[0].key).toBe('author');
    expect(sorted[1].key).toBe('article');
  });

  it('handles types with no dependencies', () => {
    const types: ProvisionContentType[] = [
      { key: 'a', name: 'A', role: 'contentType', fields: [] },
      { key: 'b', name: 'B', role: 'contentType', fields: [] },
    ];
    const sorted = topoSort(types);
    expect(sorted).toHaveLength(2);
  });

  it('handles cycles without hanging (breaks on cycle)', () => {
    const a: ProvisionContentType = {
      key: 'a', name: 'A', role: 'contentType',
      fields: [{ ...makeField('b', 'reference'), linkContentTypeKeys: ['b'] }],
    };
    const b: ProvisionContentType = {
      key: 'b', name: 'B', role: 'contentType',
      fields: [{ ...makeField('a', 'reference'), linkContentTypeKeys: ['a'] }],
    };
    const sorted = topoSort([a, b]);
    expect(sorted).toHaveLength(2);
  });

  it('handles usesTypeKeys dependencies', () => {
    const component: ProvisionContentType = {
      key: 'hero', name: 'Hero', role: 'component', fields: [],
    };
    const page: ProvisionContentType = {
      key: 'page', name: 'Page', role: 'layout',
      fields: [],
      usesTypeKeys: ['hero'],
    };
    const sorted = topoSort([page, component]);
    expect(sorted[0].key).toBe('hero');
    expect(sorted[1].key).toBe('page');
  });
});
