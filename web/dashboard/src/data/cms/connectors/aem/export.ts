/**
 * AEM content export: builds a NexusTree from the configured AEM project.
 *
 * Captures page structure, JCR metadata (title, path, sling:resourceType),
 * and asset references — up to MAX_NODES nodes and MAX_DEPTH levels.
 *
 * Full rich text content body export is out of scope for this module and
 * belongs in the Content & Asset Migration stage (story 008).
 *
 * Server-only. Never import from client components.
 */

import type { AemConfig } from '../../config';
import type { NexusTree, NexusNode } from '../../types';
import {
  aemQueryBuilderHits,
  aemFetchJson,
  type AemHit,
} from './client';

const MAX_NODES = 10_000;
const MAX_DEPTH = 5;

/**
 * Traverse the AEM content tree for the given project and return a NexusTree.
 *
 * @param config - AEM connection configuration (already decrypted).
 * @param projectId - AEM project key (the /content child, e.g. "stihl").
 */
export async function buildNexusTree(
  config: AemConfig,
  projectId: string,
): Promise<NexusTree> {
  const rootPath = `/content/${projectId}`;
  const nodes: NexusNode[] = [];

  // Paginate QueryBuilder results: collect cq:Page nodes breadth-first.
  let offset = 0;
  const PAGE_SIZE = 200;

  while (nodes.length < MAX_NODES) {
    const params: Record<string, string> = {
      path: rootPath,
      type: 'cq:Page',
      'p.limit': String(PAGE_SIZE),
      'p.offset': String(offset),
      'p.guessTotal': 'true',
    };

    let hits: AemHit[];
    try {
      const result = await aemQueryBuilderHits(config, params, PAGE_SIZE);
      hits = result.hits;
    } catch {
      // Network or permission error — stop pagination gracefully.
      break;
    }

    if (hits.length === 0) break;

    for (const hit of hits) {
      if (nodes.length >= MAX_NODES) break;

      // Enforce depth cap.
      const depth = hit.path.split('/').length - rootPath.split('/').length;
      if (depth > MAX_DEPTH) continue;

      // Fetch jcr:content for metadata (best-effort).
      let resourceType: string | undefined;
      let assetRefs: string[] = [];
      try {
        const jcrContent = await aemFetchJson(config, `${hit.path}/jcr:content`, 1);
        if (jcrContent) {
          resourceType = typeof jcrContent['sling:resourceType'] === 'string'
            ? (jcrContent['sling:resourceType'] as string)
            : undefined;
          assetRefs = collectAssetReferences(jcrContent);
        }
      } catch {
        // Non-fatal — proceed without metadata.
      }

      nodes.push({
        id: hit.path,
        type: 'page',
        name: hit.title ?? hit.name,
        fields: {
          path: hit.path,
          ...(resourceType ? { resourceType } : {}),
          ...(assetRefs.length > 0 ? { assetRefs } : {}),
        },
      });
    }

    offset += hits.length;
    if (hits.length < PAGE_SIZE) break;
  }

  // Build root node.
  let rootTitle = projectId;
  try {
    const rootJson = await aemFetchJson(config, rootPath, 1);
    const t = (rootJson?.['jcr:content'] as Record<string, unknown> | undefined)?.['jcr:title'];
    if (typeof t === 'string') rootTitle = t;
  } catch {
    // Non-fatal.
  }

  const rootNode: NexusNode = {
    id: rootPath,
    type: 'site',
    name: rootTitle,
    fields: { path: rootPath },
    children: nodes,
  };

  return {
    connection: config.authorUrl,
    blueprint: projectId,
    root: rootNode,
  };
}

/** Recursively collect dam:Asset paths referenced in a JCR subtree. */
function collectAssetReferences(
  node: Record<string, unknown>,
  acc: string[] = [],
  depth = 0,
): string[] {
  if (depth > 3) return acc;
  for (const [, value] of Object.entries(node)) {
    if (typeof value === 'string' && value.startsWith('/content/dam/')) {
      acc.push(value);
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectAssetReferences(value as Record<string, unknown>, acc, depth + 1);
    }
  }
  return acc;
}
