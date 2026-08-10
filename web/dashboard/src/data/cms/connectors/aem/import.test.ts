/**
 * @jest-environment node
 *
 * Tests for AEM import — importNexusTree().
 */

import { importNexusTree } from './import';
import type { AemConfig } from '../../config';
import type { NexusTree } from '../../types';

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

const sampleTree: NexusTree = {
  connection: 'https://aem.example.com',
  blueprint: 'testsite',
  root: {
    id: '/content/testsite',
    type: 'site',
    name: 'Test Site',
    fields: { path: '/content/testsite' },
    children: [
      {
        id: '/content/testsite/en',
        type: 'page',
        name: 'English',
        fields: { path: '/content/testsite/en', resourceType: 'testsite/components/page' },
      },
    ],
  },
};

describe('importNexusTree', () => {
  afterEach(() => jest.restoreAllMocks());

  it('creates nodes via Sling POST and returns counts', async () => {
    let postCount = 0;
    global.fetch = jest.fn(async () => {
      postCount++;
      return { ok: true, status: 201, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await importNexusTree(config, sampleTree);
    // Root node + 1 child = 2 POST requests.
    expect(postCount).toBe(2);
    expect(result.created).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.ok).toBe(true);
  });

  it('skips protected paths', async () => {
    const protectedTree: NexusTree = {
      ...sampleTree,
      root: {
        id: '/libs/test',
        type: 'page',
        name: 'Protected',
        fields: { path: '/libs/test' },
      },
    };
    const postCalls: string[] = [];
    global.fetch = jest.fn(async (url: unknown) => {
      postCalls.push(String(url));
      return { ok: true, status: 201, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await importNexusTree(config, protectedTree);
    // Protected path must never be POSTed to.
    expect(postCalls).toHaveLength(0);
    expect(result.created).toBe(0);
    expect(result.ok).toBe(true);
  });

  it('counts failed nodes when Sling POST returns non-OK', async () => {
    global.fetch = jest.fn(async () => {
      return { ok: false, status: 500, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    const result = await importNexusTree(config, sampleTree);
    expect(result.failed).toBeGreaterThan(0);
    expect(result.ok).toBe(false);
  });
});
