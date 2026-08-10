/**
 * @jest-environment node
 *
 * Tests for AEM export — buildNexusTree().
 */

import { buildNexusTree } from './export';
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

/** Build a minimal QueryBuilder JSON response. */
function qbResponse(hits: Array<{ path: string; name?: string; title?: string }>, total: number) {
  return JSON.stringify({
    total,
    results: hits.length,
    hits: hits.map((h) => ({
      'jcr:path': h.path,
      'jcr:content': { 'jcr:title': h.title ?? h.name ?? h.path.split('/').pop() },
    })),
  });
}

describe('buildNexusTree', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns a NexusTree with site root and page children', async () => {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes('querybuilder')) {
        return { ok: true, status: 200, text: async () => qbResponse([
          { path: '/content/testsite/en', title: 'English' },
          { path: '/content/testsite/en/home', title: 'Home' },
        ], 2) } as unknown as Response;
      }
      // jcr:content fetches
      return { ok: true, status: 200, text: async () => '{"jcr:title": "Test Site"}' } as unknown as Response;
    }) as unknown as typeof fetch;

    const tree = await buildNexusTree(config, 'testsite');
    expect(tree.blueprint).toBe('testsite');
    expect(tree.root.type).toBe('site');
    expect(tree.root.children).toBeDefined();
    expect(tree.root.children!.length).toBeGreaterThan(0);
    expect(tree.root.children![0].type).toBe('page');
  });

  it('returns empty children for a project with no pages', async () => {
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes('querybuilder')) {
        return { ok: true, status: 200, text: async () => qbResponse([], 0) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as unknown as Response;
    }) as unknown as typeof fetch;

    const tree = await buildNexusTree(config, 'testsite');
    expect(tree.root.children).toHaveLength(0);
  });

  it('respects depth cap (MAX_DEPTH = 5)', async () => {
    // Create a page at depth 6 (should be filtered out).
    const deepPath = '/content/testsite/a/b/c/d/e/f'; // depth 6 from /content/testsite
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      if (u.includes('querybuilder')) {
        return { ok: true, status: 200, text: async () => qbResponse([
          { path: deepPath, title: 'Deep Page' },
        ], 1) } as unknown as Response;
      }
      return { ok: true, status: 200, text: async () => '{}' } as unknown as Response;
    }) as unknown as typeof fetch;

    const tree = await buildNexusTree(config, 'testsite');
    // Deep page is beyond depth 5 and must not appear.
    const allPaths = collectPaths(tree.root);
    expect(allPaths).not.toContain(deepPath);
  });

  it('gracefully handles QueryBuilder network errors', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;

    // Should not throw — returns a tree with empty children.
    const tree = await buildNexusTree(config, 'testsite');
    expect(tree.root).toBeDefined();
    expect(tree.root.children).toHaveLength(0);
  });
});

function collectPaths(node: { id: string; children?: Array<{ id: string; children?: unknown[] }> }, acc: string[] = []): string[] {
  acc.push(node.id);
  if (node.children) {
    for (const child of node.children) {
      collectPaths(child as { id: string; children?: Array<{ id: string; children?: unknown[] }> }, acc);
    }
  }
  return acc;
}
