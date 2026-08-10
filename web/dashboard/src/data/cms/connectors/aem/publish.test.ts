/**
 * @jest-environment node
 *
 * Tests for AEM publish — replicateNodes().
 */

import { replicateNodes } from './publish';
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

describe('replicateNodes', () => {
  afterEach(() => jest.restoreAllMocks());

  it('does nothing for an empty paths array', async () => {
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    await replicateNodes(config, []);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sends a single POST for ≤50 paths', async () => {
    const bodies: string[] = [];
    global.fetch = jest.fn(async (_url: unknown, init: unknown) => {
      bodies.push((init as RequestInit).body as string);
      return { ok: true, status: 200, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    await replicateNodes(config, ['/content/testsite/en', '/content/testsite/de']);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('cmd=Activate');
    // URLSearchParams encodes slashes as %2F.
    expect(bodies[0]).toContain('%2Fcontent%2Ftestsite%2Fen');
    expect(bodies[0]).toContain('%2Fcontent%2Ftestsite%2Fde');
  });

  it('splits into multiple requests for >50 paths', async () => {
    let requestCount = 0;
    global.fetch = jest.fn(async () => {
      requestCount++;
      return { ok: true, status: 200, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    const paths = Array.from({ length: 105 }, (_, i) => `/content/testsite/page-${i}`);
    await replicateNodes(config, paths);
    // 105 paths / 50 per batch = 3 requests (50 + 50 + 5).
    expect(requestCount).toBe(3);
  });

  it('throws when replication returns an error status', async () => {
    global.fetch = jest.fn(async () => {
      return { ok: false, status: 403, text: async () => '' } as unknown as Response;
    }) as unknown as typeof fetch;

    await expect(replicateNodes(config, ['/content/testsite/en'])).rejects.toThrow(/403/);
  });
});
